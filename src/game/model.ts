
export const TAU = Math.PI * 2;
export const INNER = 86;
export const OUTER = 140;
export function difficulty(seconds: number) {
  return { speed: Math.min(3.2, 1.4 + seconds * 0.025), gap: Math.max(0.5, 1.05 - seconds * 0.01) };
}
export interface Gate { id:number; angle:number; lane:number; collected:boolean; checked:boolean }
export interface Effect { type:"crash"|"collect"; angle:number; radius:number; reward?:number }
export class OrbitModel {
  random: () => number;
  state: "ready"|"playing"|"paused"|"over";
  theta:number; lane:number; radius:number; seconds:number; score:number; lights:number;
  combo:number; bestCombo:number; rescued:boolean; shield:number; gates:Gate[]; effects:Effect[];
  spawnIn:number; nextId:number; switches:number;
  constructor(random = Math.random) {
    this.random = random;
    this.state = "ready";
    this.theta = -Math.PI / 2;
    this.lane = 1;
    this.radius = OUTER;
    this.seconds = 0;
    this.score = 0;
    this.lights = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.rescued = false;
    this.shield = 0;
    this.gates = [];
    this.effects = [];
    this.spawnIn = 0.4;
    this.nextId = 1;
    this.switches = 0;
  }
  start() { if (this.state === "ready") this.state = "playing"; }
  shift() {
    if (this.state !== "playing") return false;
    this.lane = 1 - this.lane;
    this.switches++;
    return true;
  }
  pause() { if (this.state === "playing") this.state = "paused"; }
  resume() { if (this.state === "paused") this.state = "playing"; }
  rescue() {
    if (this.state !== "over" || this.rescued) return false;
    this.rescued = true;
    this.gates = [];
    this.spawnIn = 1;
    this.shield = 2.5;
    this.combo = 0;
    this.state = "paused";
    return true;
  }
  multiplier() { return Math.min(5, 1 + Math.floor(this.combo / 3)); }
  step(dt: number) {
    if (this.state !== "playing" || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 1 / 60);
    this.seconds += dt;
    const d = difficulty(this.seconds);
    this.theta += d.speed * dt;
    const target = this.lane ? OUTER : INNER;
    this.radius += Math.sign(target - this.radius) * Math.min(Math.abs(target - this.radius), 520 * dt);
    this.score += dt * 10;
    this.shield = Math.max(0, this.shield - dt);
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      const previous = this.gates.at(-1);
      const roll = this.random();
      const lane = previous ? (roll < 0.72 ? 1 - previous.lane : previous.lane) : (roll < 0.5 ? 0 : 1);
      this.gates.push({ id: this.nextId++, angle: this.theta + 1.85, lane, collected: false, checked: false });
      this.spawnIn = d.gap;
    }
    const px = Math.cos(this.theta) * this.radius;
    const py = Math.sin(this.theta) * this.radius;
    for (const g of this.gates) {
      const r = g.lane ? OUTER : INNER;
      const dx = px - Math.cos(g.angle) * r;
      const dy = py - Math.sin(g.angle) * r;
      if (dx * dx + dy * dy < 22 * 22 && this.shield <= 0) {
        this.state = "over";
        this.effects.push({ type: "crash", angle: this.theta, radius: this.radius });
        return;
      }
      const cr = g.lane ? INNER : OUTER;
      const cx = px - Math.cos(g.angle) * cr;
      const cy = py - Math.sin(g.angle) * cr;
      if (!g.collected && cx * cx + cy * cy < 25 * 25) {
        g.collected = true;
        this.combo++;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        const reward = 20 * this.multiplier();
        this.score += reward;
        this.lights++;
        this.effects.push({ type: "collect", angle: g.angle, radius: cr, reward });
      }
      if (!g.checked && this.theta > g.angle + 0.3) {
        g.checked = true;
        if (!g.collected) this.combo = 0;
      }
    }
    this.gates = this.gates.filter(g => this.theta < g.angle + 0.7);
  }
}
export class AdPolicy {
  now:()=>number; started:number; rounds:number; lastAd:number; impressions:number[]; rewardedThisRound:boolean;
  constructor(now = () => Date.now()) {
    this.now = now; this.started = now(); this.rounds = 0;
    this.lastAd = -Infinity; this.impressions = []; this.rewardedThisRound = false;
  }
  newRound() { this.rewardedThisRound = false; }
  rewarded() { this.rewardedThisRound = true; this.lastAd = this.now(); }
  completed() { this.rounds++; }
  eligible() {
    const t = this.now();
    this.impressions = this.impressions.filter(x => t - x < 600000);
    return this.rounds >= 4 && this.rounds % 4 === 0 && !this.rewardedThisRound &&
      t - this.started >= 180000 && t - this.lastAd >= 180000 && this.impressions.length < 3;
  }
  shown() { this.lastAd = this.now(); this.impressions.push(this.lastAd); }
}
