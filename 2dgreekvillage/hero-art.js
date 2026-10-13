// The player character, hand-placed at native resolution (20 × 29 cells,
// drawn 1:1 in the world). Each letter is one pixel; '.' is transparent.
// A campus-purple cap with the fomo eyes, a cream-sleeved varsity jacket,
// navy chinos and white sneakers, with a one-pixel ink outline.
export const HERO_PALETTE={k:'#1b1733',B:'#516AF6',b:'#3446c4',L:'#9fb0fb',e:'#EAEDFF',h:'#4a3022',H:'#6b4630',s:'#f4c7a1',S:'#dda07c',E:'#1b1733',w:'#ffffff',m:'#c0605a',c:'#f4a294',C:'#f4ead2',R:'#d9ccb0',J:'#516AF6',j:'#3446c4',F:'#f4ead2',P:'#2d3557',p:'#1f2542',W:'#f7f7f7',G:'#a6acbd'};
const FRONT_HEAD=[
 '......kkkkkkkk......',
 '....kkBBBBBBBBkk....',
 '...kBBLLLBBBBBBBk...',
 '..kBBLLBBBBBBBBBBk..',
 '..kBBBBBeeBBeeBBBk..',
 '..kBBBBBeeBBeeBBBk..',
 '.kbbbbbbbbbbbbbbbbk.',
 '.kkbbbbbbbbbbbbbbkk.',
 '..khhSSSSSSSSSShhk..',
 '..khsEwssssssEwshk..',
 '.kshsEEssssssEEshsk.',
 '.kssscssmmmsscsssk..',
 '..kSssssssssssssSk..',
 '...kkSssssssssSkk...'];
const FRONT_BODY=[
 '.....kkCssssCkk.....',
 '...kkJJCCwwCCJJkk...',
 '..kCCJJJJwwJJJJCCk..',
 '..kCCJFFJwwJJJJCCk..',
 '..kCCJFJJwwJJJJCCk..',
 '..kCCJJJJwwJJJJCCk..',
 '..kssjjjjwwjjjjssk..',
 '..kkRRRRRRRRRRRRkk..'];
const BACK_HEAD=[
 '......kkkkkkkk......',
 '....kkBBBBBBBBkk....',
 '...kBBLLLBBBBBBBk...',
 '..kBBLLBBBBBBBBBBk..',
 '..kBBBBBBBBBBBBBBk..',
 '..kBBBBBkkkkBBBBBk..',
 '..kbbbbkhhhhkbbbbk..',
 '..khhhhhhhhhhhhhhk..',
 '..khhhhHhhhhHhhhhk..',
 '.kshhhhhhhhhhhhhhsk.',
 '.kshhhhhhhhhhhhhhsk.',
 '..khhhhhhhhhhhhhhk..',
 '..kShhhhhhhhhhhhSk..',
 '...kkSssssssssSkk...'];
const BACK_BODY=[
 '.....kkCCCCCCkk.....',
 '...kkJJJJJJJJJJkk...',
 '..kCCJJJJJJJJJJCCk..',
 '..kCCJJeeJJeeJJCCk..',
 '..kCCJJeeJJeeJJCCk..',
 '..kCCJJJJJJJJJJCCk..',
 '..kssjjjjjjjjjjssk..',
 '..kkRRRRRRRRRRRRkk..'];
const SIDE_HEAD=[
 '.....kkkkkkk........',
 '...kkBBBBBBBkk......',
 '..kBBLLBBBBBBBk.....',
 '..kBBLBBBBBeeBBk....',
 '..kBBBBBBBBeeBBk....',
 '..kbBBBBBBBBBBBk....',
 '..kbbbbbbbbbbbbbbbk.',
 '..khhbbbbbbbbbkkkk..',
 '..khhhhSSSSSSSk.....',
 '..khhhsssssEwssk....',
 '..khhsSssssEEsssk...',
 '..khhsssssssssssk...',
 '...khsssssssmmsk....',
 '....kkSssssssSk.....'];
const SIDE_BODY=[
 '......kSssssk.......',
 '....kkJJJJJCCk......',
 '...kJJJkCCkJJJk.....',
 '...kJJJkCCkJJJk.....',
 '...kJJJkCCkJJJk.....',
 '...kJJjkCCkjJJk.....',
 '...kjjjksskjjjk.....',
 '...kkRRRRRRRRkk.....'];
// Legs, six rows, per walk frame: contact, passing, contact (mirrored), passing.
const FRONT_LEGS=[
 ['....kPPPPppPPPPk....','....kPPPPkkPPPPk....','....kPPPpk.kPPPpk...','...kWWWWk..kWWWWk...','...kWWWGk..kGWWWk...','....kkkk....kkkk....'],
 ['....kPPPPppPPPPk....','....kPPPPkkPPPPk....','...kWWWWk..kPPPpk...','...kWWWGk..kWWWWk...','....kkkk...kGWWWk...','............kkkk....'],
 ['....kPPPPppPPPPk....','....kPPPPkkPPPPk....','....kPPPpk.kPPPpk...','...kWWWWk..kWWWWk...','...kWWWGk..kGWWWk...','....kkkk....kkkk....'],
 ['....kPPPPppPPPPk....','....kPPPPkkPPPPk....','....kPPPpk.kWWWWk...','...kWWWWk..kGWWWk...','...kWWWGk...kkkk....','....kkkk............']];
const SIDE_LEGS=[
 ['.....kPPPPPk........','.....kPPPPPk........','.....kPPpPPk........','....kWWWWWWk........','....kWWWWWWWk.......','.....kkkkkkk........'],
 ['.....kPPPPPk........','....kPPkkPPPk.......','...kppk...kPPk......','..kWWWk...kWWWWk....','..kGWk.....kWWWWk...','...kk.......kkkkk...'],
 ['.....kPPPPPk........','.....kPPPPPk........','.....kPPpPPk........','....kWWWWWWk........','....kWWWWWWWk.......','.....kkkkkkk........'],
 ['.....kPPPPPk........','....kPPPkkPPk.......','....kPPk..kppk......','...kWWWWk..kWWk.....','...kWWWWWk.kGWk.....','....kkkkk...kk......']];
// Falling: arms thrown out, both sneakers tucked.
const AIR_ARMS=['ks................sk','kCC..............CCk','.kCC............CCk.'];
const AIR_LEGS=['....kPPPPppPPPPk....','...kWWWWk..kWWWWk...','...kWWWGk..kGWWWk...','....kkkk....kkkk....','....................','....................'];
export const HERO_W=20,HERO_H=29;
// Returns the rows for a pose: dir 0 up/back, 1 right, 2 down/front, 3 left.
export function heroRows(dir=2,frame=0,air=false){
 const side=dir===1||dir===3,head=dir===0?BACK_HEAD:side?SIDE_HEAD:FRONT_HEAD,body=dir===0?BACK_BODY:side?SIDE_BODY:FRONT_BODY;
 const f=frame%4,legs=air?AIR_LEGS:(side?SIDE_LEGS:FRONT_LEGS)[f],bob=!air&&(f===1||f===3)?1:0;
 const rows=[...(bob?['....................']:[]),...head,...body,...legs];
 if(air&&!side){for(let i=0;i<AIR_ARMS.length;i++){const r=14+i,src=rows[r].split('');AIR_ARMS[i].split('').forEach((ch,x)=>{if(ch!=='.')src[x]=ch;});rows[r]=src.join('');}}
 while(rows.length<HERO_H)rows.push('....................');
 return rows.slice(0,HERO_H).map(r=>dir===3?[...r].reverse().join(''):r);
}
export function paintHero(c,dir,frame,air){heroRows(dir,frame,air).forEach((row,y)=>{for(let x=0;x<row.length;x++){const col=HERO_PALETTE[row[x]];if(col){c.fillStyle=col;c.fillRect(x,y,1,1);}}});}
