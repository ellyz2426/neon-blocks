# Neon Blocks VR

A feature-rich falling block puzzle game built with IWSDK 0.4.1 for WebXR and browser play. Inspired by Tetris with Zone mechanics from Tetris Effect.

**[▶ Play Now](https://ellyz2426.github.io/neon-blocks/)**

## Features

### Core Gameplay
- 7 tetromino pieces (I/O/T/S/Z/J/L) with SRS wall kick rotation
- 10×20 3D board with ghost piece preview and lock delay
- Hold piece system with swap mechanics
- 3-deep next piece preview queue (3D world-space previews)
- DAS (delayed auto-shift) with 3 speed settings (Slow/Normal/Fast)
- Soft drop (+1/row) and hard drop (+2/row) scoring
- Ghost piece toggle in settings

### Scoring Systems
- T-Spin detection (3-corner rule) with Single/Double/Triple differentiation
- Combo system with escalating bonuses (+50 × combo × level)
- Back-to-back difficult clear tracking (1.5× multiplier)
- Perfect clear detection (+3000 × level)
- Cascade chain bonus scoring (Cascade mode)
- Score popup notifications on line clears

### Zone System (Tetris Effect-inspired)
- Fill the Zone meter by clearing lines (~8 lines to fill)
- Activate with Q key / left squeeze for 12 seconds of slow-time
- Lines are banked during Zone and clear all at once on exit
- Named zone clears: Pentris through DECAHEXATRIS (16 lines)
- Exponential bonus scoring for zone clears
- Zone-specific achievements and statistics

### Power-Up System
- Earn power-ups with combo x3+
- **Bomb**: Clears bottom 3 rows with screen shake
- **Laser**: Clears lowest non-empty row with particles
- **Freeze**: Halves drop speed for 10 seconds

### 12 Game Modes
- **Marathon** — Endless, level up every 10 lines
- **Sprint 40** — Clear 40 lines ASAP (with PB tracking)
- **Ultra** — Score max in 3 minutes
- **Survival** — Speed increases + garbage spawns periodically
- **Zen** — No gravity, place freely
- **Blitz** — 1 minute, maximum score
- **Daily Challenge** — Seeded daily puzzle (mulberry32 PRNG)
- **Cascade** — Gravity cascades with chain reactions
- **Dig** — Clear 8 rows of preset garbage ASAP (with PB tracking)
- **Battle vs AI** — Survive AI garbage attacks, send counter-attacks
- **Classic** — NES-style: no hold, no ghost, no wall kicks
- **⚙ Challenge** — Custom rules: starting level, target lines, time limit, garbage interval

### 3 Difficulty Levels
- Easy (slow start), Normal, Hard (fast start)

### Progression
- XP/Level system (20 player titles: Novice → NEON GOD)
- 170+ achievements across all systems with paginated viewer
- Top 20 leaderboard with per-mode filtering
- Comprehensive career statistics (line clears, combos, T-Spins, perfects, cascades, zone stats)

### Performance Tracking
- PPS (Pieces Per Second)
- APM (Actions Per Minute)
- Finesse ratio (move efficiency vs optimal)
- Sprint and Dig personal best times

### Customization
- 14 holodeck themes (Neon, Crimson, Toxic, Ultra Violet, Solar, Deep Sea, Arctic, Midnight, Inferno, Matrix, Sakura, Void, Cyber, Horizon)
- 14 block skins (Neon, Crystal, Hologram, Plasma, Void, Solar, Retro, Chrome, Nebula, Obsidian, Prism, Glitch, Pulse, Frost)
- Volume controls (master/SFX/music)

### Visual & Audio
- 3D board with wall pillars and back panel
- Holodeck environment (grid floor/ceiling, 14 floating wireframe decorations, 40 ambient particles)
- Line clear animations with particle bursts
- Hard drop trail VFX particles
- Lock delay piece flash animation
- Screen shake on Tetris/T-Spin/Perfect Clear/Level Up/Zone
- Combo intensity border glow (color shift at high combos)
- Level-up celebration with sound and visual feedback
- Procedural Web Audio: 11+ SFX types
- Procedural arpeggiator music that evolves with level (4 scales, tempo ramp, wave shape shift)
- Ambient drone with LFO shimmer

### Controls

**Browser:**
| Key | Action |
|-----|--------|
| ←/→ | Move piece |
| ↓ | Soft drop |
| Space | Hard drop |
| ↑/X | Rotate CW |
| Z | Rotate CCW |
| C | Hold piece |
| Q | Activate Zone |
| R | Quick restart |
| Esc | Pause |

**VR (Quest controllers):**
| Input | Action |
|-------|--------|
| Right thumbstick L/R | Move piece |
| Right thumbstick down | Soft drop |
| Right trigger | Hard drop |
| Right A | Rotate CW |
| Left A | Rotate CCW |
| Right B | Pause |
| Left trigger | Hold piece |
| Left squeeze | Activate Zone |

### Technical
- 23 PanelUI spatial panels (zero HTML DOM overlays)
- Dual input: keyboard + XR controller
- localStorage persistence with backward-compatible migration
- Built with IWSDK 0.4.1 (`@iwsdk/core`, PanelUI, Follower, ScreenSpace)

## Development

```bash
npm install
npm run dev      # Start dev server
npm run build    # Production build
```
