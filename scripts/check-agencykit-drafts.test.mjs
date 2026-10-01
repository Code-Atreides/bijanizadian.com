import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveProjects} from '../agencykit/archive-data.js';
import {buildSkeletonDocument,draftTheme} from '../agencykit/skeletons.js';
const originals=archiveProjects.flatMap(p=>p.items);
test('client drafts apply shared brand and copy without modifying originals',()=>{
  const source=originals.find(x=>x.skeletonKey==='campaign-page');
  const before=JSON.stringify(source);
  const custom={project:{name:'North Studio',brand:{accent:'#daef79',bg:'#fafafa',ink:'#202020',font:'editorial'}},draft:{copy:{title:'Make room for your next idea.',description:'A place to begin.',eyebrow:'NORTH / 01',cta:'Come inside'}}};
  const html=buildSkeletonDocument(source,custom);
  for(const expected of ['North Studio','Make room for your next idea.','A place to begin.','NORTH / 01','Come inside','#daef79','Georgia'])assert.ok(html.includes(expected),expected);
  assert.equal(JSON.stringify(source),before);
  assert.ok(!buildSkeletonDocument(source).includes('North Studio'));
  assert.match(html,/connect-src 'none'/);
});
test('every starter accepts a client headline and description',()=>{
  for(const source of originals){
    const html=buildSkeletonDocument(source,{project:{name:'Draft brand'},draft:{copy:{title:'Unique draft headline',description:'Unique draft description'}}});
    assert.ok(html.includes('Unique draft headline'),source.id);
    assert.ok(html.includes('Unique draft description'),source.id);
  }
});
test('draft fields cannot inject executable markup, CSS, scripts, or remote assets',()=>{
  const payload='</style><script>window.evil=1</script><img src=x onerror=evil()>$&';
  const html=buildSkeletonDocument(originals[0],{project:{name:payload,brand:{accent:payload,font:payload,logo:'data:image/svg+xml,<svg onload=evil()>'}},draft:{copy:{title:payload,description:payload,eyebrow:payload,cta:payload}}});
  assert.equal([...html.matchAll(/<script>/g)].length,1);
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('data:image/svg+xml'));
  assert.equal(draftTheme({project:{brand:{accent:payload}}}).accent,'#343430');
});
