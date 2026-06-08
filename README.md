# Neon Blocks VR

A falling tetromino puzzle game in WebXR/browser with a holodeck neon aesthetic. Built with [IWSDK](https://iwsdk.dev) 0.4.1.

**[Play Now](https://ellyz2426.github.io/neon-blocks/)**

## Features

### Core Gameplay
- 7 standard tetromino pieces (I, O, T, S, Z, J, L) with distinct neon colors
- 10x20 grid with ghost piece preview showing drop target
- Hold piece system (press C / Left Trigger)
- 3-deep next piece preview queue
- SRS (Super Rotation System) wall kick rotation for all pieces
- T-Spin detection with bonus scoring
- Combo system with escalating multipliers
- Back-to-back difficult clear bonuses (1.5x for consecutive Tetrises/T-Spins)
- Perfect clear detection (+3000 x level)
- Line clear animations with particle burst effects
- Lock delay with move/rotate resets (15 max resets)
- DAS (Delayed Auto-Shift) for fast horizontal movement

### Game Modes
1. **Marathon** — Endless play, level up every 10 lines cleared
2. **Sprint 40** — Clear 40 lines as fast as possible
3. **Ultra** — Score as much as you can in 3 minutes
4. **Survival** — Speed increases constantly over time
5. **Zen** — No gravity, place pieces freely at your own pace
6. **Blitz** — 1 minute, maximize your score
7. **Daily Challenge** — Date-seeded puzzle, same for everyone each day
8. **Cascade** — Cleared blocks trigger chain reactions

### Scoring
- Single: 100 x level
- Double: 300 x level
- Triple: 500 x level
- Tetris (4 lines): 800 x level
- T-Spin bonus: 1.5x multiplier
- Back-to-Back: 1.5x multiplier
- Combo: +50 x combo count x level
- Soft drop: +1 per row
- Hard drop: +2 per row

### Progression
- 45 achievements across all game systems
- XP/Level progression (20 player titles: Novice to NEON GOD)
- 3 difficulty levels (Easy/Normal/Hard)
- Top 20 leaderboard with mode/level/date
- Career statistics tracking
- Daily challenge streak tracking

### Customization
- 6 holodeck themes (Neon, Crimson, Toxic, Ultra Violet, Solar, Deep Sea)
- 6 block skins (Neon, Crystal, Hologram, Plasma, Void, Solar)
- Volume controls (Master/SFX/Music)

### Audio
- Procedural Web Audio synthesis
- Distinct SFX for move, rotate, drop, lock, line clear (1-4 lines), T-Spin, combo, achievement
- Ambient drone music with sine + triangle pad + shimmer oscillator

### UI
- 16 PanelUI spatial panels (zero HTML DOM)
- All menus, HUD, notifications are `.uikitml` templates
- Follower-based HUD follows player head in XR
- ScreenSpace next/hold preview in browser mode
- Toast notification system for achievements and events
- Line clear text display (SINGLE/DOUBLE/TRIPLE/TETRIS/T-SPIN/PERFECT CLEAR)

## Controls

### Browser
| Key | Action |
|-----|--------|
| Left/Right Arrow | Move piece |
| Down Arrow | Soft drop |
| Space | Hard drop |
| Up Arrow / X | Rotate clockwise |
| Z | Rotate counter-clockwise |
| C | Hold piece |
| Escape | Pause |

### VR Controllers
| Input | Action |
|-------|--------|
| Right Thumbstick L/R | Move piece |
| Right Thumbstick Down | Soft drop |
| Right Trigger | Hard drop |
| A Button | Rotate CW |
| B Button | Rotate CCW / Pause |
| Left Trigger | Hold piece |

## Tech Stack
- IWSDK 0.4.1 (WebXR framework)
- Vite 7 + TypeScript
- PanelUI (@pmndrs/uikit + uikitml)
- Web Audio API (procedural synthesis)
- localStorage (persistence)

## Project Structure
```
neon-blocks/
  src/index.ts          # Main game (all logic in single file)
  ui/*.uikitml          # 16 PanelUI templates
  index.html            # Entry point
  vite.config.ts        # Vite + IWSDK plugins
```

## Development
```bash
npm run dev        # Start dev server
npm run build      # Production build
```
