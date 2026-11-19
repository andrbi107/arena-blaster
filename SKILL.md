---
name: arena-blaster
description: A top-down wave-survival arena shooter PWA (canvas, vanilla JS) that teaches enemy-wave budgeting, power-up timing, and a touch/keyboard/mouse control scheme.
---

# Arena Blaster

## What this skill gives the model

After reading this skill, the model understands:
- the genre and core loop of Arena Blaster (wave-survival top-down shooter)
- the exact mechanics (player avatar, four enemy types, scoring, pickups, lives, waves, difficulty ramp, win/lose)
- the controls (touch + keyboard + mouse) and which scheme is used on each device
- the PWA structure required (manifest, service worker, icon) and the file layout
- how to deploy it on GitHub Pages with no build step
- the customization hooks (constants in `main.js`) to retune balance, colors, and difficulty

## Game design

Arena Blaster is a top-down, landscape, wave-survival shooter rendered on a single HTML5 `<canvas>` (logical 960x600, scaled responsively by CSS). The player commands a small triangular cyan ship/tank inside a dark tactical arena bounded by the canvas edges. The ship rotates to face a target (mouse cursor, arrow-key heading, or the nearest enemy on touch) and fires yellow bullet streaks. Enemies pour in from the four edges in escalating waves; the player must survive as many waves as possible, banking score and beating their persisted best.

The visual identity is military/sci-fi tactical: a very dark green-grey background (`#0c130d`) with a faint 40px grid (and a stronger 160px major grid), a cyan player triangle with a barrel line and a muzzle dot, and four visually distinct enemy shapes — grey circles (walkers), orange triangles (sprinters), red squares with a small HP bar above (tanks), and a large purple hexagon with a full-width HP bar across the top of the screen (boss). Player bullets are thin yellow streaks; enemy bullets (fired by tanks and the boss) are red dots. Pickups are small rotating icons: a lightning bolt (rapid-fire), three diverging lines (spread-shot), and a ring (shield). Explosions are expanding rings plus a short particle burst. No external images, fonts, or libraries are used — every visual is drawn with canvas primitives.

The objective is survival: clear wave after wave for score, with every 10th wave being a boss-only wave worth a big score bonus. The player starts with 3 lives; each enemy or enemy-bullet hit costs one life and grants 1 second of blinking invulnerability. A shield pickup absorbs one hit instead. At zero lives the game ends, the final score and wave reached are shown, and the best score is persisted to `localStorage` under `arenaBlaster.best`. Difficulty ramps gently: enemy speed and enemy-bullet speed scale up with the wave number, and waves introduce faster and tougher enemies as the count climbs.

The core loop is: Start screen -> brief intermission -> wave spawns from edges -> player moves, aims, fires, dodges, grabs pickups -> wave cleared -> short intermission -> next, harder wave -> repeat, with a boss every 10th wave. The loop is intentionally tight (a few seconds between waves) so the player is always in combat. Score is the only progression metric; there is no permanent upgrade tree — runs are self-contained and replayable.

## Mechanics in detail

- **Player avatar**: cyan triangle, radius 15px, base speed 232 px/s, fire rate one shot per 0.17s, 3 lives, 1s invulnerability after a hit (renders blinking at ~35% alpha).
- **Movement**: WASD moves in 8 directions (normalized diagonal). Arrow Up/Down thrust forward/back along the current facing (bonus keyboard movement). The player is clamped to the arena. On touch, drag sets a move-target and the ship moves toward it at full speed, stopping when close.
- **Aiming priority**: (1) if the mouse has ever moved, the ship faces the cursor; (2) else if Arrow Left/Right are held, the ship turns at 3.4 rad/s; (3) else the ship auto-faces the nearest enemy (so WASD-only and touch players always aim at a threat).
- **Firing**: triggered by mouse left button (hold), Space (hold), or auto-fire when touch mode is active. Respects the current fire cooldown. Spread-shot fires three bullets at -15/0/+15 degrees; rapid-fire halves the cooldown.
- **Enemies**:
  - Walker — grey circle, radius 14, 1 HP, slow curving path, +10, dies on contact (kamikaze).
  - Sprinter — orange triangle, radius 13, 1 HP, fast straight chase, +20, dies on contact.
  - Tank — red square, radius 22, 4 HP, slow approach, stops at ~230px to fire a red dot at the player every ~2.1s, +50, survives contact (just deals a hit).
  - Boss — purple hexagon, radius 46, HP = 28 + wave*5, drifts in an upper band, alternates between an 8-way radial burst and a 3-shot aimed spread every ~1.5s, +500, survives contact. Appears only on waves divisible by 10.
- **Waves**: each wave has an enemy "budget". Wave 1 = ~6 points of walkers (the spec's "5 walkers" is the floor; the first wave is intentionally light). Budget = 4 + wave*2. Walkers cost 1, sprinters 2, tanks 4. Sprinters unlock at wave 2, tanks at wave 4. The roster is shuffled and spawns one at a time with a shrinking gap (0.85s minus 0.03s per wave, floored at 0.32s). Waves divisible by 10 spawn exactly one boss. Clearing a wave (queue empty AND no enemies on screen) starts a ~2.2s intermission, then the next wave.
- **Pickups**: 15% drop chance per kill. Three types, each lasts 8 seconds, at most one active at a time (a new one replaces the old):
  - Rapid-fire — fire rate x2 (cooldown /2).
  - Spread-shot — 3-way bullets.
  - Shield — absorbs one hit (renders a cyan ring around the ship); the shield is consumed on the blocked hit even if its timer hasn't expired.
- **Difficulty ramp**: enemy speed multiplier = min(2.0, 1 + (wave-1)*0.045); enemy bullet speed = 150 + wave*4.5 px/s. Boss HP grows with the wave. Spawn gap shrinks with the wave.
- **Score**: +10 walker, +20 sprinter, +50 tank, +500 boss. Best persisted to `localStorage` key `arenaBlaster.best` (read at boot, written on game over if beaten).
- **Lives & game over**: 3 lives. A hit from an enemy body or an enemy bullet costs 1 life + 1s invuln, unless a shield is active (then the shield absorbs it). 0 lives ends the run; the Game Over screen shows final score, wave reached, and best.
- **Screens**: Start (title, tagline, best, Play button, controls hint), Playing (HUD + canvas), Paused (Resume / Quit to Menu), Game Over (final score / wave / best + Retry / Home). A portrait "rotate your device" overlay is forced via CSS when the viewport is in portrait orientation.

## Controls

- **Mouse**: move to aim (ship rotates to face the cursor); hold the left button to fire. Clicking Play on the start screen also starts the game.
- **Keyboard**: WASD to move (8-directional); Arrow Left/Right to turn the ship; Arrow Up/Down to thrust forward/back along the facing; Space to fire; P or Escape to pause/resume. (If the mouse is never moved, the ship auto-faces the nearest enemy so WASD + Space is fully playable.)
- **Touch**: drag anywhere on the canvas to set a move-target — the ship moves toward your finger. Once you touch the canvas, auto-fire is enabled and the ship aims at the nearest enemy on its own, so you only steer. Tap Play / Retry / Home buttons with a finger. If the device is in portrait, a full-screen "rotate your device" prompt is shown; rotate to landscape to play.

This is the documented scheme: mouse for desktop, a robust drag-to-move + auto-fire-at-nearest scheme for touch, and a full keyboard fallback (arrows turn, Space fires) — pick whichever the device offers.

## File layout

- `index.html` — entry point. Sets up the canvas, HUD overlays (score / wave / lives / pickup indicator / pause button), boss HP bar, Start/Pause/Game Over screens, the portrait rotate hint, links `styles.css` and `main.js`, and registers `sw.js` after load.
- `styles.css` — all styling: responsive landscape stage (aspect-ratio 960/600, clamped to viewport with `100dvh` and safe-area insets), dark tactical palette, HUD layout, screen overlays, buttons, boss bar, pickup countdown bar, and the portrait-only rotate hint via `@media (orientation: portrait)`.
- `main.js` — the whole game: state machine (start/playing/intermission/paused/over), input wiring (keyboard + mouse + touch with coordinate conversion), wave builder, enemy AI per type, player movement/aim/firing, pickups, collisions, particles/explosions, all canvas rendering, HUD updates, screen flow, and the `requestAnimationFrame` loop. Self-contained IIFE, no globals.
- `manifest.json` — PWA manifest. `start_url` and `scope` are `"./"`, `display` is `fullscreen`, `orientation` is `landscape`, theme/background color `#0c130d`, and the icon entry points to `icon.svg` with `purpose: "any maskable"`.
- `sw.js` — service worker. Precaches `./`, `index.html`, `styles.css`, `main.js`, `manifest.json`, `icon.svg` on install, clears old caches on activate, and serves cached responses with a network-fallback-to-cache strategy (offline-first).
- `icon.svg` — the app icon: a cyan triangle ship with a barrel and muzzle dot on a dark tactical grid background, with small enemy silhouettes (orange triangle, red square, purple hexagon) in the corners. 512x512 viewBox, also used as the maskable icon.

## How to run / deploy

1. Open `index.html` directly in a modern browser (Chrome/Edge/Firefox/Safari) — the game runs from the file system, though service workers only register over http(s).
2. For the full PWA experience (install + offline), push the `shooter/` folder to a GitHub repo and enable GitHub Pages. Because every path is relative (`./`, `icon.svg`, `styles.css`, `main.js`, `manifest.json`, `sw.js`) and `start_url`/`scope` are `./`, it works whether the folder is at the repo root or in a subfolder.
3. On a desktop browser, use Chrome's "Install" option in the address bar to add it as an app. On Android, "Add to Home screen" from the browser menu installs it. On iOS Safari, "Add to Home Screen" launches it fullscreen in landscape.

## PWA install

The manifest declares `orientation: landscape`, a maskable SVG icon, and `display: fullscreen`. The service worker precaches the entire shell on first load, so after the first visit the game starts and plays fully offline — no network calls are made at runtime.

## Customization hooks

All tunable constants live at the top of `main.js` inside the IIFE, in the `Constants` block and the `COLORS` object:

- `PLAYER_SPEED`, `PLAYER_RADIUS`, `PLAYER_FIRE_RATE`, `PLAYER_TURN_RATE` — player feel.
- `BULLET_SPEED`, `BULLET_LIFE`, `BULLET_LEN` — player weapon.
- `START_LIVES`, `INVULN_TIME` — survivability.
- `PICKUP_DURATION`, `PICKUP_DROP_CHANCE`, `PICKUP_LIFE` — power-up economy.
- `SCORE_WALKER`, `SCORE_SPRINTER`, `SCORE_TANK`, `SCORE_BOSS` — scoring values.
- `buildWave(n)` — wave budget formula (`4 + n*2`), unlock thresholds (sprinter at wave 2, tank at wave 4), spawn gap (`0.85 - n*0.03`, floored at `0.32`), and the boss-on-every-10th rule.
- `enemySpeedMul()` and `ebulletSpeed()` — difficulty ramp curves.
- `spawnEnemy(type)` — per-enemy radius, HP, speed, fire interval, score.
- `COLORS` — every palette entry (background, grid, player, each enemy, bullets, pickups, HP bars).
- `BEST_KEY` — the localStorage key (`arenaBlaster.best`).
