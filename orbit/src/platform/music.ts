/** Original eight-bar 132 BPM soundtrack, generated during the cloud build. */
export const BPM=132;
export const BARS=8;
export const TRACK_SECONDS=BARS*4*60/BPM;
export async function loadEdm():Promise<AudioBuffer> {
  const response=await fetch(import.meta.env.BASE_URL+'orbit-edm.wav');
  if(!response.ok)throw new Error('Soundtrack unavailable');
  const data=await response.arrayBuffer();
  return new OfflineAudioContext(1,1,32000).decodeAudioData(data);
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
  async prepare():Promise<void> {
    try {this.buffer ||= loadEdm();await this.buffer;}
    catch {this.buffer=null;this.onState('unavailable');}
  }
  unlock():void {
    try {
      this.context ||= new AudioContext();
      void this.context.resume().catch(()=>this.onState('unavailable'));
      void this.prepare();
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
      await this.context.resume();
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
