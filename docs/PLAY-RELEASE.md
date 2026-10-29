# Google Play release process

The debug APK is for phone testing, not a Play production submission.

1. Check cloud tests/screenshots, then test touch, backgrounding, Back, rotation, audio, storage, offline gameplay and native consent/test ads on actual Android hardware.
2. Confirm the Play account, identity and device verification. The owner handles paid enrollment, agreements and account checks.
3. Confirm permanent package ID (currently com.markeecolston.orbitshift), publisher, support email and developer website before the listing.
4. Create a protected upload key and enroll in Play App Signing. Keep keystore/passwords in GitHub encrypted secrets, never source. Add a protected signing job once these resources exist.
5. The manual unsigned-bundle workflow builds an AAB with JavaScript ad requests disabled. It is UNSIGNED and cannot be uploaded as-is.
6. Prepare original icon, feature graphic, truthful screenshots, descriptions, rating, audience, ads declaration, privacy policy and Data safety including all SDKs.
7. Verify current target API and native 16KB page-size requirements against the actual bundle. Compilation does not prove store acceptance.
8. Upload a signed AAB to internal testing. For personal accounts created after November 13, 2023, current Google guidance requires at least 12 closed testers opted in continuously for 14 days before applying for production access; check the actual account requirements.
9. Resolve pre-launch, accessibility, policy and crash findings. Get explicit approval for production ads and rollout; monitor crashes/ANRs and feedback.

No signing key, paid enrollment, Play submission or production advertising has occurred.

Sources:
- https://support.google.com/googleplay/android-developer/answer/14151465
- https://support.google.com/googleplay/android-developer/answer/10787469
- https://capacitorjs.com/docs/android/deploying-to-google-play
