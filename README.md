# Orbit Shift

An original one-finger orbital arcade game. Tap to move between two rings, avoid triangle shards and collect diamond lights. Three lights raise the multiplier (maximum ×5); a missed light resets the chain. Speed and hazard density increase gradually with hard limits.

**Play:** https://markeecolston-coder.github.io/orbit-shift/
**Cloud builds:** https://github.com/markeecolston-coder/orbit-shift/actions

Check the latest successful Pages deployment before treating the configured play URL as live.

## Phone-only development

Open this repository in GitHub Codespaces using the Code menu. The dev container installs Node dependencies. Run `npm run dev` in its cloud terminal and open forwarded port 5173 on the phone. GitHub Actions runs unit tests, mobile Chromium checks, Vite builds, Pages deployment and Android compilation on Ubuntu. These workflows require no running Windows computer.

Download **orbit-shift-android-test-apk** from a successful workflow run on your phone. Extract and install app-debug.apk. This is debug-signed for testing, not a Play production release. GitHub login may be required. Artifacts expire after 30 days; rerun Actions to rebuild.

## Stack and reusable source

Phaser 3.90, TypeScript, Vite, Capacitor. Original graphics are drawn in Phaser; sound is synthesized with Web Audio. The standalone game has no runtime CDN dependencies.

- src/game/model.ts: deterministic fixed-step simulation and ad frequency policy.
- src/game/renderer.js: Phaser presentation and DOM controls, built by Vite.
- src/platform: strict TypeScript services for settings, scores, local events, native lifecycle and test ads.
- e2e: phone viewport checks, screenshots and failure traces.
- .github/workflows: cloud verification, hosting and Android packaging.

## Controls and persistence

Tap the playfield or press Space. Pause or Escape freezes the round. Returning from background requires Resume. Sound starts off. Best score, sound choice and round count save locally; blocked storage falls back to session memory.

The browser offers one free **Practice rescue** per round, with no fake ad. Android test builds offer a continue only when a rewarded Google test ad is ready. Only the SDK Rewarded event earns a continue; dismissal alone grants nothing.

## Advertising status

Production advertising is hard-disabled. Browser gameplay requests no ads. The Android CI test APK uses only Google demo IDs and checks UMP consent before ad requests. Test ads do not earn revenue. The manual Play-bundle workflow disables JavaScript ad requests.

Interstitials: every fourth completed round, first three minutes ad-free, at least three minutes after any ad, and no more than three per rolling ten minutes. Rewarded continue suppresses an interstitial in that round. Only a preloaded ad is shown, after a neutral break and before results/restart controls. No ads during active play.

Native SDK behavior, consent geography scenarios and physical Android performance need device testing. The packaged native SDK may perform initialization even with JavaScript requests off; audit the final app before making data-collection declarations.

## Validation and maintenance

`npm test` covers collision, collection, pause, rescue, difficulty, storage fallback, ad frequency and 100 seeded three-minute reachable-path simulations. These do not prove fun or retention. `npm run test:browser` checks the real phone viewport UI in cloud Chromium. Actions provides authoritative executed results.

Keep the dependency lock, run cloud checks on updates, review player feedback and recheck current store/ad policies before release. Low maintenance and advertising income are goals, not guarantees.

Reuse platform services for future games, but require a different core decision and failure structure for each. Cosmetic orbital reskins are not distinct portfolio games.

See docs/CONCEPTS.md, docs/MONETIZATION.md and docs/PLAY-RELEASE.md.

## Harder EDM edition

The course now starts at 1.4 rad/s (previously 0.9), reaches 3.2 rad/s, and tightens gate spacing from 1.05 to 0.5 seconds. Warning distance is 1.85 radians. Gates favor alternating lanes while retaining a clear safe ring. Existing best scores remain saved.

Music is an original eight-bar 132 BPM synth-house loop: four-on-the-floor kick, claps, offbeat hats, bass, chord stabs and an arpeggiated lead with delay. It is synthesized locally with Web Audio, prepared on the title screen, rendered once, and looped without network streaming or external samples. Music defaults on after Play and has its own saved toggle. Effects remain independently controlled by Sound. Music stops on loss, pause, backgrounding or ads and resumes from its position; new rounds restart the track.

Cloud browser tests inspect the actual rendered audio buffer for non-silence, bounded peaks and duration, then check playback, pause/resume, mute and persistence. Automated waveform checks do not establish subjective audio quality.
