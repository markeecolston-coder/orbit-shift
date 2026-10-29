/** Original 132 BPM, eight-bar electro-house loop. All instruments are synthesized. */
export const BPM = 132;
export const BARS = 8;
export const TRACK_SECONDS = BARS * 4 * 60 / BPM;
const midi = (note:number) => 440 * 2 ** ((note - 69) / 12);
export async function renderEdm(sampleRate=44100):Promise<AudioBuffer> {
  const frames=Math.round(TRACK_SECONDS*sampleRate);
  // Render a warm-up loop, then retain the second: delay tails wrap seamlessly.
  const ctx=new OfflineAudioContext(2,frames*2,sampleRate);
  const master=ctx.createGain();master.gain.value=.62;
  const compressor=ctx.createDynamicsCompressor();
  compressor.threshold.value=-16;compressor.knee.value=16;compressor.ratio.value=5;
  compressor.attack.value=.003;compressor.release.value=.12;
  master.connect(compressor);compressor.connect(ctx.destination);
  const delay=ctx.createDelay(1);delay.delayTime.value=60/BPM*.75;
  const feedback=ctx.createGain();feedback.gain.value=.25;
  const wet=ctx.createGain();wet.gain.value=.16;
  delay.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(master);
  const noise=ctx.createBuffer(1,Math.ceil(sampleRate*.3),sampleRate);
  const samples=noise.getChannelData(0);
  let seed=8301;
  for(let i=0;i<samples.length;i++){seed=(seed*1664525+1013904223)>>>0;samples[i]=seed/4294967296*2-1;}
  function tone(time:number,note:number,duration:number,volume:number,type:OscillatorType,cutoff=1800,echo=false){
    const osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
    osc.type=type;osc.frequency.value=midi(note);filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(160,cutoff*.3),time+duration);
    gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.006);
    gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.connect(filter);filter.connect(gain);gain.connect(master);if(echo)gain.connect(delay);
    osc.start(time);osc.stop(time+duration+.01);
  }
  function kick(time:number){
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.frequency.setValueAtTime(145,time);osc.frequency.exponentialRampToValueAtTime(44,time+.15);
    gain.gain.setValueAtTime(.85,time);gain.gain.exponentialRampToValueAtTime(.0001,time+.28);
    osc.connect(gain);gain.connect(master);osc.start(time);osc.stop(time+.29);
  }
  function hiss(time:number,duration:number,volume:number,cutoff:number){
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    src.buffer=noise;filter.type='highpass';filter.frequency.value=cutoff;
    gain.gain.setValueAtTime(volume,time);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    src.connect(filter);filter.connect(gain);gain.connect(master);src.start(time);src.stop(time+duration);
  }
  const roots=[45,45,41,41,48,48,43,43];
  const arp=[0,7,12,7,3,7,10,7];
  const step=60/BPM/4;
  for(let i=0;i<256;i++){
    const t=i*step,bar=Math.floor(i/16)%8,s=i%16,root=roots[bar],major=bar>=2;
    if(s%4===0)kick(t);
    if(s%8===4){hiss(t,.13,.28,1200);hiss(t+.017,.09,.16,1800);tone(t,root+12,.07,.05,'triangle',900);}
    if(s%2===0)hiss(t,s%4===2?.1:.035,s%4===2?.13:.055,6500);
    if(bar%2===1&&s===15)hiss(t,.045,.07,8000);
    if(s%4===2||s===7||s===15)tone(t,root+(s===15?12:0),step*.9,.25,'sawtooth',550);
    if(s%2===0){let interval=arp[s/2];if(major&&interval===3)interval=4;
      tone(t,root+24+interval,step*1.7,.085,'sawtooth',2400+(bar%2)*1000,true);
      tone(t,root+24+interval+.06,step*1.5,.035,'triangle',3200,true);}
    if(s===0)for(const interval of [0,major?4:3,7])tone(t+.018,root+12+interval,step*2.8,.045,'triangle',1400,true);
  }
  const rendered=await ctx.startRendering();
  const result=ctx.createBuffer(2,frames,sampleRate);
  let peak=0;
  for(let ch=0;ch<2;ch++){const data=rendered.getChannelData(ch).subarray(frames,frames*2);result.copyToChannel(data,ch);for(const value of data)peak=Math.max(peak,Math.abs(value));}
  if(peak>.85)for(let ch=0;ch<2;ch++){const data=result.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]*=.85/peak;}
  return result;
}
export type MusicState='off'|'paused'|'loading'|'playing'|'unavailable';
export class MusicPlayer {
  enabled=true;
  onState:(state:MusicState)=>void=()=>{};
  private context:AudioContext|null=null;
  private buffer:Promise<AudioBuffer>|null=null;
  private source:AudioBufferSourceNode|null=null;
  private gain:GainNode|null=null;
  private offset=0;
  private started=0;
  private generation=0;
  private wanted=false;
  unlock():void {
    try {
      this.context ||= new AudioContext();
      void this.context.resume().catch(()=>this.onState('unavailable'));
      this.buffer ||= renderEdm(this.context.sampleRate);
      // Attach a rejection handler immediately, including when disabled during preparation.
      void this.buffer.catch(()=>{this.buffer=null;this.onState('unavailable');});
    } catch {this.onState('unavailable');}
  }
  async play(reset=false):Promise<void> {
    if(!this.enabled)return;
    this.pause();
    if(reset)this.offset=0;
    this.wanted=true;const generation=++this.generation;
    this.unlock();
    if(!this.context||!this.buffer)return;
    this.onState('loading');
    try {
      const buffer=await this.buffer;
      if(generation!==this.generation||!this.wanted||!this.enabled)return;
      if(this.context.state!=='running'){this.onState('unavailable');return;}
      const source=this.context.createBufferSource(),gain=this.context.createGain();
      source.buffer=buffer;source.loop=true;gain.gain.setValueAtTime(.001,this.context.currentTime);
      gain.gain.linearRampToValueAtTime(.75,this.context.currentTime+.04);
      source.connect(gain);gain.connect(this.context.destination);
      this.offset%=buffer.duration;this.started=this.context.currentTime;
      this.source=source;this.gain=gain;
      source.onended=()=>{source.disconnect();gain.disconnect();};
      source.start(0,this.offset);this.onState('playing');
    } catch {this.onState('unavailable');}
  }
  pause():void {
    this.wanted=false;this.generation++;
    if(this.source&&this.context){
      this.offset+=this.context.currentTime-this.started;
      this.gain?.gain.cancelScheduledValues(this.context.currentTime);
      this.gain?.gain.setTargetAtTime(.0001,this.context.currentTime,.008);
      this.source.stop(this.context.currentTime+.035);this.source=null;this.gain=null;
    }
    this.onState(this.enabled?'paused':'off');
  }
  setEnabled(enabled:boolean,playing:boolean):void {
    this.enabled=enabled;
    if(enabled&&playing)void this.play();else this.pause();
  }
  dispose():void {this.pause();void this.context?.close();this.context=null;this.buffer=null;}
}
