import {mkdirSync,writeFileSync} from 'node:fs';
import {BPM,BARS,TRACK_SECONDS} from '../src/platform/music';
const rate=32000,frames=Math.round(TRACK_SECONDS*rate),size=frames*2;
const mix=new Float64Array(size),send=new Float64Array(size);
const beat=60/BPM,step=beat/4,tau=Math.PI*2;
const hz=(n:number)=>440*2**((n-69)/12);
let seed=8301;
function random(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296*2-1;}
function add(time:number,duration:number,sample:(t:number,i:number)=>number,echo=false){
  const start=Math.round(time*rate),length=Math.min(Math.ceil(duration*rate),size-start);
  for(let i=0;i<length;i++){const value=sample(i/rate,i);mix[start+i]+=value;if(echo)send[start+i]+=value;}
}
function tone(time:number,note:number,duration:number,volume:number,bass=false,echo=false){
  const frequency=hz(note);let filtered=0;
  add(time,duration,(t)=>{
    const phase=(t*frequency)%1;
    const triangle=1-4*Math.abs(phase-.5),saw=phase*2-1;
    const cutoff=(bass?600:3000)*Math.exp(-t/duration*1.1);
    const alpha=1-Math.exp(-tau*cutoff/rate);
    filtered+=alpha*((bass?.65:.3)*saw+(bass?.35:.7)*triangle-filtered);
    const envelope=Math.min(1,t/.006)*Math.exp(-t/duration*5);
    const pump=bass?Math.min(1,((time+t)%beat)/.1):1;
    return filtered*volume*envelope*pump;
  },echo);
}
function kick(time:number){
  add(time,.3,t=>Math.sin(tau*(44*t+(145-44)/29*(1-Math.exp(-29*t))))*.9*Math.exp(-t*20));
}
function noise(time:number,duration:number,volume:number,hat=false){
  let last=0,high=0;
  add(time,duration,t=>{const value=random();high=.65*(high+value-last);last=value;return (hat?high:value*.7+high*.3)*volume*Math.exp(-t/duration*7);});
}
const roots=[45,45,41,41,48,48,43,43],arp=[0,7,12,7,3,7,10,7];
for(let i=0;i<BARS*16*2;i++){
  const t=i*step,s=i%16,bar=Math.floor(i/16)%BARS,root=roots[bar],major=bar>=2;
  if(s%4===0)kick(t);
  if(s%8===4){noise(t,.14,.3);noise(t+.018,.09,.13);}
  if(s%2===0)noise(t,s%4===2?.11:.035,s%4===2?.16:.075,true);
  if(bar%2===1&&s===15)noise(t,.04,.08,true);
  if(s%4===2||s===7||s===15)tone(t,root+(s===15?12:0),step*.95,.33,true);
  if(s%2===0){let interval=arp[s/2];if(major&&interval===3)interval=4;
    tone(t,root+24+interval,step*1.8,.16,false,true);
    tone(t,root+24+interval+.07,step*1.5,.055,false,true);}
  if(s===0)for(const interval of [0,major?4:3,7])tone(t+.018,root+12+interval,step*3,.065,false,true);
}
const delay=Math.round(beat*.75*rate);
for(let i=delay;i<size;i++){send[i]+=send[i-delay]*.25;mix[i]+=send[i-delay]*.16;}
const pcm=new Float64Array(frames);let peak=0;
for(let i=0;i<frames;i++){pcm[i]=Math.tanh(mix[frames+i]*1.2);peak=Math.max(peak,Math.abs(pcm[i]));}
const wav=Buffer.alloc(44+frames*2);
wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);
wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);
wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(frames*2,40);
for(let i=0;i<frames;i++)wav.writeInt16LE(Math.round(pcm[i]*.8/Math.max(peak,.001)*32767),44+i*2);
mkdirSync('public',{recursive:true});writeFileSync('public/orbit-edm.wav',wav);
console.log('Generated original '+BPM+' BPM soundtrack: '+TRACK_SECONDS.toFixed(2)+'s, '+wav.length+' bytes');
