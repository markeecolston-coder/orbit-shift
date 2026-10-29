export type EventName = 'game_ready'|'round_start'|'round_end'|'lane_shift'|'pause'|'resume'|'tutorial_open'|'sound_change'|'practice_rescue'|'reward_granted'|'ad_unavailable';
export class LocalEvents {
  private events:{name:EventName;data:Record<string,unknown>;time:number}[]=[];
  record(name:EventName,data:Record<string,unknown>={}) {this.events.push({name,data,time:Date.now()});if(this.events.length>100)this.events.shift();}
  snapshot(){return this.events.map(event=>({...event,data:{...event.data}}));}
}
// No identifiers or network transport. Add a consent-aware sink only after privacy review.
