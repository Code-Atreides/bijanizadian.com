// Small original oscillator phrases; no sampled music or downloaded game audio.
export class StoryAudio{
 constructor(){this.enabled=true;this.context=null;this.lastBeat=-1;this.voices=new Set();try{this.enabled=localStorage.getItem('fomo-village-sound')!=='off';}catch{}}
 unlock(){try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;this.context??=new Audio();this.context.resume().catch(()=>{});}catch{}}
 setEnabled(value){this.enabled=value;try{localStorage.setItem('fomo-village-sound',value?'on':'off');}catch{}if(value)this.unlock();else this.silence();}
 silence(){for(const voice of this.voices)try{voice.stop();}catch{}this.voices.clear();}
 get ready(){return this.enabled&&this.context?.state==='running';}
 tone(hz,duration=.09,delay=0,type='square',volume=.035,to){
  if(!this.ready)return;
  const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain(),at=ctx.currentTime+delay;
  osc.type=type;osc.frequency.setValueAtTime(hz,at);if(to)osc.frequency.exponentialRampToValueAtTime(to,at+duration);
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.008);gain.gain.exponentialRampToValueAtTime(.001,at+duration);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(at);osc.stop(at+duration+.02);this.voices.add(osc);osc.onended=()=>{this.voices.delete(osc);osc.disconnect();gain.disconnect();};
 }
 // Filtered noise for crowds, swishes, impacts and rotor wash.
 noise(duration=.2,delay=0,volume=.05,freq=1200,q=.8,type='bandpass'){
  if(!this.ready)return;
  const ctx=this.context,len=Math.ceil(ctx.sampleRate*duration),buf=this.noiseBuffer&&this.noiseBuffer.length>=len?this.noiseBuffer:(this.noiseBuffer=(()=>{const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*2),ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b;})());
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),at=ctx.currentTime+delay;
  src.buffer=buf;filter.type=type;filter.frequency.value=freq;filter.Q.value=q;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.01);gain.gain.exponentialRampToValueAtTime(.001,at+duration);
  src.connect(filter);filter.connect(gain);gain.connect(ctx.destination);src.start(at);src.stop(at+duration+.02);this.voices.add(src);src.onended=()=>{this.voices.delete(src);src.disconnect();filter.disconnect();gain.disconnect();};
 }
 cue(name){
  if(name==='start'){[330,440,554,660].forEach((n,i)=>this.tone(n,.12,i*.09));}
  else if(name==='jump')this.tone(220,.3,0,'square',.045,880);
  else if(name==='pipe'){[554,440,330,220].forEach((n,i)=>this.tone(n,.11,i*.075,'triangle',.06));}
  else if(name==='fall')this.tone(880,.65,0,'triangle',.03,150);
  else if(name==='land'){this.tone(95,.2,0,'triangle',.08,40);this.tone(130,.13,.04,'square',.035,65);}
  else if(name==='quest'){[392,494,587,784].forEach((n,i)=>this.tone(n,.2,i*.12,'square',.035));}
  else if(name==='talk')this.tone(340,.035,0,'triangle',.025);
  else if(name==='shoot'){this.noise(.12,0,.03,2400,1.2);this.tone(300,.08,0,'triangle',.02,520);}
  else if(name==='swish'){this.noise(.28,0,.06,5200,.6,'highpass');}
  else if(name==='rim'){this.tone(820,.12,0,'square',.03,610);this.tone(1240,.08,.01,'triangle',.02);}
  else if(name==='board'){this.tone(180,.1,0,'square',.04,120);this.noise(.06,0,.03,900);}
  else if(name==='bounce'){this.tone(110,.07,0,'triangle',.05,70);}
  else if(name==='cheer'){this.noise(.9,0,.05,1500,.4);this.noise(.7,.15,.035,2600,.5);}
  else if(name==='whistle'){this.tone(2350,.14,0,'sine',.035,2280);this.tone(2350,.22,.17,'sine',.035,2200);}
  else if(name==='tackle'){this.noise(.18,0,.08,320,.7,'lowpass');this.tone(90,.15,0,'square',.04,50);}
  else if(name==='juke'){this.tone(500,.1,0,'square',.025,900);this.noise(.1,0,.025,3000);}
  else if(name==='block'){this.noise(.08,0,.04,500,.8,'lowpass');}
  else if(name==='td'){[523,659,784,1047,784,1047].forEach((n,i)=>this.tone(n,.16,i*.1,'square',.035));this.noise(1.4,.1,.05,1500,.4);}
  else if(name==='hit'){this.noise(.25,0,.08,400,.6,'lowpass');this.tone(160,.25,0,'square',.04,60);}
  else if(name==='fuel'){[660,880,1320].forEach((n,i)=>this.tone(n,.08,i*.05,'square',.03));}
  else if(name==='crash'){this.noise(.9,0,.1,260,.5,'lowpass');this.tone(140,.8,0,'sawtooth',.03,40);}
  else if(name==='win'){[392,523,659,784,1047].forEach((n,i)=>this.tone(n,.18,i*.11,'square',.035));}
  else if(name==='lose'){[392,330,262,196].forEach((n,i)=>this.tone(n,.2,i*.14,'triangle',.04));}
  else if(name==='honk'){this.tone(330,.12,0,'square',.025);this.tone(415,.12,0,'square',.02);}
 }
 music(time){
  const beat=Math.floor(time/.25);if(beat===this.lastBeat)return;this.lastBeat=beat;
  const phrase=[330,0,494,440,392,0,330,294,262,0,392,330,294,0,247,294,330,392,494,0,440,392,330,0,294,330,392,294,247,0,262,0];
  const n=phrase[beat%phrase.length];if(n)this.tone(n,.15,0,'triangle',.022);if(beat%4===0)this.tone([131,110,98,123][Math.floor(beat/8)%4],.2,0,'triangle',.027);
 }
}
