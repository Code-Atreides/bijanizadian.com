import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveProjects, publishingDomains } from '../agencykit/archive-data.js';
import { createProjectStore, PROJECT_STORAGE_KEY } from '../agencykit/project-store.js';
import { recommendOriginals, projectJourneys, skeletonHandoff, LAUNCH_CHECKS, reviewProgress, projectNextStep } from '../agencykit/project-workflow.js';

const catalog=archiveProjects.flatMap(project=>project.items.map(item=>({...item,projectId:project.id})));
function fixture() {
  const data=new Map();
  const storage={fail:false,writes:0,getItem:key=>data.get(key)??null,setItem(key,value){if(this.fail)throw Error('Storage full');data.set(key,value);this.writes++;}};
  const store=createProjectStore({storage,catalog,archiveProjects,publishingDomains});
  const project=store.createProject({name:'Test campaign',client:'Test client',brief:{goal:'Recruit campus ambassadors',audience:'College students'}});
  return {store,project,storage,data};
}
const allReviewed=Object.fromEntries(LAUNCH_CHECKS.map(check=>[check.id,true]));

test('a recruitment brief finds actual recruiting originals with reasons',()=>{
  const results=recommendOriginals(catalog,{goal:'Recruit campus ambassadors and collect applications',audience:'College students'});
  assert.ok(results.some(match=>match.source.id==='milo-fomo-apply'));
  assert.ok(results.some(match=>match.source.id==='milo-fomo'));
  assert.ok(results.every(match=>catalog.includes(match.source)&&match.source.sourceUrl&&match.reasons.length));
  assert.equal(new Set(results.map(match=>match.source.id)).size,results.length);
  assert.ok(!results.some(match=>match.source.id==='milo-cars'));
});
test('goals produce distinct recommendations; audience alone cannot invent a fit',()=>{
  const gallery=recommendOriginals(catalog,{goal:'Showcase photography in a portfolio'});
  assert.ok(gallery.some(match=>match.source.id==='milo-photos'));
  assert.equal(gallery[0].source.skeletonKey,'gallery');
  assert.deepEqual(recommendOriginals(catalog,{audience:'college students',tone:'friendly'}),[]);
  assert.deepEqual(recommendOriginals(catalog,{goal:'Quantum entanglement simulation',audience:'college students'}),[]);
});
test('explicit type exclusions remove that family and results are stable',()=>{
  const brief={goal:'Recruit campus ambassadors, without forms'};
  const first=recommendOriginals(catalog,brief,12);
  assert.ok(first.length);
  assert.ok(first.every(match=>match.source.skeletonKey!=='application-form'));
  assert.deepEqual(recommendOriginals(catalog,brief,12),first);
});
test('journeys reference complete real originals and prioritize the brief',()=>{
  const before=JSON.stringify(catalog), journeys=projectJourneys(catalog,{goal:'Host a dinner event'});
  assert.equal(journeys[0].id,'dinner');
  assert.equal(journeys[0].relevant,true);
  assert.ok(journeys.every(journey=>journey.steps.length===3&&journey.steps.every(step=>catalog.includes(step.source))));
  assert.equal(projectJourneys(catalog.filter(source=>source.id!=='fomo-dinners')).some(journey=>journey.id==='dinner'),false);
  assert.equal(JSON.stringify(catalog),before);
});
test('every original has an honest handoff contract including its service needs',()=>{
  for(const source of catalog){
    const handoff=skeletonHandoff(source);
    assert.ok(handoff.name&&handoff.includes&&handoff.connect);
    assert.match(handoff.note,/source code.*not copied/);
  }
  assert.match(skeletonHandoff(catalog.find(source=>source.id==='fomo-assistant')).connect,/server-side AI endpoint/);
});
test('creating a journey is one save; repeating preserves draft IDs, edits, and versions',()=>{
  const {store,project,storage}=fixture(), ids=projectJourneys(catalog)[0].steps.map(step=>step.source.id), before=storage.writes;
  const drafts=store.createDrafts(project.id,ids);
  assert.equal(storage.writes,before+1);
  assert.deepEqual(drafts.map(draft=>draft.sourceId),ids);
  store.updateDraft(project.id,drafts[0].id,{copy:{title:'Approved title'}});
  store.saveVersion(project.id,drafts[0].id,'Approved');
  const repeated=store.createDrafts(project.id,[...ids,ids[0]]);
  assert.deepEqual(repeated.map(draft=>draft.id),drafts.map(draft=>draft.id));
  assert.equal(repeated[0].copy.title,'Approved title');
  assert.equal(repeated[0].versions.length,1);
  assert.equal(store.getProject(project.id).drafts.length,3);
});
test('journey validation and failed persistence never create partial drafts',()=>{
  const {store,project,storage}=fixture(), before=store.exportData();
  assert.throws(()=>store.createDrafts(project.id,['fomo-campus','missing']),/existing originals/);
  assert.equal(store.exportData(),before);
  storage.fail=true;
  assert.throws(()=>store.createDrafts(project.id,['fomo-campus','fomo-clan']),/Storage full/);
  assert.equal(store.exportData(),before);
});
test('journeys check the full capacity before adding anything',()=>{
  const {store,project}=fixture();
  for(let i=0;i<99;i++)store.createDraft(project.id,'fomo-campus');
  const before=store.exportData();
  assert.throws(()=>store.createDrafts(project.id,['fomo-clan','fomo-clan-claim']),/100 drafts/);
  assert.equal(store.exportData(),before);
});
test('review confirmations persist through reload, backup import, and replacement',()=>{
  const {store,project,storage}=fixture(), draft=store.createDraft(project.id,'fomo-campus');
  assert.deepEqual(reviewProgress(draft),{done:0,total:6});
  store.updateDraft(project.id,draft.id,{review:allReviewed});
  const reloaded=createProjectStore({storage,catalog,archiveProjects,publishingDomains});
  assert.equal(reviewProgress(reloaded.getDraft(project.id,draft.id)).done,6);
  const other=fixture().store;
  other.importData(store.exportData());
  assert.equal(reviewProgress(other.getDraft(project.id,draft.id)).done,6);
  other.replaceData(store.exportData());
  assert.equal(reviewProgress(other.getDraft(project.id,draft.id)).done,6);
});
test('copy edits reopen content, destination, and responsive reviews but preserve unrelated checks',()=>{
  const {store,project}=fixture(), draft=store.createDraft(project.id,'fomo-campus');
  store.updateDraft(project.id,draft.id,{review:allReviewed});
  const updated=store.updateDraft(project.id,draft.id,{copy:{title:'Different title'}});
  assert.deepEqual(updated.review,{content:false,brand:true,links:false,services:true,mobile:false,privacy:true});
  assert.equal(store.updateDraft(project.id,draft.id,{name:'A clearer draft name'}).review.brand,true);
});
test('brand changes reopen brand and responsive checks across drafts; brief edits do not',()=>{
  const {store,project}=fixture(), drafts=store.createDrafts(project.id,['fomo-campus','fomo-clan']);
  for(const draft of drafts)store.updateDraft(project.id,draft.id,{review:allReviewed});
  store.updateProject(project.id,{brief:{tone:'Warm'}});
  assert.equal(reviewProgress(store.getDraft(project.id,drafts[0].id)).done,6);
  store.updateProject(project.id,{brand:{accent:'#123456'}});
  for(const draft of store.getProject(project.id).drafts){
    assert.equal(draft.review.brand,false);assert.equal(draft.review.mobile,false);assert.equal(draft.review.content,true);
  }
});
test('new destination and version restore reset checks; recorded live status never certifies them',()=>{
  const {store,project}=fixture(), draft=store.createDraft(project.id,'fomo-campus');
  store.updateDraft(project.id,draft.id,{review:allReviewed});
  const version=store.saveVersion(project.id,draft.id,'Reviewed');
  const live=store.updateDraft(project.id,draft.id,{liveUrl:'https://example.com/page',status:'live'});
  assert.equal(reviewProgress(live).done,0);
  assert.equal(reviewProgress(store.restoreVersion(project.id,draft.id,version.id)).done,0);
});
test('v3 upgrade preserves explicitly unassigned projects and adds unconfirmed checks',()=>{
  const {store,storage,data}=fixture();
  const v3={version:3,clients:[],projects:[{id:'fomo',name:'fomo',clientId:null,client:'',drafts:[{id:'legacy-draft',sourceId:'fomo-campus',copy:{title:'Keep this'}}]}]};
  store.replaceData(v3);
  assert.equal(store.getProject('fomo').clientId,null);
  assert.equal(store.getProject('fomo').client,'');
  assert.equal(store.getDraft('fomo','legacy-draft').copy.title,'Keep this');
  assert.equal(reviewProgress(store.getDraft('fomo','legacy-draft')).done,0);
  assert.equal(JSON.parse(data.get(PROJECT_STORAGE_KEY)).version,4);
  assert.equal(createProjectStore({storage,catalog,archiveProjects,publishingDomains}).getProject('fomo').clientId,null);
});
test('only explicit booleans count as review confirmations; unknown fields are ignored',()=>{
  const {store,project}=fixture(), draft=store.createDraft(project.id,'fomo-campus');
  const updated=store.updateDraft(project.id,draft.id,{review:{content:'true',brand:1,links:true,unknown:true}});
  assert.equal(reviewProgress(updated).done,1);
  assert.equal('unknown' in updated.review,false);
});
test('next steps describe real progress without treating a review as deployment',()=>{
  assert.match(projectNextStep({}),/Add the project goal/);
  assert.match(projectNextStep({brief:{goal:'Recruit'},drafts:[]}),/Choose an original/);
  assert.match(projectNextStep({brief:{goal:'Recruit'},drafts:[{review:{}}]}),/needs launch review/);
  assert.match(projectNextStep({brief:{goal:'Recruit'},drafts:[{review:allReviewed}]}),/Confirm the final build and deployment/);
});
