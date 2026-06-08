# Neon Blocks VR

A feature-rich falling block puzzle game built with IWSDK 0.4.1 for WebXR and browser play.

**[▶ Play Now](https://ellyz2426.github.io/neon-blocks/)**

## Features

### Core Gameplay
- 7 tetromino pieces (I/O/T/S/Z/J/L) with SRS wall kick rotation
- 10×20 3D board with ghost piece preview and lock delay
- Hold piece system with swap mechanics
- 3-deep next piece preview queue (3D world-space previews)
- DAS (delayed auto-shift) for fast horizontal movement
- Soft drop (+1/row) and hard drop (+2/row) scoring

### Scoring Systems
- T-Spin detection (3-corner rule) with bonus multiplier
- Combo system with escalating bonuses (+50 × combo × level)
- Back-to-back difficult clear tracking (1.5× multiplier)
- Perfect clear detection (+3000 × level)
- Cascade chain bonus scoring (Cascade mode)

### 8 Game Modes
- **Marathon** — Endless, level up every 10 lines
- **Sprint 40** — Clear 40 lines as fast as possible
- **Ultra** — Score as much as you can in 3 minutes
- **Survival** — Speed increases constantly, garbage lines spawn periodically
- **Zen** — No gravity, place freely
- **Blitz** — 1 minute, maximum score
- **Daily Challenge** — Seeded daily puzzle (mulberry32 PRNG)
- **Cascade** — Cleared blocks trigger gravity cascades with chain reactions

### 3 Difficulty Levels
- Easy (slow start), Normal, Hard (fast start)

### Progression
- XP/Level system (20 player titles: Novice → NEON GOD)
- 90 achievements across all systems with paginated viewer
- Top 20 leaderboard with per-mode filtering
- Comprehensive career statistics (line clears, combos, T-Spins, perfects, cascades)

### Customization
- 10 holodeck themes (Neon, Crimson, Toxic, Ultra Violet, Solar, Deep Sea, Arctic, Midnight, Inferno, Matrix)
- 10 block skins (Neon, Crystal, Hologram, Plasma, Void, Solar, Retro, Chrome, Nebula, Obsidian)
- Volume controls (master/SFX/music)

### Visual & Audio
- 3D board with wall pillars and back panel
- Holodeck environment (grid floor/ceiling, 14 floating wireframe decorations, 40 ambient particles)
- Line clear animations with particle bursts
- Screen shake on Tetris/T-Spin/Perfect Clear/Level Up
- Level-up celebration with sound and visual feedback
- Board border glow pulse animation
- Procedural Web Audio: 11+ SFX types
- Procedural arpeggiator music that evolves with level (4 scales, tempo ramp)
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
| R | Quick restart |
| Esc | Pause |

**VR (Quest controllers):**
| Input | Action |
|-------|--------|
| Right thumbstick L/R | Move piece |
| Right thumbstick down | Soft drop |
| Right trigger | Hard drop |
| A button | Rotate CW |
| Left A | Rotate CCW |
| B button | Pause |
| Left trigger | Hold piece |

### Technical
- 17 PanelUI spatial panels (zero HTML DOM overlays)
- Dual input: keyboard + XR controller
- localStorage persistence with backward-compatible migration
- Built with IWSDK 0.4.1 (`@iwsdk/core`, PanelUI, Follower, ScreenSpace)

## Development

```bash
npm install
npm run dev      # Start dev server
npm run build    # Production build
```
