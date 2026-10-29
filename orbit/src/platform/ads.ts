import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus, RewardAdPluginEvents, InterstitialAdPluginEvents } from '@capacitor-community/admob';
export const PRODUCTION_ADS_ENABLED = false as const;
export const TEST_IDS = Object.freeze({rewarded:'ca-app-pub-3940256099942544/5224354917',interstitial:'ca-app-pub-3940256099942544/1033173712'});
/** Only Google's demo units exist in this build. No environment setting can enable production IDs. */
export class TestAds {
  readonly native = Capacitor.getPlatform()==='android';
  readonly enabled = this.native && import.meta.env.VITE_TEST_ADS==='true';
  rewardReady = false;
  interstitialReady = false;
  private initialized = false;
  private preparing = false;
  private busy = false;
  private allowed = false;
  async prepare():Promise<void> {
    if(!this.enabled || this.preparing || this.busy)return;
    this.preparing=true;
    try {
      if(!this.initialized){
        let info=await AdMob.requestConsentInfo();
        if(info.isConsentFormAvailable && info.status===AdmobConsentStatus.REQUIRED)info=await AdMob.showConsentForm();
        if(!info.canRequestAds)return;
        this.allowed=true;
        await AdMob.initialize({initializeForTesting:true});
        this.initialized=true;
      }
      await Promise.allSettled([
        this.rewardReady?Promise.resolve():AdMob.prepareRewardVideoAd({adId:TEST_IDS.rewarded,isTesting:true}).then(()=>{this.rewardReady=true;}),
        this.interstitialReady?Promise.resolve():AdMob.prepareInterstitial({adId:TEST_IDS.interstitial,isTesting:true}).then(()=>{this.interstitialReady=true;})
      ]);
    } catch {this.allowed=false;this.rewardReady=false;this.interstitialReady=false;}
    finally {this.preparing=false;}
  }
  async rewarded():Promise<boolean> {
    if(!this.enabled||!this.allowed||!this.rewardReady||this.busy)return false;
    this.busy=true;this.rewardReady=false;
    let earned=false;
    const handle=await AdMob.addListener(RewardAdPluginEvents.Rewarded,()=>{earned=true;});
    try {
      let finish=()=>{};
      const ended=new Promise<void>(resolve=>{finish=resolve;});
      const closed=await AdMob.addListener(RewardAdPluginEvents.Dismissed,finish);
      const failed=await AdMob.addListener(RewardAdPluginEvents.FailedToShow,finish);
      try {await AdMob.showRewardVideoAd();await ended;}
      finally {await closed.remove();await failed.remove();}
      return earned;
    } catch {return false;}
    finally {await handle.remove();this.busy=false;}
  }
  async interstitial():Promise<boolean> {
    if(!this.enabled||!this.allowed||!this.interstitialReady||this.busy)return false;
    this.busy=true;this.interstitialReady=false;
    let shown=false;
    const impression=await AdMob.addListener(InterstitialAdPluginEvents.Showed,()=>{shown=true;});
    try {
      let finish=()=>{};
      const ended=new Promise<void>(resolve=>{finish=resolve;});
      const closed=await AdMob.addListener(InterstitialAdPluginEvents.Dismissed,finish);
      const failed=await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow,finish);
      try {await AdMob.showInterstitial();await ended;}
      finally {await closed.remove();await failed.remove();}
      return shown;
    } catch {return false;}
    finally {await impression.remove();this.busy=false;}
  }
  async privacy():Promise<void> {
    if(!this.enabled)return;
    this.allowed=false;this.rewardReady=false;this.interstitialReady=false;this.initialized=false;
    try{await AdMob.showPrivacyOptionsForm();}catch{/* UI remains playable if no form is required. */}
  }
}
