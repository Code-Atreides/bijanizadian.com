import test from 'node:test';
import assert from 'node:assert/strict';
import { generateArchiveLayout, shuffleItems, paginateItems } from '../agencykit/archive-layout.js';

const overlaps = (a,b) => a.x < b.x+b.width-1e-7 && a.x+a.width > b.x+1e-7 && a.y < b.y+b.height-1e-7 && a.y+a.height > b.y+1e-7;
function assertGeometry(layout, exclusion) {
  assert.equal(layout.capacity, layout.slots.length);
  for (const slot of layout.slots) {
    for (const value of Object.values(slot)) assert.ok(Number.isFinite(value));
    assert.ok(slot.x >= 0 && slot.y >= 0);
    assert.ok(slot.width > 0 && slot.visualHeight > 0);
    assert.ok(slot.x+slot.width <= layout.width+1e-7, 'slot clips horizontally');
    assert.ok(slot.y+slot.height <= layout.height+1e-7, 'slot clips vertically');
    assert.ok(Math.abs(slot.width/slot.visualHeight-16/9)<1e-7);
    assert.equal(slot.captionHeight,layout.captionHeight);
    assert.ok(slot.captionHeight>=36);
    assert.ok(Math.abs(slot.height-slot.visualHeight-slot.captionHeight)<1e-7);
    if(exclusion) assert.equal(overlaps(slot,exclusion),false,'slot enters fixed-search exclusion');
  }
  for(let i=0;i<layout.slots.length;i++) for(let j=i+1;j<layout.slots.length;j++) assert.equal(overlaps(layout.slots[i],layout.slots[j]),false,'tiles overlap');
}

test('home fills an overscanned canvas with dense nonoverlapping masonry, including behind the search',()=>{
  const viewports=[[320,568],[375,667],[390,844],[768,1024],[1024,768],[1280,720],[1440,900],[1600,750],[1920,1080]];
  for(const [vw,vh] of viewports){
    const small=vw<=720;
    const width=vw+(small?52:180),height=vh+(small?72:128);
    const center={x:width/2-Math.min(width/2,250),y:height/2-95,width:Math.min(width,500),height:190};
    const result=generateArchiveLayout({width,height,home:true,seed:47,exclusion:center});
    assertGeometry(result);
    assert.deepEqual(result,generateArchiveLayout({width,height,home:true,seed:47}), 'home must ignore a fixed-search exclusion');
    assert.ok(result.slots.some(slot=>overlaps({...slot,height:slot.visualHeight},center)), 'center is artificially empty');
    assert.ok(result.rows>=4,`too few vertical layers at ${vw}x${vh}`);
    assert.ok(result.capacity>=(small?12:24),`too few home slots at ${vw}x${vh}`);
    if(small)assert.ok(result.capacity<=18);
    const yPositions=result.slots.map(slot=>slot.y);
    assert.ok(Math.max(...yPositions)-Math.min(...yPositions)>height*.6,'field does not span the canvas');
  }
  assert.equal(generateArchiveLayout({width:1460,height:848,home:true}).capacity,35);
  assert.equal(generateArchiveLayout({width:1780,height:878,home:true}).capacity,40);
});

test('home geometry is reproducible per seed, changes with a shuffle seed, and is not locked to three rows',()=>{
  const args={width:1780,height:878,home:true,seed:'our-next-project'};
  const first=generateArchiveLayout(args);
  assert.deepEqual(first,generateArchiveLayout(args));
  const second=generateArchiveLayout({...args,seed:'another-project'});
  assert.equal(first.capacity,second.capacity);
  assert.notDeepEqual(first.slots,second.slots);
  assert.ok(first.rows>=5);
  assert.ok(new Set(first.slots.map(slot=>Math.round(slot.y/12))).size>6,'columns are not independently staggered');
  for(const seed of [0,1,2,77,1234,'field'])assertGeometry(generateArchiveLayout({...args,seed}));
});

test('results are bounded with real caption space across narrow and wide canvases',()=>{
  for(const width of [284,339,500,648,904,1160,1320,1800]) for(const height of [258,358,490,650,850]){
    const result=generateArchiveLayout({width,height,home:false});
    assertGeometry(result);
    assert.ok(result.captionHeight>=70,'results need room for two readable title lines and metadata');
    assert.ok(result.capacity>=2);
    assert.ok(result.capacity<=20);
  }
});

test('compact landscape keeps previews reachable below the fixed search without a center exclusion',()=>{
  for(const [width,height] of [[320,375],[667,375],[812,375],[844,390],[932,430],[1366,400]]){
    const small=width<=720;
    const canvasWidth=width-(small?36:48),canvasHeight=height-(small?210:162)-(small?12:16);
    const result=generateArchiveLayout({width:canvasWidth,height:canvasHeight,home:false});
    assertGeometry(result);
    assert.ok(result.capacity>=2,`compact archive unreachable at ${width}x${height}`);
    const items=Array.from({length:24},(_,id)=>id);
    const reached=[];
    for(let page=0;page<Math.ceil(items.length/result.capacity);page++)reached.push(...paginateItems(items,page,result.capacity).items);
    assert.deepEqual(reached,items);
  }
});

test('tiny or blocked canvases return safely and offscreen exclusions do not remove slots',()=>{
  for(const args of [{width:0,height:100},{width:100,height:0},{width:-1,height:500},{width:NaN,height:500},{width:70,height:70}]) assert.equal(generateArchiveLayout(args).capacity,0);
  const base={width:1000,height:600,home:false};
  assert.deepEqual(generateArchiveLayout({...base,exclusion:{x:1500,y:100,width:200,height:200}}),generateArchiveLayout(base));
  assert.equal(generateArchiveLayout({...base,exclusion:{x:0,y:0,width:1000,height:600}}).capacity,0);
  assertGeometry(generateArchiveLayout({...base,exclusion:{x:-50,y:150,width:200,height:180}}),{x:-50,y:150,width:200,height:180});
});

test('pagination makes every item reachable exactly once for every positive capacity',()=>{
  const items=Array.from({length:73},(_,id)=>({id}));
  for(const capacity of [1,2,4,6,8,12,18,20,28,40,56,100]){
    const first=paginateItems(items,0,capacity),reached=[];
    for(let page=0;page<first.pageCount;page++){
      const slice=paginateItems(items,page,capacity);
      reached.push(...slice.items);
      assert.equal(slice.page,page);
      assert.equal(slice.hasPrevious,page>0);
      assert.equal(slice.hasNext,page<first.pageCount-1);
    }
    assert.deepEqual(reached,items);
  }
});

test('pagination clamps stale pages after resizing/filtering and handles empty/zero capacity',()=>{
  assert.equal(paginateItems([1,2,3],99,2).page,1);
  assert.deepEqual(paginateItems([1,2,3],99,2).items,[3]);
  assert.equal(paginateItems([1,2,3],-5,2).page,0);
  assert.deepEqual(paginateItems([],99,4),{items:[],page:0,pageCount:0,total:0,capacity:4,hasPrevious:false,hasNext:false});
  assert.equal(paginateItems([1,2],0,0).pageCount,0);
  assert.deepEqual(paginateItems([1,2],0,0).items,[]);
});

test('Fisher–Yates never drops, duplicates, or mutates items and accepts deterministic randomness',()=>{
  const original=Array.from({length:24},(_,id)=>({id}));
  const before=[...original];
  let calls=0;
  const shuffled=shuffleItems(original,()=>{calls++;return 0;});
  assert.equal(calls,23);
  assert.deepEqual(original,before);
  assert.notDeepEqual(shuffled,original);
  assert.deepEqual([...shuffled].sort((a,b)=>a.id-b.id),original);
  assert.deepEqual(shuffleItems(original,()=>1),original);
  assert.deepEqual(shuffleItems([]),[]);
  assert.deepEqual(shuffleItems([original[0]]),[original[0]]);
});
