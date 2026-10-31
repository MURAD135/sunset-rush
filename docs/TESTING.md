# Testing checklist · قائمة اختبار اللعبة

Use this list **before every release**. Unchecked items are not assumed to pass. / اختبر البنود قبل كل إصدار؛ وجود القائمة لا يعني نجاحها.

## Launch · التشغيل
- [ ] GitHub Pages game link loads properly.
- [ ] Local `python -m http.server 8000` launch works.
- [ ] Browser console shows no unexpected errors.
- [ ] Network/CDN limitations are understood (Three.js, Tajawal).

## Menu and garage · القائمة والمرآب
- [ ] Main menu buttons navigate correctly.
- [ ] All 8 cars are selectable/unlockable as intended.
- [ ] Orbit/zoom responds to touch and mouse.
- [ ] Paint, finish, wing, stripes, rims and underglow work.
- [ ] Track, weather and difficulty selection work.
- [ ] Upgrades and coin spending respond correctly.

## Racing · السباق
- [ ] Start button launches countdown and race.
- [ ] Keyboard acceleration, steering, brakes and nitro work.
- [ ] Touch controls work on mobile browsers.
- [ ] Pause, resume, retry, camera and sound work.
- [ ] Laps, rank, timer, score and rewards update.
- [ ] AI rivals, ghost and weather do not block finishing.

## Progression/settings · التقدم والإعدادات
- [ ] XP, daily missions, achievements and coins behave correctly.
- [ ] Graphics options, FPS and shadows respond.
- [ ] Arabic, English, French and Spanish render correctly.
- [ ] Intended saved settings/progress remain after reload.

## Compatibility · التوافق
- [ ] Desktop Chrome/Edge, mouse and keyboard.
- [ ] Mobile Safari and Chrome, touch and screen safe areas.
- [ ] Portrait and landscape layouts remain usable.
- [ ] Text readability and interactive focus are reasonable.

## Shipping · النشر
- [ ] Copyright name in `LICENSE` has been confirmed and corrected.
- [ ] `CHANGELOG.md` includes verified, real changes.
- [ ] GitHub Actions checks pass.
- [ ] Release and live game link have been verified.
