# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Math Munchers is a browser-based educational math game inspired by classic Number Munchers. Players navigate a grid collecting numbers that satisfy a math rule while avoiding enemies.

## Running the Game

No build step required. Open `index.html` directly in a browser. The game runs completely offline with no server or network calls.

## Technical Stack

- Pure ES2020+ JavaScript (no frameworks, no dependencies)
- HTML5 Canvas for rendering
- Web Audio API for sound synthesis
- localStorage for persistence

## Architecture

The codebase consists of two files:

**index.html** - Entry point with embedded CSS, responsive grid layout, touch controls, and game overlay system.

**game.js** (~1,200 lines) - All game logic organized into these sections:

1. **Constants & Configuration** - DOM refs, color palette, game modes, storage keys
2. **Utilities** - Seeded RNG (`hashSeed`, `mulberry32`), math predicates (`isPrime`, `sumDigits`)
3. **Level Generation** - `buildRuleFactories()` defines 13 rule types, `createLevel()` generates deterministic levels from seeds
4. **Game State** - Single global `game` object holds all state (player, enemies, grid, score, status)
5. **Game Logic** - `makeMove()`, `attemptEat()`, `updateEnemies()` with 3 AI behaviors (random, chaser, guard)
6. **Rendering** - `drawBoard()`, `drawPlayer()`, `drawEnemy()`, `drawHud()`, `drawEffects()`
7. **Input** - Keyboard (arrows/WASD/space) and touch (9-button d-pad)
8. **Game Loop** - `update(delta, now)` and `render(now)` via requestAnimationFrame

## Key Design Patterns

- **Deterministic generation**: Levels use seeded PRNG for reproducibility
- **Single state object**: All game state in global `game` object
- **Pure utility functions**: Math and randomization helpers have no side effects
- **Event-driven input**: Keyboard and touch handlers update game state

## Adding New Math Rules

Add a new rule in `buildRuleFactories()` (~line 157). Each rule needs:
- `id`: unique string
- `name`: display name
- `description`: kid-readable explanation
- `predicate(n)`: returns true if number satisfies rule
- `explain(n, passed)`: explanation text for feedback

Rules should be addable in ~10-15 lines.

## Game Modes

- **Classic**: Lives-based, increasing difficulty, enemy avoidance
- **Puzzle**: No enemies, limited moves, must collect exact set
- **Challenge**: Timed runs with score multipliers

## Code Philosophy

From the product spec:
- Explicit logic over abstraction
- Functions ideally under 40 lines
- Readable, story-like code
- Code should be readable by a curious child
