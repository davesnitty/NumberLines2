
# Number Crunchers – Product Specification

## Vision
A fast, arcade-style math game inspired by *Number Munchers*, the fun math game I used to play on the Apple IIGS when I was younger. It's designed to be fun, motivating, and genuinely challenging for a smart 9-year-old who loves math.

**Hard constraints**
- 100% client-side JavaScript
- No server calls
- No build step, transpilation, or compilation
- Runs by opening `index.html`
- Simple, readable code

---

## Target User
**Primary**
- Age: 8–11
- Strong number sense
- Enjoys challenge and pattern discovery
- Gets bored by shallow or repetitive games

**Secondary**
- Parent co-playing or observing
- Teachers (offline classroom use)
- Nostalgic adults

---

## Core Design Principles
1. Math must matter
2. Pressure creates fun
3. Failure teaches, not punishes
4. Depth over breadth
5. Code should be readable by a curious child
6. Visual design should be modern but fun

---

## Game Overview
The player navigates a grid of numbers. Each level has a single math rule. The player must collect numbers that satisfy the rule while avoiding enemies and incorrect choices.

The challenge comes from:
- Pattern recognition
- Speeded decision-making
- Risk management under pressure

---

## Game Modes

### Classic Mode (Primary)
- Finite lives
- Increasing difficulty
- Escalating enemy behavior
- Goal: survive and advance as long as possible

### Puzzle Mode
- No enemies
- Limited moves
- Must collect exactly the correct set
- Focus on planning and reasoning

### Challenge Mode
- Timed runs
- Score multipliers
- Local best scores only (no online leaderboard)

---

## Difficulty Model
Difficulty scales across multiple axes:

| Axis | Easy | Medium | Hard |
|-----|------|--------|------|
| Number range | 1–20 | 1–200 | 1–10,000 |
| Rule subtlety | Obvious | Pattern-based | Edge-case heavy |
| Enemy speed | Slow | Equal | Faster than player |
| Correct tile density | High | Medium | Low |
| Time pressure | None | Light | Heavy |

Light dynamic adjustment:
- High accuracy increases pressure
- Low accuracy reduces enemy speed slightly
- Math complexity never auto-reduces

---

## Math Rules (MVP)

### Parity & Divisibility
- Even
- Odd
- Multiples of *k*
- Factors of *n*

### Prime Logic
- Prime numbers
- Composite numbers
- Exactly two factors

### Comparisons
- Greater than *x*
- Between *a* and *b*
- Closest to *n* (advanced)

### Digit Properties
- Ends in digit *d*
- Sum of digits = *s*
- Contains digit *d*

### Patterns
- Perfect squares
- Perfect cubes
- Factorials of integers

Each rule must include:
- Kid-readable description
- Clear explanation for mistakes

---

## Level Generation
- Deterministic (seeded PRNG)
- Always solvable
- Contains tempting incorrect tiles
- Correct tile ratios:
  - Easy: ~35%
  - Medium: ~20%
  - Hard: ~10%

Low correct density forces thinking.

---

## Enemies

### Types
- Random Walker
- Chaser (Manhattan logic)
- Guard (protects key tiles)

### Fairness Rules
- No spawn adjacent to player
- Grace period after life loss
- Clear visual tells for speed increases

---

## Scoring & Motivation
- Correct tile: +10
- Incorrect tile: −15
- Streak multipliers
- Time bonuses (Challenge Mode)

Rewards are cosmetic only:
- Color themes
- Enemy skins
- Sound packs

No addictive mechanics.

---

## Feedback & Learning Loop

### Immediate
- Animation
- Sound
- Text explanation of correctness

### End of Level
- Accuracy percentage
- Common mistake
- Suggested next challenge

---

## UX & Accessibility
- Keyboard + touch controls
- Color-blind safe palette
- Large text mode
- Reduced motion toggle
- No reliance on sound alone

---

## Technical Architecture

### Environment
- Plain ES2020+ JavaScript
- Canvas 2D
- No frameworks
- No external dependencies

### Persistence
- localStorage only
- JSON serialized

### File Structure
```
index.html
game.js
```

---

## Code Philosophy
- Explicit logic over abstraction
- Functions ideally under 40 lines
- Readable, story-like code
- New rules added in ~10–15 lines

---

## MVP Acceptance Criteria
- Game runs by opening `index.html`
- Zero network requests
- Engages a strong 9-year-old across many sessions
- Adding a new rule is trivial and isolated

---

## Success Definition
The game is successful when the child:
- Voluntarily replays
- Talks about patterns they discovered
- Asks for harder challenges
