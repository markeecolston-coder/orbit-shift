import { OrbitModel, AdPolicy, INNER, OUTER, TAU } from './model';

export function mountOrbit(Phaser, services) {
  const root = document.getElementById("orbit-shift");
  const el = id => root.querySelector("#os-" + id);
  const analytics = (name,data={})=>services.events.record(name,data);
  let memorySave = services.store.load();
  function save(){services.store.save(memorySave);if(!services.store.available)el("status").textContent="Storage is restricted here. Best score lasts for this open game.";}
  let model = new OrbitModel();
  const policy = new AdPolicy();
  let sound = memorySave.sound, audio = null, sceneReady = false, accumulator = 0, overHandled = false;
  let particles = [], trail = [], stage = 1, flash = 0;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stars = Array.from({length:48},(_,i)=>({x:(i*137.51)%400,y:(i*91.73)%440,r:i%4===0?1.3:.6}));
  function beep(freq=500, duration=.08, shape="sine", volume=.06) {
    if(!sound)return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      void audio.resume();
      const o=audio.createOscillator(), g=audio.createGain();
      o.type=shape; o.frequency.setValueAtTime(freq,audio.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(60,freq*.65),audio.currentTime+duration);
      g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);
      o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);
    } catch {}
  }
  function soundLabel(){el("sound").textContent=sound?"Sound on":"Sound off";el("sound").setAttribute("aria-pressed",String(sound));}
  soundLabel();el("best").textContent=String(memorySave.best);
  function overlay(kicker,title,description,main,showRescue=false){
    el("kicker").textContent=kicker;el("title").textContent=title;el("description").textContent=description;
    el("main").textContent=main;el("rescue").hidden=!showRescue;el("overlay").hidden=false;
  }
  function sync(){
    el("score").textContent=String(Math.floor(model.score));el("best").textContent=String(memorySave.best);
    el("chain").textContent="×"+model.multiplier();stage=1+Math.floor(model.seconds/20);
    el("level").textContent="SECTOR "+String(stage).padStart(2,"0");
  }
  let starting=false, finalized=false;
  async function start(){
    if(!sceneReady||starting)return;
    starting=true;
    if(services.native){el("main").disabled=true;el("main").textContent="Preparing test build…";await services.ads.prepare();el("main").disabled=false;}
    starting=false;finalized=false;
    model=new OrbitModel();model.start();policy.newRound();accumulator=0;overHandled=false;
    particles=[];trail=[];flash=0;el("overlay").hidden=true;el("info").hidden=true;
    el("pause").disabled=false;el("pause").textContent="Pause";
    el("hint").textContent="Tap the playfield to change orbits";analytics("round_start");beep(660);sync();
  }
  function pause(){
    if(model.state!=="playing")return;model.pause();accumulator=0;
    overlay("TAKE YOUR TIME","Paused.","Your orbit is waiting. Resume when you are ready.","Resume");
    el("pause").disabled=true;analytics("pause");
  }
  function resume(){
    if(model.state!=="paused")return;model.resume();accumulator=0;
    el("overlay").hidden=true;el("pause").disabled=false;analytics("resume");beep(520,.06);
  }
  function burst(angle,radius,color,n){
    for(let i=0;i<(reducedMotion?3:n);i++){const a=i/n*TAU;particles.push({x:200+Math.cos(angle)*radius,y:220+Math.sin(angle)*radius,vx:Math.cos(a)*85,vy:Math.sin(a)*85,life:.6,color});}
  }
  async function roundOver(){
    if(overHandled)return;overHandled=true;
    const points=Math.floor(model.score),oldBest=memorySave.best;
    memorySave.best=Math.max(oldBest,points);save();
    el("pause").disabled=true;
    overlay(points>oldBest?"NEW PERSONAL BEST":"ANOTHER ORBIT AWAITS",String(points)+" points",
      model.lights+" lights collected · best chain "+model.bestCombo+". Take a breath, then try again.","Play again",!model.rescued&&(!services.native||services.ads.rewardReady));
    el("rescue").textContent=services.native?"Watch test ad · continue once":"Practice rescue · once";
    if(services.native && !model.rescued && services.ads.rewardReady)el("main").textContent="Finish round";
    else if(services.native || model.rescued)await finishRound();
    el("hint").textContent="Every run is a new pattern";
    analytics("round_end",{score:points,seconds:Math.floor(model.seconds),lights:model.lights,rescued:model.rescued});
    beep(150,.24,"triangle",.09);flash=.35;
  }
  async function finishRound(){
    if(finalized)return;finalized=true;memorySave.rounds++;save();policy.completed();
    if(policy.eligible()&&services.ads.interstitialReady){
      overlay("ROUND COMPLETE","Nice orbit.","A test ad is ready. Your next round starts when you choose.","Please wait");
      el("main").disabled=true;
      await new Promise(resolve=>setTimeout(resolve,700));
      if(await services.ads.interstitial())policy.shown();
      el("main").disabled=false;
    }

    if(services.native){overlay("ROUND COMPLETE",Math.floor(model.score)+" points",model.lights+" lights collected. Ready for another orbit?","Play again",false);}
  }
  el("main").onclick=async()=>{
    if(model.state==="paused"){resume();return;}
    if(model.state==="over"&&!finalized){
      await finishRound();
      if(services.native)return;
    }
    void start();
  };
  el("pause").onclick=pause;
  el("sound").onclick=()=>{sound=!sound;memorySave.sound=sound;soundLabel();save();beep(700);analytics("sound_change",{enabled:sound});};
  el("help").onclick=()=>{
    if(model.state==="playing")pause();
    el("info-text").textContent="You are the glowing orb. Tap anywhere in the playfield (or press Space) to switch rings. Triangle shards hurt; diamond lights score points. Each 3 collected lights raises your chain multiplier, up to ×5. Missing a light resets the chain. Speed increases gradually. Practice rescue clears nearby hazards once per round; the browser build shows no ads. Android continues require completing a Google test rewarded ad.";
    el("info").hidden=false;analytics("tutorial_open");
  };
  el("privacy").onclick=()=>{
    if(model.state==="playing")pause();
    el("info-text").textContent="Game data: best score, sound choice and round count are saved only in this browser when storage is available. Gameplay events stay in temporary memory and are not transmitted. Production ads are disabled. The browser edition does not request ads; the Android test build includes Google Mobile Ads and UMP consent. The game uses the Phaser library from jsDelivr; this host and CDN process connection data under their own policies. Hosting providers may log requests. Native advertising, UMP consent and a publisher privacy policy are required before monetization.";
    el("info").hidden=false;
  };
  el("info-close").onclick=()=>{el("info").hidden=true;};
  let rescuing=false;
  el("rescue").onclick=async()=>{
    if(rescuing||model.state!=="over"||model.rescued)return;rescuing=true;el("rescue").disabled=true;
    try{
      const earned=services.native?await services.ads.rewarded():true;
      if(earned&&model.rescue()){overHandled=false;policy.rewarded();analytics(services.native?"reward_granted":"practice_rescue");
        overlay("ONE MORE CHANCE","Orbit restored.","The path is clear. You have a short safety shield.","Resume");el("pause").disabled=true;sync();}
      else {analytics("ad_unavailable");el("status").textContent="No reward earned. You can start a fresh round.";}
    }finally{rescuing=false;el("rescue").disabled=false;}
  };
  services.onBackground(pause);
  if(services.ads.enabled){
    const privacy=document.createElement("button");privacy.textContent="Ad privacy choices";
    privacy.onclick=()=>{pause();void services.ads.privacy();};
    root.querySelector("footer").append(privacy);
    root.querySelector("footer span").textContent="Google test ads only · v0.1";
  }
  document.addEventListener("visibilitychange",()=>{if(document.hidden)pause();});
  window.addEventListener("blur",pause);
  function shift(){if(model.shift()){beep(model.lane?610:460,.045,"sine",.035);analytics("lane_shift");}}
  class OrbitScene extends Phaser.Scene {
    constructor(){super("Orbit");}
    create(){
      this.ink=this.add.graphics();this.input.on("pointerdown",shift);
      this.input.keyboard?.on("keydown-SPACE",event=>{event.preventDefault();if(!event.repeat&&model.state==="playing")shift();});
      this.input.keyboard?.on("keydown-ESC",()=>model.state==="playing"?pause():model.state==="paused"?resume():null);
      sceneReady=true;el("main").disabled=false;el("main").textContent="Play";
      analytics("game_ready");
    }
    update(_time, delta){
      const dt=Math.min(delta/1000,.05);
      if(model.state==="playing"){
        accumulator+=dt;
        while(accumulator>=1/120 && model.state==="playing"){model.step(1/120);accumulator-=1/120;}
        for(const e of model.effects.splice(0)){
          burst(e.angle,e.radius,e.type==="collect"?0x74f7d2:0xff7f97,e.type==="collect"?12:24);
          if(e.type==="collect"){beep(700+model.multiplier()*100,.07);el("hint").textContent="+"+e.reward+" · "+model.combo+" light chain";}
        }
        if(model.state==="over")roundOver();
        if(!reducedMotion){trail.push({x:200+Math.cos(model.theta)*model.radius,y:220+Math.sin(model.theta)*model.radius});if(trail.length>18)trail.shift();}
        sync();
      }
      if(model.state!=="paused"){
        particles=particles.filter(p=>(p.life-=dt)>0);
        for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;}
      }
      flash=Math.max(0,flash-dt);
      this.draw(_time);
    }
    draw(time){
      const g=this.ink;g.clear();
      g.fillStyle(0x090e20);g.fillRect(0,0,400,440);
      for(const s of stars){g.fillStyle(0xa5b6db,.25+(reducedMotion?.2:Math.sin(time*.0005+s.x)*.15));g.fillCircle(s.x,s.y,s.r);}
      const theme=[0x74f7d2,0xb7a6ff,0x8bd4ff,0xffd486][(stage-1)%4];
      g.fillStyle(theme,.025);g.fillCircle(200,220,165);
      g.lineStyle(1,0x34466c,.7);g.strokeCircle(200,220,INNER);g.strokeCircle(200,220,OUTER);
      g.lineStyle(2,theme,.12);
      for(let i=0;i<12;i++){const a=i/12*TAU;g.lineBetween(200+Math.cos(a)*154,220+Math.sin(a)*154,200+Math.cos(a)*159,220+Math.sin(a)*159);}
      g.fillStyle(theme,.04);g.fillCircle(200,220,46);
      g.lineStyle(1,theme,.15);g.strokeCircle(200,220,38);
      g.fillStyle(theme,.8);g.fillCircle(200,220,4);
      for(const gate of model.gates){
        const ca=Math.cos(gate.angle),sa=Math.sin(gate.angle);
        const hr=gate.lane?OUTER:INNER,cr=gate.lane?INNER:OUTER;
        const x=200+ca*hr,y=220+sa*hr;
        g.fillStyle(0xff7f97,.1);g.fillCircle(x,y,23);
        g.fillStyle(0xff7f97);g.fillTriangle(x+ca*14,y+sa*14,x-ca*9-sa*10,y-sa*9+ca*10,x-ca*9+sa*10,y-sa*9-ca*10);
        g.fillStyle(0xffe0e6);g.fillCircle(x,y,2);
        if(!gate.collected){
          const cx=200+ca*cr,cy=220+sa*cr;g.fillStyle(theme,.12);g.fillCircle(cx,cy,17);
          g.fillStyle(theme);g.fillPoints([{x:cx,y:cy-9},{x:cx+7,y:cy},{x:cx,y:cy+9},{x:cx-7,y:cy}],true);
          g.fillStyle(0xf4ffff);g.fillCircle(cx,cy,2);
        }
      }
      trail.forEach((p,i)=>{g.fillStyle(theme,i/trail.length*.25);g.fillCircle(p.x,p.y,2+i/trail.length*4);});
      const a=model.theta,r=model.radius,x=200+Math.cos(a)*r,y=220+Math.sin(a)*r;
      if(model.shield>0){g.lineStyle(2,theme,.8);g.strokeCircle(x,y,18);}
      g.fillStyle(theme,.08);g.fillCircle(x,y,23);g.fillStyle(theme,.2);g.fillCircle(x,y,15);
      g.fillStyle(theme);g.fillCircle(x,y,9);g.fillStyle(0xf5ffff);g.fillCircle(x-2,y-2,4);
      for(const p of particles){g.fillStyle(p.color,p.life/.6);g.fillCircle(p.x,p.y,2+p.life*2);}
      if(flash>0&&!reducedMotion){g.fillStyle(0xff7f97,flash*.25);g.fillRect(0,0,400,440);}
    }
  }
  const game=new Phaser.Game({type:Phaser.AUTO,width:400,height:440,parent:el("canvas"),
    backgroundColor:"#090e20",transparent:false,scene:OrbitScene,audio:{noAudio:true},
    render:{antialias:true,roundPixels:false},scale:{mode:Phaser.Scale.NONE},fps:{target:60}});
  root.addEventListener("orbit-dispose",()=>{game.destroy(true);void audio?.close();});
  if(!services.store.available)el("status").textContent="Storage is restricted here. Best score lasts for this open game.";
}
