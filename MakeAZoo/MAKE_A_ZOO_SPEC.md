# Make a Zoo - Browser Game Spec

## 1) Project Summary
Build a fully client-side browser game called **Make a Zoo** using only:
- `HTML`
- `CSS`
- `JavaScript` (vanilla, no framework)

The player builds a zoo by selecting animals from a left sidebar of thumbnails. Selected animals appear in the zoo area, walk around autonomously, and perform species-specific behaviors.

No build step, no backend, no npm dependencies.

---

## 2) Available Assets
Assume animal image files exist in `animals/`:
- `animals/elephant.png`
- `animals/giraffe.png`
- `animals/lion.png`
- `animals/monkey.png`
- `animals/panda.png`
- `animals/tiger.png`
- `animals/zebra.png`

If additional files are later added to the folder, the app should be easy to extend by adding one metadata entry per animal.

---

## 3) Core Gameplay
1. User sees:
- Sidebar with animal thumbnails and names.
- Main zoo field (the "habitat") where animals live.
- Top HUD with counters and controls.
2. User clicks an animal in the sidebar.
3. A new instance of that animal spawns in the zoo field.
4. Each animal moves continuously with simple AI.
5. Animals occasionally perform behaviors (idle, wander, eat, look around, social interaction).
6. User can add many animals and clear/reset the zoo.

---

## 4) MVP Feature Requirements

### 4.1 Layout and UI
- Responsive 2-panel layout:
- Left: sidebar (fixed width on desktop, collapsible or top-row on small screens).
- Right: zoo canvas/arena (fills remaining space).
- HUD includes:
- Total animals count.
- Count by species (or hover tooltip).
- Buttons: `Pause/Resume`, `Reset Zoo`.

### 4.2 Animal Sidebar
- Show one card per animal species:
- Thumbnail image.
- Name label.
- Optional short trait text (e.g., "fast", "social").
- Click on card to add one animal instance to zoo.
- Optional: shift-click or "+" button to add multiple quickly.

### 4.3 Animal Spawning
- Spawn at random valid position inside zoo bounds.
- Avoid exact overlap with existing animals (simple retry method).
- Default cap: 50 total animals (configurable constant).
- Show lightweight warning if cap is reached.

### 4.4 Movement and Physics (Simple)
- 2D top-down movement (DOM elements absolutely positioned).
- Each animal has:
- Position `(x, y)`
- Velocity `(vx, vy)`
- Facing direction (left/right)
- Speed range based on species
- Animals:
- Wander with random steering changes over time.
- Bounce/turn at zoo boundaries.
- Avoid stacking by simple separation force when close to neighbors.
- Animation target: 60 FPS with `requestAnimationFrame` (acceptable if lower on weak machines).

### 4.5 Behavior System
Implement a light state machine for each animal. Required states:
- `wander`
- `idle`
- `eat`
- `social`

Behavior rules:
- Most of the time animals `wander`.
- At random intervals they switch to other states for short durations.
- `eat`: stop or move slowly while playing nibble/bob animation.
- `social`: if nearby same-species animal exists, drift toward it briefly.
- Species can bias probabilities (e.g., monkey more social, tiger less social).

### 4.6 Visual Feedback
- Subtle sprite bobbing while moving.
- Flip sprite horizontally based on movement direction.
- On click of an animal in zoo:
- Show temporary name tag or small info bubble (species + current behavior).

### 4.7 Controls
- `Pause/Resume`: halts and restarts simulation loop.
- `Reset Zoo`: removes all spawned animals.
- Optional sliders:
- Global speed multiplier.
- Behavior frequency multiplier.

### 4.8 Persistence (MVP+)
- Save current zoo to `localStorage`:
- Species and position per animal.
- Restore on reload if data exists.
- Provide `Reset` option that also clears saved state.

---

## 5) Non-Functional Requirements
- No external frameworks.
- No build tooling.
- Works by opening `index.html` with a local static server.
- Reasonable support for modern browsers (Chrome, Firefox, Safari, Edge).
- Use performant update loop (avoid layout thrash where possible).
- Keep code modular and readable.

---

## 6) Suggested File Structure
```text
MakeAZoo/
  index.html
  styles.css
  app.js
  animals/
    elephant.png
    giraffe.png
    lion.png
    monkey.png
    panda.png
    tiger.png
    zebra.png
  README.md
```

---

## 7) Technical Architecture

### 7.1 Data Model
Use a config object for species metadata:
- `id`
- `name`
- `image`
- `baseSpeed`
- `size`
- `behaviorWeights`
- `color` (optional for labels/UI)

Use runtime instances:
- `instanceId`
- `speciesId`
- `x`, `y`, `vx`, `vy`
- `state`
- `stateTimeRemaining`
- `targetId` (optional for social state)
- `domEl`

### 7.2 Main Modules (in one JS file or split logically)
- `speciesCatalog`: static metadata for all species.
- `ui`: sidebar render, HUD updates, controls.
- `zoo`: spawn/remove/find-neighbors/bounds logic.
- `ai`: state transitions and behavior decisions.
- `engine`: game loop (`update(dt)` + `render()`).
- `storage`: save/load/reset localStorage state.

### 7.3 Game Loop
Use `requestAnimationFrame`:
1. Compute `dt` (seconds).
2. If paused, skip simulation but continue rendering if needed.
3. For each animal:
- Update state timer and transition when needed.
- Compute steering (wander/social/avoidance/bounds).
- Integrate position.
4. Apply transforms to DOM nodes (`translate(...) scaleX(...)`).
5. Update HUD on throttled cadence (e.g., 4 times/sec).

---

## 8) UI/UX Details
- Style direction: friendly, playful zoo theme.
- Background: grass-like gradient/pattern in zoo field.
- Sidebar cards: clear hover/focus states.
- Keyboard accessibility:
- Sidebar cards and buttons must be focusable.
- `Enter/Space` should activate selected animal card.
- Touch support:
- Tap card to spawn.
- Buttons sized appropriately for mobile.

---

## 9) Behavior Design (Initial Values)
Per-species defaults (example):
- Elephant: slow, mostly idle/wander.
- Giraffe: medium speed, frequent look-around idle.
- Lion: medium-fast, lower social probability.
- Monkey: fast, high social probability.
- Panda: slow, high eat/idle probability.
- Tiger: fast bursts, low social probability.
- Zebra: medium-fast, high wander probability.

State durations (example ranges):
- wander: 2-6s
- idle: 1-3s
- eat: 2-4s
- social: 1.5-3.5s

---

## 10) Implementation Plan

### Phase 1 - Scaffold
- Create `index.html`, `styles.css`, `app.js`.
- Build static layout (sidebar, HUD, zoo area).
- Add base CSS and responsive behavior.

### Phase 2 - Catalog + Sidebar
- Add species metadata mapped to `animals/*.png`.
- Render sidebar cards from metadata.
- Wire click handlers to spawn animals.

### Phase 3 - Simulation
- Implement animal instance model.
- Add requestAnimationFrame loop.
- Implement wandering and boundary handling.

### Phase 4 - Behaviors
- Add state machine (`wander/idle/eat/social`).
- Add species bias weights and transitions.
- Add simple neighbor-based social targeting.

### Phase 5 - Controls + Persistence
- Implement pause/resume and reset.
- Add localStorage save/load.
- Add capacity limit and user feedback.

### Phase 6 - Polish
- Improve animations (bobbing, facing).
- Add animal click info bubble.
- Optimize update/render where needed.

---

## 11) Acceptance Criteria
- App runs from static files without build step.
- Sidebar displays all listed animals with thumbnails.
- Clicking a species spawns visible animals in zoo area.
- Animals move continuously and remain in bounds.
- Animals periodically switch among required behavior states.
- Pause/Resume and Reset controls work.
- Zoo state persists across reload (unless reset).
- Layout is usable on desktop and mobile widths.
- No console errors during normal use.

---

## 12) Nice-to-Have (Post-MVP)
- Drag-and-drop animal placement.
- Day/night cycle visual changes.
- Sound toggle with ambient zoo sounds.
- Species-specific animation frames (if more art assets exist).
- Basic "zoo score" based on animal happiness and diversity.

---

## 13) Prompt Snippet for Codex
Use this when asking Codex to implement:

```text
Build the Make a Zoo browser game using the spec in MAKE_A_ZOO_SPEC.md.
Constraints:
- Pure HTML/CSS/vanilla JS
- No frameworks, no build step, no backend
- Use animal assets from /animals
- Keep code modular and readable
- Implement MVP requirements and acceptance criteria from the spec
```
