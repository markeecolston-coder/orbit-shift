export interface SaveData { best:number; sound:boolean; music:boolean; rounds:number }
export class GameStore {
  private memory:SaveData = {best:0,sound:false,music:true,rounds:0};
  available = true;
  constructor(private key = 'orbit-shift-v1') {
    try { const raw = JSON.parse(localStorage.getItem(key) || 'null');
      if(raw && typeof raw==='object') this.memory={best:Number.isFinite(raw.best)?Math.max(0,Math.floor(raw.best)):0,sound:raw.sound===true,music:raw.music!==false,rounds:Number.isFinite(raw.rounds)?Math.max(0,Math.floor(raw.rounds)):0};
    } catch {this.available=false;}
  }
  load():SaveData {return {...this.memory};}
  save(value:SaveData):void {this.memory={...value};try{localStorage.setItem(this.key,JSON.stringify(this.memory));}catch{this.available=false;}}
}
