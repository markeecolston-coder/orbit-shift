# Advertising and privacy readiness

Production ads are disabled in source. No production AdMob IDs, credentials, analytics endpoints or accounts are present. The browser is ad-free. Android CI opts into Google demo ads. Native Google SDKs are packaged even when JavaScript requests are off; audit startup behavior before claiming that an ad-disabled native build collects no data.

Rewarded: clear opt-in after loss, one continue per round. Only the SDK Rewarded event earns it, with return to gameplay after dismissal. Cancellation, load/presentation failures or missing consent grant nothing. Restart never requires watching. A continue clears hazards, grants 2.5 seconds of protection and waits for Resume.

Interstitial: every fourth completed round, first three minutes ad-free, three-minute ad gap, maximum three per rolling ten minutes. No rewarded/interstitial double hit. Ready ads only, after a neutral break and before results/restart controls. No banners or app-open ads.

## Production approval gate

1. Confirm publisher identity, support contact, audience age and countries. Complete age-rating, Families and COPPA decisions before distribution.
2. Connect AdMob, register the app, validate readiness and retain demo IDs for development.
3. Configure UMP messages and required privacy-options entry point. Refresh consent each launch, gate requests on canRequestAds, test relevant countries, refusal, withdrawal, offline startup and no-fill.
4. Publish a publisher-specific privacy policy with SDK collection, sharing, purposes, retention, rights and contact. Complete Play Data safety from the final SDK inventory; local scores do not mean no SDK data.
5. Configure app-ads.txt on the developer website if required for account/app verification. Use actual publisher information, never placeholders.
6. Test native reward, duplicate callbacks, dismissal without reward, failures, lifecycle, sound and frequency on physical Android devices.
7. Obtain explicit production approval; replace demo IDs and remove the hard gate through reviewed source changes.
8. Stage through internal/closed testing. Evaluate retention and complaints before any frequency increase.

Sources:
- https://developers.google.com/admob/android/test-ads
- https://developers.google.com/admob/android/privacy
- https://support.google.com/admob/answer/6201350
- https://support.google.com/googleplay/android-developer/answer/10787469
- https://github.com/capacitor-community/admob

This checklist prepares engineering work; final compliance depends on publisher, audience, geography, SDK behavior and current policies.
