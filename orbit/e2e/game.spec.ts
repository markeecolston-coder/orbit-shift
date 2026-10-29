import {test,expect} from '@playwright/test';
test('phone boot, touch input, pause, resume, sound and layout',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('#os-main')).toHaveText('Play');
  await expect(page.locator('canvas')).toBeVisible();
  await page.screenshot({path:'test-results/mobile-menu.png'});
  await page.locator('#os-main').tap();
  await expect(page.locator('#os-overlay')).toBeHidden();
  await page.locator('#os-stage').tap({position:{x:40,y:320}});
  await page.waitForTimeout(300);
  await page.locator('#os-pause').tap();
  await expect(page.locator('#os-title')).toHaveText('Paused.');
  const score=await page.locator('#os-score').innerText();
  await page.waitForTimeout(500);await expect(page.locator('#os-score')).toHaveText(score);
  await page.screenshot({path:'test-results/mobile-paused.png'});
  await page.locator('#os-main').tap();await expect(page.locator('#os-overlay')).toBeHidden();
  await page.locator('#os-sound').tap();await expect(page.locator('#os-sound')).toHaveText('Sound on');
  await page.reload();await expect(page.locator('#os-sound')).toHaveText('Sound on');
  const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
  expect(fits).toBe(true);expect(errors).toEqual([]);
});
test('loss, persisted high score, practice rescue once, restart',async({page})=>{
  await page.goto('./');await page.locator('#os-main').tap();
  await expect(page.locator('#os-main')).toHaveText('Play again',{timeout:35000});
  const score=Number(await page.locator('#os-score').innerText());expect(score).toBeGreaterThan(0);
  await expect(page.locator('#os-best')).toHaveText(String(score));
  await page.screenshot({path:'test-results/mobile-results.png'});
  await page.locator('#os-rescue').tap();await expect(page.locator('#os-main')).toHaveText('Resume');
  await page.locator('#os-main').tap();await expect(page.locator('#os-overlay')).toBeHidden();
  await expect(page.locator('#os-main')).toHaveText('Play again',{timeout:35000});
  await expect(page.locator('#os-rescue')).toBeHidden();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('orbit-shift-v1')||'{}').rounds)).toBe(1);
  await page.locator('#os-main').tap();await expect(page.locator('#os-overlay')).toBeHidden();
  await page.reload();expect(Number(await page.locator('#os-best').innerText())).toBeGreaterThanOrEqual(score);
});
test('320px layout and tutorial',async({page})=>{
  await page.setViewportSize({width:320,height:640});await page.goto('./');
  await expect(page.locator('#os-main')).toHaveText('Play');
  await page.locator('#os-help').tap();await expect(page.locator('#os-info')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/mobile-320.png'});
});

test('original EDM renders real audio and follows pause, mute and saved preference',async({page})=>{
  await page.addInitScript(()=>{
    const audit={starts:0,stops:0,peak:0,rms:0,duration:0};
    (window as unknown as {musicAudit:typeof audit}).musicAudit=audit;
    const Context=window.AudioContext;
    window.AudioContext=class extends Context {
      createBufferSource():AudioBufferSourceNode {
        const source=super.createBufferSource(),start=source.start.bind(source),stop=source.stop.bind(source);
        source.start=(...args:Parameters<AudioBufferSourceNode['start']>)=>{
          const buffer=source.buffer;
          if(buffer){const data=buffer.getChannelData(0);let sum=0,peak=0;for(let i=0;i<data.length;i++){sum+=data[i]*data[i];peak=Math.max(peak,Math.abs(data[i]));}
            audit.starts++;audit.peak=peak;audit.rms=Math.sqrt(sum/data.length);audit.duration=buffer.duration;}
          start(...args);
        };
        source.stop=(...args:Parameters<AudioBufferSourceNode['stop']>)=>{audit.stops++;stop(...args);};
        return source;
      }
    };
  });
  await page.goto('./');await expect(page.locator('#os-main')).toHaveText('Play');
  await expect(page.locator('#os-music')).toHaveText('Music on');
  await page.locator('#os-main').tap();
  await expect(page.locator('#orbit-shift')).toHaveAttribute('data-music','playing',{timeout:15000});
  const sample=await page.evaluate(()=>(window as unknown as {musicAudit:{starts:number;stops:number;peak:number;rms:number;duration:number}}).musicAudit);
  expect(sample.starts).toBe(1);expect(sample.peak).toBeGreaterThan(.05);expect(sample.peak).toBeLessThanOrEqual(.851);
  expect(sample.rms).toBeGreaterThan(.01);expect(sample.duration).toBeGreaterThan(14);expect(sample.duration).toBeLessThan(15);
  await page.locator('#os-pause').tap();
  await expect(page.locator('#orbit-shift')).toHaveAttribute('data-music','paused');
  await page.locator('#os-main').tap();
  await expect(page.locator('#orbit-shift')).toHaveAttribute('data-music','playing');
  await page.locator('#os-music').tap();
  await expect(page.locator('#orbit-shift')).toHaveAttribute('data-music','off');
  expect(await page.evaluate(()=>(window as unknown as {musicAudit:{stops:number}}).musicAudit.stops)).toBeGreaterThanOrEqual(2);
  await page.reload();await expect(page.locator('#os-main')).toHaveText('Play');
  await expect(page.locator('#os-music')).toHaveText('Music off');
  await page.locator('#os-main').tap();await expect(page.locator('#orbit-shift')).toHaveAttribute('data-music','off');
});
