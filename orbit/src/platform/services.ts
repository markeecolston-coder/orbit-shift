import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { MusicPlayer } from './music';
import { GameStore } from './storage';
import { LocalEvents } from './analytics';
import { TestAds } from './ads';
export function createServices() {
  return {music:new MusicPlayer(),store:new GameStore(),events:new LocalEvents(),ads:new TestAds(),native:Capacitor.isNativePlatform(),
    onBackground(pause:()=>void){if(Capacitor.isNativePlatform()){void App.addListener('appStateChange',({isActive})=>{if(!isActive)pause();});void App.addListener('backButton',pause);}}
  };
}
