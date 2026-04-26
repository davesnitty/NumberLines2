# Magic Tiles-Style Web Game Plan

## Goal
Build a browser game (client-side only) inspired by the feel of rhythm tap games like Magic Tiles 3, designed for both mouse and touch input.

## Product Intent
- Keep gameplay fast, readable, and satisfying.
- Run fully in-browser with no backend required.
- Support desktop and mobile interactions from day one.
- Avoid copying protected art/audio; use original assets and mechanics.

## Scope (v1)
- 4-lane vertical note highway.
- Tap/click notes in time as they cross a hit line.
- Combo + score system.
- Miss/fail logic and restart flow.
- Song selection from a small built-in list.
- Local persistence for best scores (localStorage).

## Non-Goals (v1)
- Multiplayer/online leaderboards.
- Account system.
- User-uploaded songs.
- Complex level editor UI.

## Core Gameplay Spec
- **Lanes:** 4 lanes, fixed width, responsive to screen size.
- **Notes:** Single tap notes; hold notes too.
- **Timing windows:** Perfect / Good / Miss thresholds (ms-based).
- **Scroll speed:** Constant in v1; configurable per chart.
- **Difficulty:** Easy/Normal/Hard chart variants.
- **Fail state:** Trigger after too many misses or health reaches 0.

## Input Spec
- **Mouse:** Click or press inside lane region at hit moment.
- **Touch:** Single-finger taps; lane determined by x-position.
- **Keyboard (optional):** `D F J K` lanes for desktop accessibility/testing.
- **Input handling:** Use pointer events where possible, with touch fallback if needed.

## Tech Approach (Client-Side)
- `index.html` for shell UI and canvas/layer containers.
- `styles.css` for responsive layout and effects.
- `game.js` for loop, note timing, scoring, input, rendering.
- `audio.js` for playback timing and sync helpers (Web Audio API).
- `charts/*.json` for note maps and metadata.

## Milestones
1. **Playable Core**
   - Render lanes and scrolling notes.
   - Hit detection + scoring + combo.
   - Basic UI (start, pause, game over).
2. **Audio + Sync**
   - Playback and chart synchronization.
   - Calibration offset setting.
3. **Polish**
   - Effects/feedback, animations, sound FX.
   - Mobile responsiveness and touch tuning.
4. **Content + QA**
   - 2-3 sample songs/charts.
   - Device/browser pass and performance checks.

## Performance Targets
- 60 FPS on recent phones/tablets.
- Input-to-feedback under 50ms on supported devices.
- Stable sync drift less than +/- 20ms over a full song.

## Open Decisions (Need Your Input)
1. What should we call this game/project?
   MusicLanes
2. Do you want pure Canvas rendering, DOM/CSS, or hybrid?
   Whatever you think is best
3. Should we include keyboard controls in v1?
   yes
4. Fail model: health bar depletion, fixed miss count, or both?
   no miss limit at this time
5. Music source: royalty-free bundled tracks only, or your own assets?
   royalty-free bundled tracks
6. Visual style preference: minimalist neon, piano tiles, or other?
   neon piano tiles
7. Minimum browser/device targets (e.g., iOS Safari version, Android Chrome)?
   up to you
8. Should charts be handcrafted JSON now, or generated from beat markers?
   generated from beat markers

## Draft File Structure
```text
magic-tiles-web/
  PROJECT_PLAN.md
  index.html
  styles.css
  game.js
  audio.js
  assets/
    audio/
    sfx/
    img/
  charts/
    song1-easy.json
    song1-normal.json
```

## Immediate Next Step
After you answer the open questions, we will turn this plan into the first playable prototype scaffold.
