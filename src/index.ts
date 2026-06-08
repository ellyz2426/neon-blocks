import {
  World, PanelUI, Follower, FollowBehavior, ScreenSpace, PanelDocument, UIKitDocument,
  Mesh, Group, BoxGeometry, SphereGeometry, EdgesGeometry, LineSegments,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  Color, Vector3, Quaternion,
  AmbientLight, PointLight, DirectionalLight,
  Float32BufferAttribute, BufferGeometry, AdditiveBlending, Fog,
  PlaneGeometry, TorusGeometry, ConeGeometry, CylinderGeometry, OctahedronGeometry,
} from '@iwsdk/core';

// ─── TYPES & CONSTANTS ───────────────────────────────────────────────
type GameState = 'title' | 'modeSelect' | 'difficulty' | 'countdown' | 'playing' | 'paused' | 'gameOver' | 'leaderboard' | 'achievements' | 'stats' | 'settings' | 'help' | 'skins';
type GameMode = 'marathon' | 'sprint' | 'ultra' | 'survival' | 'zen' | 'blitz' | 'daily' | 'cascade' | 'dig' | 'battle' | 'classic';

function fmtNum(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function fmtTime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  return `${mins}:${(secs % 60).toString().padStart(2, '0')}`;
}
type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

const COLS = 10, ROWS = 20;
const CELL = 0.08;
const PIECE_COLORS: Record<PieceType, number> = {
  I: 0x00ffff, O: 0xffff00, T: 0xaa00ff, S: 0x00ff00, Z: 0xff0000, J: 0x0066ff, L: 0xff8800,
};
const PIECE_SHAPES: Record<PieceType, number[][][]> = {
  I: [[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],[[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],[[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],[[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]],
  O: [[[1,1],[1,1]]],
  T: [[[0,1,0],[1,1,1],[0,0,0]],[[0,1,0],[0,1,1],[0,1,0]],[[0,0,0],[1,1,1],[0,1,0]],[[0,1,0],[1,1,0],[0,1,0]]],
  S: [[[0,1,1],[1,1,0],[0,0,0]],[[0,1,0],[0,1,1],[0,0,1]],[[0,0,0],[0,1,1],[1,1,0]],[[1,0,0],[1,1,0],[0,1,0]]],
  Z: [[[1,1,0],[0,1,1],[0,0,0]],[[0,0,1],[0,1,1],[0,1,0]],[[0,0,0],[1,1,0],[0,1,1]],[[0,1,0],[1,1,0],[1,0,0]]],
  J: [[[1,0,0],[1,1,1],[0,0,0]],[[0,1,1],[0,1,0],[0,1,0]],[[0,0,0],[1,1,1],[0,0,1]],[[0,1,0],[0,1,0],[1,1,0]]],
  L: [[[0,0,1],[1,1,1],[0,0,0]],[[0,1,0],[0,1,0],[0,1,1]],[[0,0,0],[1,1,1],[1,0,0]],[[1,1,0],[0,1,0],[0,1,0]]],
};
const KICK_JLSTZ: number[][][] = [
  [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
];
const KICK_I: number[][][] = [
  [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
];

// ─── POWER-UPS ─────────────────────────────────────────────────
type PowerUpType = 'bomb' | 'laser' | 'freeze';
const POWERUP_COLORS: Record<PowerUpType, number> = { bomb: 0xff4400, laser: 0x00ff88, freeze: 0x44bbff };
const POWERUP_NAMES: Record<PowerUpType, string> = { bomb: 'BOMB', laser: 'LASER', freeze: 'FREEZE' };
const POWERUP_TYPES: PowerUpType[] = ['bomb', 'laser', 'freeze'];
const DAS_LEVELS = [
  { name: 'Slow', delay: 0.22, repeat: 0.05 },
  { name: 'Normal', delay: 0.17, repeat: 0.03 },
  { name: 'Fast', delay: 0.12, repeat: 0.02 },
];

// Dig mode: preset garbage patterns (8 rows, random gap per row)
function generateDigGarbage(rngFn: () => number): { color: number; gap: number }[] {
  const rows: { color: number; gap: number }[] = [];
  const garbageColors = [0x555555, 0x444455, 0x554444, 0x445544, 0x555544, 0x445555, 0x554455, 0x505050];
  for (let i = 0; i < 8; i++) {
    rows.push({ color: garbageColors[i % garbageColors.length], gap: Math.floor(rngFn() * COLS) });
  }
  return rows;
}

const THEMES = [
  { name: 'Neon Holodeck', grid: 0x003333, accent: 0x00ffff, bg: 0x000a0a, fog: 0x001515, wall: 0x004444 },
  { name: 'Crimson', grid: 0x330000, accent: 0xff4444, bg: 0x0a0000, fog: 0x150000, wall: 0x440000 },
  { name: 'Toxic', grid: 0x003300, accent: 0x00ff44, bg: 0x000a00, fog: 0x001500, wall: 0x004400 },
  { name: 'Ultra Violet', grid: 0x220033, accent: 0xaa44ff, bg: 0x0a0015, fog: 0x150022, wall: 0x330044 },
  { name: 'Solar', grid: 0x332200, accent: 0xff8800, bg: 0x0a0500, fog: 0x150a00, wall: 0x443300 },
  { name: 'Deep Sea', grid: 0x001133, accent: 0x0088ff, bg: 0x000510, fog: 0x000a15, wall: 0x002244 },
  { name: 'Arctic', grid: 0x1a2a33, accent: 0x88ddff, bg: 0x050a0f, fog: 0x0a1520, wall: 0x2a3a44 },
  { name: 'Midnight', grid: 0x110022, accent: 0x6644cc, bg: 0x050010, fog: 0x0a0018, wall: 0x220044 },
  { name: 'Inferno', grid: 0x331100, accent: 0xff4400, bg: 0x0a0400, fog: 0x150800, wall: 0x442200 },
  { name: 'Matrix', grid: 0x002200, accent: 0x33ff33, bg: 0x000800, fog: 0x001000, wall: 0x003300 },
  { name: 'Sakura', grid: 0x331122, accent: 0xff88cc, bg: 0x0a0408, fog: 0x150812, wall: 0x442244 },
  { name: 'Void', grid: 0x0a0a15, accent: 0x4444aa, bg: 0x020208, fog: 0x050510, wall: 0x1a1a33 },
];

const SKINS = [
  { name: 'Neon', wireframe: true, emissive: 1.0, roughness: 0.3, metalness: 0.7 },
  { name: 'Crystal', wireframe: false, emissive: 0.6, roughness: 0.1, metalness: 0.9 },
  { name: 'Hologram', wireframe: true, emissive: 1.5, roughness: 0.0, metalness: 1.0 },
  { name: 'Plasma', wireframe: false, emissive: 0.8, roughness: 0.5, metalness: 0.5 },
  { name: 'Void', wireframe: true, emissive: 0.4, roughness: 0.8, metalness: 0.2 },
  { name: 'Solar', wireframe: false, emissive: 1.2, roughness: 0.2, metalness: 0.8 },
  { name: 'Retro', wireframe: false, emissive: 0.3, roughness: 0.9, metalness: 0.1 },
  { name: 'Chrome', wireframe: false, emissive: 0.5, roughness: 0.05, metalness: 1.0 },
  { name: 'Nebula', wireframe: false, emissive: 0.9, roughness: 0.3, metalness: 0.6 },
  { name: 'Obsidian', wireframe: false, emissive: 0.7, roughness: 0.15, metalness: 0.85 },
  { name: 'Prism', wireframe: false, emissive: 1.3, roughness: 0.1, metalness: 0.95 },
  { name: 'Glitch', wireframe: true, emissive: 1.1, roughness: 0.4, metalness: 0.6 },
];

const PLAYER_TITLES = ['Novice','Beginner','Apprentice','Student','Learner','Adept','Skilled','Expert','Master','Champion','Legend','Titan','Prodigy','Virtuoso','Grandmaster','Overlord','Demigod','Immortal','Transcendent','NEON GOD'];

interface Achievement { id: string; name: string; desc: string; }
const ACHIEVEMENTS: Achievement[] = [
  // Line clears
  { id: 'first_clear', name: 'First Line', desc: 'Clear your first line' },
  { id: 'ten_lines', name: 'Ten Lines', desc: 'Clear 10 lines in a game' },
  { id: 'fifty_lines', name: 'Fifty Lines', desc: 'Clear 50 lines total' },
  { id: 'hundred_lines', name: 'Century', desc: 'Clear 100 lines total' },
  { id: 'five_hundred_lines', name: 'Line Lord', desc: 'Clear 500 lines total' },
  { id: 'thousand_lines', name: 'Line Legend', desc: 'Clear 1,000 lines total' },
  { id: 'twenty_five_hundred', name: 'Line God', desc: 'Clear 2,500 lines total' },
  // Tetrises
  { id: 'first_tetris', name: 'First Tetris', desc: 'Clear 4 lines at once' },
  { id: 'ten_tetrises', name: 'Tetris Master', desc: '10 Tetrises total' },
  { id: 'twenty_five_tetrises', name: 'Tetris Expert', desc: '25 Tetrises total' },
  { id: 'fifty_tetrises', name: 'Tetris Lord', desc: '50 Tetrises total' },
  { id: 'hundred_tetrises', name: 'Tetris God', desc: '100 Tetrises total' },
  // T-Spins
  { id: 'first_tspin', name: 'T-Spin!', desc: 'Perform a T-Spin' },
  { id: 'ten_tspins', name: 'T-Spin Expert', desc: '10 T-Spins total' },
  { id: 'twenty_five_tspins', name: 'T-Spin Master', desc: '25 T-Spins total' },
  { id: 'fifty_tspins', name: 'T-Spin Lord', desc: '50 T-Spins total' },
  // Combos
  { id: 'combo_5', name: 'Combo x5', desc: 'Reach a 5 combo' },
  { id: 'combo_10', name: 'Combo x10', desc: 'Reach a 10 combo' },
  { id: 'combo_15', name: 'Unstoppable', desc: 'Reach a 15 combo' },
  { id: 'combo_20', name: 'Combo Maniac', desc: 'Reach a 20 combo' },
  { id: 'combo_25', name: 'Combo God', desc: 'Reach a 25 combo' },
  // Back-to-back
  { id: 'b2b_3', name: 'Back-to-Back x3', desc: '3 consecutive difficult clears' },
  { id: 'b2b_5', name: 'Back-to-Back x5', desc: '5 consecutive difficult clears' },
  { id: 'b2b_7', name: 'Back-to-Back x7', desc: '7 consecutive difficult clears' },
  { id: 'b2b_10', name: 'Relentless', desc: '10 consecutive difficult clears' },
  // Score
  { id: 'score_1k', name: 'Scorer', desc: 'Score 1,000 points' },
  { id: 'score_10k', name: 'High Scorer', desc: 'Score 10,000 points' },
  { id: 'score_50k', name: 'Score Legend', desc: 'Score 50,000 points' },
  { id: 'score_100k', name: 'Score God', desc: 'Score 100,000 points' },
  { id: 'score_250k', name: 'Quarter Million', desc: 'Score 250,000 points' },
  { id: 'score_500k', name: 'Half Million', desc: 'Score 500,000 points' },
  { id: 'score_1m', name: 'Millionaire', desc: 'Score 1,000,000 points' },
  // Levels
  { id: 'level_5', name: 'Level 5', desc: 'Reach level 5' },
  { id: 'level_10', name: 'Level 10', desc: 'Reach level 10' },
  { id: 'level_15', name: 'Level 15', desc: 'Reach level 15' },
  { id: 'level_20', name: 'Level 20', desc: 'Reach level 20' },
  { id: 'level_25', name: 'Level 25', desc: 'Reach level 25' },
  { id: 'level_30', name: 'Level 30', desc: 'Reach level 30' },
  // Sprint
  { id: 'sprint_clear', name: 'Sprinter', desc: 'Complete Sprint 40' },
  { id: 'sprint_under_2', name: 'Speed Demon', desc: 'Sprint 40 under 2 minutes' },
  { id: 'sprint_under_90', name: 'Lightning Sprint', desc: 'Sprint 40 under 90 seconds' },
  { id: 'sprint_under_60', name: 'Hyperspeed', desc: 'Sprint 40 under 60 seconds' },
  // Games
  { id: 'games_10', name: 'Regular', desc: 'Play 10 games' },
  { id: 'games_50', name: 'Dedicated', desc: 'Play 50 games' },
  { id: 'games_100', name: 'Veteran', desc: 'Play 100 games' },
  { id: 'games_500', name: 'Lifer', desc: 'Play 500 games' },
  // Pieces
  { id: 'pieces_100', name: 'Builder', desc: 'Place 100 pieces total' },
  { id: 'pieces_1000', name: 'Architect', desc: 'Place 1,000 pieces total' },
  { id: 'pieces_5000', name: 'Grand Architect', desc: 'Place 5,000 pieces total' },
  { id: 'pieces_10000', name: 'Infinite Builder', desc: 'Place 10,000 pieces total' },
  // Special
  { id: 'perfect_clear', name: 'Perfect Clear', desc: 'Empty the entire board' },
  { id: 'perfect_3', name: 'Perfect x3', desc: '3 perfect clears total' },
  { id: 'perfect_10', name: 'Perfectionist', desc: '10 perfect clears total' },
  { id: 'triple', name: 'Triple', desc: 'Clear 3 lines at once' },
  { id: 'hard_drop_100', name: 'Slam', desc: 'Hard drop 100 times total' },
  { id: 'hard_drop_500', name: 'Pile Driver', desc: 'Hard drop 500 times total' },
  { id: 'hard_drop_1000', name: 'Meteor', desc: 'Hard drop 1,000 times total' },
  // Mode-specific
  { id: 'daily_done', name: 'Daily Player', desc: 'Complete a Daily Challenge' },
  { id: 'daily_3', name: 'Daily Streak 3', desc: '3-day daily challenge streak' },
  { id: 'daily_7', name: 'Weekly Warrior', desc: '7-day daily challenge streak' },
  { id: 'daily_30', name: 'Monthly Master', desc: '30-day daily challenge streak' },
  { id: 'skin_used', name: 'Fashion', desc: 'Use a non-default skin' },
  { id: 'all_modes', name: 'Explorer', desc: 'Play all 8 game modes' },
  { id: 'hard_mode', name: 'Hardcore', desc: 'Complete a game on Hard' },
  { id: 'zen_100', name: 'Zen Master', desc: 'Place 100 pieces in Zen mode' },
  { id: 'survival_5', name: 'Survivor', desc: 'Reach level 5 in Survival' },
  { id: 'survival_10', name: 'Endurance', desc: 'Reach level 10 in Survival' },
  { id: 'survival_15', name: 'Iron Will', desc: 'Reach level 15 in Survival' },
  { id: 'survival_20', name: 'Invincible', desc: 'Reach level 20 in Survival' },
  { id: 'blitz_5k', name: 'Blitz Bronze', desc: 'Score 5,000 in Blitz' },
  { id: 'blitz_10k', name: 'Blitz Silver', desc: 'Score 10,000 in Blitz' },
  { id: 'blitz_25k', name: 'Blitz Gold', desc: 'Score 25,000 in Blitz' },
  { id: 'ultra_25k', name: 'Ultra Bronze', desc: 'Score 25,000 in Ultra' },
  { id: 'ultra_50k', name: 'Ultra Silver', desc: 'Score 50,000 in Ultra' },
  { id: 'ultra_100k', name: 'Ultra Gold', desc: 'Score 100,000 in Ultra' },
  // Cascade
  { id: 'cascade_chain', name: 'Chain Reaction', desc: 'Get a 3+ cascade chain' },
  { id: 'cascade_5', name: 'Chain Master', desc: 'Get a 5+ cascade chain' },
  { id: 'cascade_7', name: 'Chain Lord', desc: 'Get a 7+ cascade chain' },
  // Player level
  { id: 'plvl_5', name: 'Rising Star', desc: 'Reach player level 5' },
  { id: 'plvl_10', name: 'Experienced', desc: 'Reach player level 10' },
  { id: 'plvl_15', name: 'Elite', desc: 'Reach player level 15' },
  { id: 'plvl_20', name: 'NEON GOD', desc: 'Reach player level 20' },
  // Theme/skin collectors
  { id: 'all_themes', name: 'Decorator', desc: 'Try all 10 holodeck themes' },
  { id: 'all_skins', name: 'Collector', desc: 'Try all 10 block skins' },

  // Dig mode
  { id: 'dig_clear', name: 'Excavator', desc: 'Complete a Dig game' },
  { id: 'dig_under_60', name: 'Speed Digger', desc: 'Dig under 60 seconds' },
  { id: 'dig_under_30', name: 'Drill Master', desc: 'Dig under 30 seconds' },
  { id: 'dig_under_20', name: 'Diamond Drill', desc: 'Dig under 20 seconds' },
  // Battle mode
  { id: 'battle_1min', name: 'Contender', desc: 'Survive 1 min in Battle' },
  { id: 'battle_3min', name: 'Fighter', desc: 'Survive 3 min in Battle' },
  { id: 'battle_5min', name: 'Warrior', desc: 'Survive 5 min in Battle' },
  { id: 'battle_10min', name: 'Champion', desc: 'Survive 10 min in Battle' },
  { id: 'battle_send_10', name: 'Counterattack', desc: 'Send 10 garbage lines in Battle' },
  { id: 'battle_send_25', name: 'Bombardment', desc: 'Send 25 garbage lines in Battle' },
  // Power-ups
  { id: 'first_powerup', name: 'Powered Up', desc: 'Earn your first power-up' },
  { id: 'powerup_10', name: 'Power Player', desc: 'Use 10 power-ups total' },
  { id: 'powerup_bomb', name: 'Demolition', desc: 'Use a Bomb power-up' },
  { id: 'powerup_laser', name: 'Precision', desc: 'Use a Laser power-up' },
  { id: 'powerup_freeze', name: 'Chill Out', desc: 'Use a Freeze power-up' },
  { id: 'powerup_25', name: 'Arsenal', desc: 'Use 25 power-ups total' },
  // Advanced milestones
  { id: 'ten_thousand_lines', name: 'Line Infinity', desc: 'Clear 10,000 lines total' },
  { id: 'score_5m', name: 'Five Million', desc: 'Score 5,000,000 total' },
  { id: 'b2b_15', name: 'Unstoppable Chain', desc: '15 consecutive difficult clears' },
  { id: 'combo_30', name: 'Combo Infinity', desc: 'Reach a 30 combo' },
  { id: 'games_250', name: 'Obsessed', desc: 'Play 250 games' },
  { id: 'plvl_3', name: 'Getting Started', desc: 'Reach player level 3' },
  { id: 'plvl_7', name: 'Seasoned', desc: 'Reach player level 7' },
  { id: 'marathon_lvl_20', name: 'Marathon Legend', desc: 'Reach level 20 in Marathon' },
  { id: 'all_10_modes', name: 'Mode Master', desc: 'Play all 10 game modes' },

  // Miscellaneous
  { id: 'first_hold', name: 'Strategic', desc: 'Use Hold for the first time' },
  { id: 'no_hold_win', name: 'Purist', desc: 'Complete Marathon L10+ without Hold' },
  { id: 'speed_20', name: 'Terminal Velocity', desc: 'Play at drop speed < 0.1s' },
  { id: 'garbage_clear', name: 'Garbage Collector', desc: 'Clear a garbage line in Survival' },
  { id: 'garbage_10', name: 'Sanitation Expert', desc: 'Clear 10 garbage lines total' },

  // Zone
  { id: 'first_zone', name: 'Zone Activated', desc: 'Activate Zone for the first time' },
  { id: 'zone_5', name: 'Zone Adept', desc: 'Activate Zone 5 times total' },
  { id: 'zone_10', name: 'Zone Master', desc: 'Activate Zone 10 times total' },
  { id: 'zone_25', name: 'Zone Lord', desc: 'Activate Zone 25 times total' },
  { id: 'zone_lines_5', name: 'Zone Stacker', desc: 'Clear 5+ lines in a single Zone' },
  { id: 'zone_lines_8', name: 'Zone Prodigy', desc: 'Clear 8+ lines in a single Zone' },
  { id: 'zone_lines_12', name: 'Zone God', desc: 'Clear 12+ lines in a single Zone' },
  { id: 'zone_lines_16', name: 'Zone Transcendent', desc: 'Clear 16+ lines in a single Zone' },
  { id: 'zone_decahexatris', name: 'DECAHEXATRIS', desc: 'Clear 16 lines simultaneously in Zone' },
  { id: 'zone_perfect', name: 'Zone Perfect', desc: 'Empty the board during Zone' },

  // Piece stats
  { id: 'piece_i_100', name: 'I-Piece Fan', desc: 'Place 100 I-pieces total' },
  { id: 'piece_t_100', name: 'T-Piece Fan', desc: 'Place 100 T-pieces total' },

  // All skins/themes expanded
  { id: 'all_12_themes', name: 'Interior Designer', desc: 'Try all 12 holodeck themes' },
  { id: 'all_12_skins', name: 'Fashionista', desc: 'Try all 12 block skins' },

  // Classic mode
  { id: 'classic_clear', name: 'Classicist', desc: 'Complete a Classic game at L10+' },
  { id: 'classic_10k', name: 'Classic Bronze', desc: 'Score 10,000 in Classic' },
  { id: 'classic_50k', name: 'Classic Silver', desc: 'Score 50,000 in Classic' },
  { id: 'classic_100k', name: 'Classic Gold', desc: 'Score 100,000 in Classic' },
  { id: 'classic_no_tspin', name: 'Old School', desc: 'Classic L15+ without T-Spins' },

  // Speed/efficiency
  { id: 'pps_1', name: 'Speedy', desc: 'Average 1.0+ PPS in a game' },
  { id: 'pps_2', name: 'Lightning Fingers', desc: 'Average 2.0+ PPS in a game' },
  { id: 'pps_3', name: 'Hyperspeed Hands', desc: 'Average 3.0+ PPS in a game' },

  // Marathon milestones
  { id: 'marathon_100', name: 'Marathon Century', desc: 'Clear 100 lines in Marathon' },
  { id: 'marathon_200', name: 'Marathon Bicentennial', desc: 'Clear 200 lines in Marathon' },

  // Sprint PB
  { id: 'sprint_under_45', name: 'Sprint Ace', desc: 'Sprint 40 under 45 seconds' },

  // Score milestones
  { id: 'score_2m', name: 'Two Million', desc: 'Score 2,000,000 total' },
  { id: 'score_10m', name: 'Ten Million', desc: 'Score 10,000,000 total' },

  // Time played
  { id: 'playtime_1h', name: 'Dedicated Player', desc: 'Play for 1 hour total' },
  { id: 'playtime_5h', name: 'Tetris Addict', desc: 'Play for 5 hours total' },
  { id: 'playtime_10h', name: 'Tetris Lifestyle', desc: 'Play for 10 hours total' },

  // Miscellaneous
  { id: 'all_11_modes', name: 'Ultimate Explorer', desc: 'Play all 11 game modes' },
  { id: 'first_zone_5', name: 'Zone Novice', desc: 'Clear 5+ lines in first Zone' },
  { id: 'tspin_triple', name: 'T-Spin Triple', desc: 'T-Spin + clear 3 lines' },
  { id: 'zone_8_plus', name: 'Zone Expert', desc: 'Clear 8+ lines in Zone 3 times' },
];

// ─── SAVE DATA ─────────────────────────────────────────────────────
interface SaveData {
  leaderboard: { score: number; mode: string; level: number; lines: number; date: string }[];
  achievements: string[];
  stats: {
    games: number; totalScore: number; bestScore: number; totalLines: number; bestLevel: number;
    tetrises: number; tspins: number; bestCombo: number; playTimeMs: number; piecesPlaced: number;
    hardDrops: number; modesPlayed: string[]; dailyStreak: number; lastDailyDate: string;
    singles: number; doubles: number; triples: number; perfectClears: number;
    garbageCleared: number; bestCascade: number; themesUsed: number[]; skinsUsed: number[];
    powerUpsUsed: number; battleBestMs: number; digBestMs: number; garbageSent: number;
    holdUsedCount: number; zoneActivations: number; bestZoneLines: number;
    pieceCounts: Record<string, number>;
    sprintBestMs: number; classicBestScore: number; totalActions: number;
  };
  settings: { masterVol: number; sfxVol: number; musicVol: number; themeIdx: number; skinIdx: number; difficulty: number; ghostVisible: boolean; dasLevel: number };
  xp: number; playerLevel: number;
}
function defaultSave(): SaveData {
  return {
    leaderboard: [], achievements: [], xp: 0, playerLevel: 1,
    stats: {
      games: 0, totalScore: 0, bestScore: 0, totalLines: 0, bestLevel: 0, tetrises: 0, tspins: 0,
      bestCombo: 0, playTimeMs: 0, piecesPlaced: 0, hardDrops: 0, modesPlayed: [], dailyStreak: 0, lastDailyDate: '',
      singles: 0, doubles: 0, triples: 0, perfectClears: 0,
      garbageCleared: 0, bestCascade: 0, themesUsed: [0], skinsUsed: [0],
      powerUpsUsed: 0, battleBestMs: 0, digBestMs: 0, garbageSent: 0,
      holdUsedCount: 0, zoneActivations: 0, bestZoneLines: 0,
      pieceCounts: { I: 0, O: 0, T: 0, S: 0, Z: 0, J: 0, L: 0 },
      sprintBestMs: 0, classicBestScore: 0, totalActions: 0,
    },
    settings: { masterVol: 100, sfxVol: 100, musicVol: 100, themeIdx: 0, skinIdx: 0, difficulty: 1, ghostVisible: true, dasLevel: 1 },
  };
}
function loadSave(): SaveData {
  try {
    const s = localStorage.getItem('neon-blocks-save');
    if (s) {
      const d = JSON.parse(s);
      const def = defaultSave();
      return { ...def, ...d, stats: { ...def.stats, ...(d.stats || {}) }, settings: { ...def.settings, ...(d.settings || {}) } };
    }
  } catch {}
  return defaultSave();
}
function writeSave(d: SaveData) { try { localStorage.setItem('neon-blocks-save', JSON.stringify(d)); } catch {} }

// ─── AUDIO ─────────────────────────────────────────────────────────
class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  private musicNodes: (OscillatorNode | GainNode | BiquadFilterNode)[] = [];
  private musicPlaying = false;
  private arpInterval: ReturnType<typeof setInterval> | null = null;
  private currentArpLevel = 1;

  private ensure() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  setVolumes(master: number, sfx: number, music: number) {
    this.ensure();
    this.masterGain.gain.value = master / 100;
    this.sfxGain.gain.value = sfx / 100;
    this.musicGain.gain.value = music / 100;
  }

  private playTone(freq: number, type: OscillatorType, dur: number, vol = 0.15) {
    this.ensure();
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.value = freq * (0.97 + Math.random() * 0.06);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(); o.stop(ctx.currentTime + dur);
  }

  move() { this.playTone(200, 'square', 0.05, 0.08); }
  rotate() { this.playTone(400, 'triangle', 0.08, 0.1); }
  drop() { this.playTone(150, 'sawtooth', 0.15, 0.12); }
  lock() { this.playTone(280, 'square', 0.1, 0.1); }
  hold() { this.playTone(500, 'triangle', 0.1, 0.08); }

  lineClear(count: number) {
    this.ensure();
    const freqs = count >= 4 ? [440, 554, 659, 880] : count === 3 ? [440, 554, 659] : count === 2 ? [440, 554] : [440];
    freqs.forEach((f, i) => { setTimeout(() => this.playTone(f, 'sine', 0.25, 0.18), i * 60); });
  }

  tSpin() {
    this.ensure();
    [660, 880, 1100].forEach((f, i) => setTimeout(() => this.playTone(f, 'triangle', 0.2, 0.15), i * 70));
  }

  combo(n: number) { this.playTone(330 + n * 55, 'triangle', 0.15, 0.12); }

  gameOver() {
    [440, 370, 330, 262].forEach((f, i) => setTimeout(() => this.playTone(f, 'sawtooth', 0.3, 0.1), i * 120));
  }

  achievement() {
    [660, 770, 880, 990, 1100].forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.2, 0.1), i * 80));
  }

  levelUp() {
    this.ensure();
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.playTone(f, 'triangle', 0.2, 0.2), i * 80));
  }

  countdown() { this.playTone(440, 'sine', 0.15, 0.12); }
  countdownGo() { this.playTone(880, 'sine', 0.25, 0.15); }
  click() { this.playTone(600, 'sine', 0.05, 0.08); }
  cascade() { this.playTone(700, 'triangle', 0.2, 0.15); }
  garbage() { this.playTone(120, 'sawtooth', 0.3, 0.1); }

  powerUp() {
    this.ensure();
    [440, 660, 880, 1100, 1320].forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.15, 0.12), i * 50));
  }

  digWin() {
    this.ensure();
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => setTimeout(() => this.playTone(f, 'triangle', 0.25, 0.18), i * 80));
  }

  battleHit() { this.playTone(180, 'square', 0.2, 0.1); }

  updateLevel(level: number) { this.currentArpLevel = level; }

  startMusic() {
    if (this.musicPlaying) return;
    this.ensure();
    const ctx = this.ctx!;
    this.musicPlaying = true;

    // Bass drone
    const bass = ctx.createOscillator();
    const bassG = ctx.createGain();
    bass.type = 'sine'; bass.frequency.value = 55;
    bassG.gain.value = 0.06;
    bass.connect(bassG); bassG.connect(this.musicGain);
    bass.start();

    // Sub pad
    const pad = ctx.createOscillator();
    const padG = ctx.createGain();
    const padF = ctx.createBiquadFilter();
    pad.type = 'triangle'; pad.frequency.value = 82.5;
    padF.type = 'lowpass'; padF.frequency.value = 400;
    padG.gain.value = 0.04;
    pad.connect(padF); padF.connect(padG); padG.connect(this.musicGain);
    pad.start();

    // Shimmer with LFO
    const shimmer = ctx.createOscillator();
    const shimG = ctx.createGain();
    shimmer.type = 'sine'; shimmer.frequency.value = 110;
    shimG.gain.value = 0.025;
    shimmer.connect(shimG); shimG.connect(this.musicGain);
    shimmer.start();
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.type = 'sine'; lfo.frequency.value = 0.15;
    lfoG.gain.value = 0.015;
    lfo.connect(lfoG); lfoG.connect(shimG.gain);
    lfo.start();

    this.musicNodes = [bass, bassG, pad, padG, padF, shimmer, shimG, lfo, lfoG];

    // Procedural arpeggiator
    const arpNotes = [
      [110, 138.6, 164.8, 196, 220, 261.6, 329.6, 392],   // Am pentatonic
      [130.8, 164.8, 196, 220, 261.6, 329.6, 392, 440],    // C major pentatonic
      [146.8, 174.6, 220, 261.6, 293.7, 349.2, 440, 523.3], // D minor
      [164.8, 196, 246.9, 293.7, 329.6, 392, 493.9, 587.3], // E phrygian
    ];
    let arpIdx = 0;
    let scaleIdx = 0;

    this.arpInterval = setInterval(() => {
      if (!this.musicPlaying || !this.ctx) return;
      const speed = Math.max(120, 300 - this.currentArpLevel * 12);
      const scale = arpNotes[scaleIdx % arpNotes.length];
      const note = scale[arpIdx % scale.length];

      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = this.currentArpLevel > 10 ? 'sawtooth' : 'triangle';
      o.frequency.value = note;
      g.gain.setValueAtTime(0.04 + Math.min(this.currentArpLevel * 0.003, 0.04), ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      o.connect(g); g.connect(this.musicGain);
      o.start(); o.stop(ctx.currentTime + 0.25);

      arpIdx++;
      if (arpIdx % 16 === 0) scaleIdx++;
    }, 200);
  }

  stopMusic() {
    this.musicNodes.forEach(n => { try { if (n instanceof OscillatorNode) n.stop(); } catch {} });
    this.musicNodes = [];
    this.musicPlaying = false;
    if (this.arpInterval) { clearInterval(this.arpInterval); this.arpInterval = null; }
  }
}

// ─── SEEDED RNG ────────────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function dateSeed(): number {
  const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// ─── MAIN ──────────────────────────────────────────────────────────
async function main() {
  const container = document.getElementById('app') as HTMLDivElement;
  const world = await World.create(container, {
    xr: { offer: 'once' as const },
    input: { canvasPointerEvents: true },
    features: { grabbing: false, locomotion: false, physics: false, spatialUI: true },
    render: { near: 0.01, far: 200, camera: { position: [0, 1.6, 0], lookAt: [0, 1.5, -1.5] } },
  } as any);

  const save = loadSave();
  const audio = new AudioManager();
  audio.setVolumes(save.settings.masterVol, save.settings.sfxVol, save.settings.musicVol);

  // ─── SCENE ─────────────────────────────────────────────────────
  let currentTheme = THEMES[save.settings.themeIdx] || THEMES[0];
  world.scene.fog = new Fog(currentTheme.fog, 5, 25);
  world.scene.background = new Color(currentTheme.bg);

  const ambientLight = new AmbientLight(0xffffff, 0.3);
  world.scene.add(ambientLight);
  const dirLight = new DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(2, 4, 2);
  world.scene.add(dirLight);
  const accentLight1 = new PointLight(currentTheme.accent, 1.5, 10);
  accentLight1.position.set(-2, 2, -1);
  world.scene.add(accentLight1);
  const accentLight2 = new PointLight(0xff00ff, 1, 8);
  accentLight2.position.set(2, 3, -2);
  world.scene.add(accentLight2);

  // Floor grid
  const gridSize = 20;
  const gridGeo = new PlaneGeometry(gridSize, gridSize);
  const gridMat = new MeshBasicMaterial({ color: currentTheme.grid, transparent: true, opacity: 0.3 });
  const floor = new Mesh(gridGeo, gridMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  world.scene.add(floor);
  const floorLineGeo = new BufferGeometry();
  const floorVerts: number[] = [];
  for (let i = -gridSize / 2; i <= gridSize / 2; i += 1) {
    floorVerts.push(i, 0.001, -gridSize / 2, i, 0.001, gridSize / 2);
    floorVerts.push(-gridSize / 2, 0.001, i, gridSize / 2, 0.001, i);
  }
  floorLineGeo.setAttribute('position', new Float32BufferAttribute(floorVerts, 3));
  const floorLines = new LineSegments(floorLineGeo, new LineBasicMaterial({ color: currentTheme.grid, transparent: true, opacity: 0.15 }));
  world.scene.add(floorLines);

  // Ceiling grid
  const ceilMat = new MeshBasicMaterial({ color: currentTheme.grid, transparent: true, opacity: 0.15 });
  const ceil = new Mesh(gridGeo.clone(), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 4;
  world.scene.add(ceil);

  // Floating decorations
  const decoGroup = new Group();
  world.scene.add(decoGroup);
  const decoGeos = [new TorusGeometry(0.15, 0.04, 8, 12), new BoxGeometry(0.2, 0.2, 0.2), new SphereGeometry(0.12, 8, 6), new ConeGeometry(0.1, 0.25, 6)];
  for (let i = 0; i < 14; i++) {
    const geo = decoGeos[i % decoGeos.length];
    const mat = new MeshBasicMaterial({ color: currentTheme.accent, wireframe: true, transparent: true, opacity: 0.3 });
    const m = new Mesh(geo, mat);
    const a = (i / 14) * Math.PI * 2;
    const r = 3 + Math.random() * 4;
    m.position.set(Math.cos(a) * r, 1 + Math.random() * 2, Math.sin(a) * r - 2);
    m.userData.baseY = m.position.y;
    m.userData.phase = Math.random() * Math.PI * 2;
    m.userData.rotSpeed = 0.2 + Math.random() * 0.5;
    decoGroup.add(m);
  }

  // Ambient particles
  const particleGroup = new Group();
  world.scene.add(particleGroup);
  for (let i = 0; i < 40; i++) {
    const pg = new SphereGeometry(0.015, 4, 3);
    const pm = new MeshBasicMaterial({ color: currentTheme.accent, transparent: true, opacity: 0.4 });
    const p = new Mesh(pg, pm);
    p.position.set((Math.random() - 0.5) * 12, Math.random() * 3.5, (Math.random() - 0.5) * 12 - 2);
    p.userData.baseY = p.position.y;
    p.userData.phase = Math.random() * Math.PI * 2;
    p.userData.driftX = (Math.random() - 0.5) * 0.1;
    particleGroup.add(p);
  }

  function applyTheme(idx: number) {
    currentTheme = THEMES[idx] || THEMES[0];
    (world.scene.fog as Fog).color.set(currentTheme.fog);
    world.scene.background = new Color(currentTheme.bg);
    accentLight1.color.set(currentTheme.accent);
    gridMat.color.set(currentTheme.grid);
    floorLines.material = new LineBasicMaterial({ color: currentTheme.grid, transparent: true, opacity: 0.15 });
    ceilMat.color.set(currentTheme.grid);
    decoGroup.children.forEach(c => { (c as Mesh).material = new MeshBasicMaterial({ color: currentTheme.accent, wireframe: true, transparent: true, opacity: 0.3 }); });
    particleGroup.children.forEach(c => { ((c as Mesh).material as MeshBasicMaterial).color.set(currentTheme.accent); });
    if (borderMesh) (borderMesh.material as LineBasicMaterial).color.set(currentTheme.accent);
    // Update wall pillars
    wallPillars.forEach(p => { ((p as Mesh).material as MeshBasicMaterial).color.set(currentTheme.wall); });
  }

  // ─── GAME BOARD (3D) ──────────────────────────────────────────
  const boardGroup = new Group();
  const boardW = COLS * CELL;
  const boardH = ROWS * CELL;
  boardGroup.position.set(-boardW / 2, 0.8, -1.5);
  world.scene.add(boardGroup);

  // Board border
  const borderVerts: number[] = [];
  borderVerts.push(0, 0, 0, boardW, 0, 0);
  borderVerts.push(boardW, 0, 0, boardW, boardH, 0);
  borderVerts.push(boardW, boardH, 0, 0, boardH, 0);
  borderVerts.push(0, boardH, 0, 0, 0, 0);
  const borderGeo = new BufferGeometry();
  borderGeo.setAttribute('position', new Float32BufferAttribute(borderVerts, 3));
  const borderMesh = new LineSegments(borderGeo, new LineBasicMaterial({ color: currentTheme.accent, transparent: true, opacity: 0.6 }));
  boardGroup.add(borderMesh);

  // Board back panel
  const backPanel = new Mesh(
    new PlaneGeometry(boardW, boardH),
    new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 })
  );
  backPanel.position.set(boardW / 2, boardH / 2, -0.005);
  boardGroup.add(backPanel);

  // Grid lines on board
  const gridLineGeo = new BufferGeometry();
  const gVerts: number[] = [];
  for (let c = 0; c <= COLS; c++) gVerts.push(c * CELL, 0, 0.001, c * CELL, boardH, 0.001);
  for (let r = 0; r <= ROWS; r++) gVerts.push(0, r * CELL, 0.001, boardW, r * CELL, 0.001);
  gridLineGeo.setAttribute('position', new Float32BufferAttribute(gVerts, 3));
  const gridLines = new LineSegments(gridLineGeo, new LineBasicMaterial({ color: currentTheme.grid, transparent: true, opacity: 0.2 }));
  boardGroup.add(gridLines);

  // 3D wall pillars (left and right)
  const wallPillars: Mesh[] = [];
  const pillarH = boardH + 0.04;
  const pillarW = 0.025;
  const pillarD = CELL * 0.6;
  for (const xOff of [-pillarW / 2, boardW + pillarW / 2]) {
    const pillar = new Mesh(
      new BoxGeometry(pillarW, pillarH, pillarD),
      new MeshBasicMaterial({ color: currentTheme.wall, transparent: true, opacity: 0.5 })
    );
    pillar.position.set(xOff, pillarH / 2, 0);
    boardGroup.add(pillar);
    wallPillars.push(pillar);
  }
  // Bottom bar
  const bottomBar = new Mesh(
    new BoxGeometry(boardW + pillarW * 2, pillarW, pillarD),
    new MeshBasicMaterial({ color: currentTheme.wall, transparent: true, opacity: 0.5 })
  );
  bottomBar.position.set(boardW / 2, -pillarW / 2, 0);
  boardGroup.add(bottomBar);
  wallPillars.push(bottomBar);

  // Screen shake state
  const boardBasePos = boardGroup.position.clone();
  let shakeTimer = 0;
  let shakeIntensity = 0;

  // Block meshes
  const activeBlocks: (Mesh | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const activeEdges: (LineSegments | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

  function getBlockMesh(color: number): Mesh {
    const skin = SKINS[save.settings.skinIdx] || SKINS[0];
    const geo = new BoxGeometry(CELL * 0.92, CELL * 0.92, CELL * 0.5);
    const mat = new MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: skin.emissive * 0.4,
      roughness: skin.roughness, metalness: skin.metalness,
      transparent: true, opacity: 0.9,
    });
    return new Mesh(geo, mat);
  }
  function getEdgeMesh(color: number): LineSegments {
    const geo = new EdgesGeometry(new BoxGeometry(CELL * 0.92, CELL * 0.92, CELL * 0.5));
    return new LineSegments(geo, new LineBasicMaterial({ color, transparent: true, opacity: 0.8 }));
  }

  function placeBlock(row: number, col: number, color: number) {
    removeBlock(row, col);
    const block = getBlockMesh(color);
    block.position.set(col * CELL + CELL / 2, row * CELL + CELL / 2, 0);
    boardGroup.add(block);
    activeBlocks[row][col] = block;
    const edge = getEdgeMesh(color);
    edge.position.copy(block.position);
    boardGroup.add(edge);
    activeEdges[row][col] = edge;
  }

  function removeBlock(row: number, col: number) {
    if (activeBlocks[row]?.[col]) { boardGroup.remove(activeBlocks[row][col]!); activeBlocks[row][col] = null; }
    if (activeEdges[row]?.[col]) { boardGroup.remove(activeEdges[row][col]!); activeEdges[row][col] = null; }
  }

  // Ghost piece meshes
  const ghostMeshes: Mesh[] = [];
  function clearGhost() {
    ghostMeshes.forEach(m => boardGroup.remove(m));
    ghostMeshes.length = 0;
  }
  function drawGhost(shape: number[][], col: number, row: number, color: number) {
    clearGhost();
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const gr = row + r; const gc = col + c;
          if (gr >= 0 && gr < ROWS && gc >= 0 && gc < COLS) {
            const geo = new BoxGeometry(CELL * 0.92, CELL * 0.92, CELL * 0.5);
            const mat = new MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.25 });
            const m = new Mesh(geo, mat);
            m.position.set(gc * CELL + CELL / 2, gr * CELL + CELL / 2, 0);
            boardGroup.add(m);
            ghostMeshes.push(m);
          }
        }
      }
    }
  }

  // Current piece meshes
  const pieceMeshes: Mesh[] = [];
  const pieceEdges: LineSegments[] = [];
  function clearPieceMeshes() {
    pieceMeshes.forEach(m => boardGroup.remove(m));
    pieceEdges.forEach(m => boardGroup.remove(m));
    pieceMeshes.length = 0;
    pieceEdges.length = 0;
  }
  function drawPiece(shape: number[][], col: number, row: number, color: number) {
    clearPieceMeshes();
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const gr = row + r; const gc = col + c;
          if (gr >= 0 && gr < ROWS && gc >= 0 && gc < COLS) {
            const block = getBlockMesh(color);
            block.position.set(gc * CELL + CELL / 2, gr * CELL + CELL / 2, 0);
            boardGroup.add(block);
            pieceMeshes.push(block);
            const edge = getEdgeMesh(color);
            edge.position.copy(block.position);
            boardGroup.add(edge);
            pieceEdges.push(edge);
          }
        }
      }
    }
  }

  // Next/Hold preview groups
  const nextGroup = new Group();
  nextGroup.position.set(boardW / 2 + 0.25, boardH - 0.1, 0);
  boardGroup.add(nextGroup);
  const holdGroup = new Group();
  holdGroup.position.set(-0.25, boardH - 0.1, 0);
  boardGroup.add(holdGroup);

  function drawPreviewPiece(group: Group, type: PieceType | null) {
    while (group.children.length > 0) group.remove(group.children[0]);
    if (!type) return;
    const shape = PIECE_SHAPES[type][0];
    const color = PIECE_COLORS[type];
    const size = CELL * 0.6;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const geo = new BoxGeometry(size, size, size * 0.6);
          const mat = new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.7 });
          const m = new Mesh(geo, mat);
          m.position.set(c * size, -r * size, 0);
          group.add(m);
        }
      }
    }
  }

  // ─── PARTICLE EFFECTS ─────────────────────────────────────────
  interface Particle { mesh: Mesh; vel: Vector3; life: number; maxLife: number; }
  const particles: Particle[] = [];
  const particlePoolMax = 200;

  function spawnParticles(worldPos: Vector3, color: number, count: number) {
    for (let i = 0; i < count && particles.length < particlePoolMax; i++) {
      const geo = new SphereGeometry(0.008, 4, 3);
      const mat = new MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: AdditiveBlending });
      const m = new Mesh(geo, mat);
      m.position.copy(worldPos);
      world.scene.add(m);
      const vel = new Vector3((Math.random() - 0.5) * 2, Math.random() * 2 + 1, (Math.random() - 0.5) * 1);
      particles.push({ mesh: m, vel, life: 0.8 + Math.random() * 0.4, maxLife: 0.8 + Math.random() * 0.4 });
    }
  }

  function updateParticles(dt: number) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        world.scene.remove(p.mesh);
        particles.splice(i, 1);
        continue;
      }
      p.vel.y -= 4 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      (p.mesh.material as MeshBasicMaterial).opacity = p.life / p.maxLife;
    }
  }

  // ─── GAME STATE ───────────────────────────────────────────────
  let gameState: GameState = 'title';
  let gameMode: GameMode = 'marathon';
  let difficulty = save.settings.difficulty;

  const board: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  const boardIsGarbage: boolean[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

  let curType: PieceType = 'T';
  let curRotation = 0;
  let curCol = 3;
  let curRow = 18;
  let holdType: PieceType | null = null;
  let holdUsed = false;
  let holdUsedThisGame = false;
  let nextQueue: PieceType[] = [];
  let gameScore = 0;
  let gameLevel = 1;
  let prevGameLevel = 1;
  let gameLines = 0;
  let gameCombo = -1;
  let gameTspins = 0;
  let gameSingles = 0;
  let gameDoubles = 0;
  let gameTriples = 0;
  let gameTetrises = 0;
  let gamePerfects = 0;
  let maxCombo = 0;
  let backToBack = 0;
  let gameTimeMs = 0;
  let gamePieces = 0;
  let gameHardDrops = 0;
  let dropTimer = 0;
  let lockTimer = 0;
  let lockDelay = 0.5;
  let isLocking = false;
  let lockResets = 0;
  let dasTimer = 0;
  let dasDir = 0;
  let countdownVal = 3;
  let countdownTimer = 0;
  let lastWasDifficult = false;
  let cascadeChainCount = 0;
  let maxCascadeChain = 0;
  let rng = Math.random;
  let garbageTimer = 0;
  let garbageLinesCleared = 0;

  // Power-up state
  let powerUpQueue: PowerUpType[] = [];
  let freezeTimer = 0;
  let powerUpDisplayTimer = 0;

  // Battle mode state
  let battleGarbageTimer = 0;
  let battleGarbageSent = 0;
  let battleAISpeed = 8; // seconds between garbage sends
  let battleGarbageReceived = 0;

  // Dig mode state
  let digLinesLeft = 0;
  let digWon = false;

  // Visual: hard drop trail
  interface DropTrail { mesh: Mesh; life: number; }
  const dropTrails: DropTrail[] = [];

  // Zone system state
  let zoneMeter = 0; // 0-100
  const ZONE_METER_MAX = 100;
  const ZONE_METER_PER_LINE = 12; // ~8 lines to fill
  let zoneActive = false;
  let zoneTimer = 0;
  const ZONE_DURATION = 12; // seconds
  let zoneLinesCleared = 0;
  let zonePendingRows: number[] = []; // rows cleared during Zone, held until exit
  let gamePieceCounts: Record<string, number> = { I: 0, O: 0, T: 0, S: 0, Z: 0, J: 0, L: 0 };
  let gameActions = 0; // track total key/button presses for APM

  // Combo intensity (for border glow)
  let comboIntensity = 0;

  // Line clear animation
  let clearingLines: number[] = [];
  let clearAnimTimer = 0;
  const CLEAR_ANIM_DUR = 0.4;

  // Cascade state
  let isCascading = false;
  let cascadeSettleTimer = 0;
  const CASCADE_SETTLE_DUR = 0.3;

  // Level-up display
  let levelUpTimer = 0;

  const pieceTypes: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

  function getShape(): number[][] { return PIECE_SHAPES[curType][curRotation % PIECE_SHAPES[curType].length]; }

  function generateBag(): PieceType[] {
    const bag = [...pieceTypes];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
  }

  function nextPiece(): PieceType {
    while (nextQueue.length < 7) nextQueue.push(...generateBag());
    return nextQueue.shift()!;
  }

  function fits(shape: number[][], col: number, row: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const br = row + r; const bc = col + c;
          if (bc < 0 || bc >= COLS || br < 0 || br >= ROWS) return false;
          if (board[br][bc] !== 0) return false;
        }
      }
    }
    return true;
  }

  function getGhostRow(): number {
    const shape = getShape();
    let r = curRow;
    while (r > 0 && fits(shape, curCol, r - 1)) r--;
    return r;
  }

  function spawnPiece() {
    curType = nextPiece();
    curRotation = 0;
    const shape = getShape();
    curCol = Math.floor((COLS - shape[0].length) / 2);
    curRow = ROWS - shape.length;
    holdUsed = false;
    isLocking = false;
    lockTimer = 0;
    lockResets = 0;
    dropTimer = 0;

    if (!fits(shape, curCol, curRow)) {
      endGame();
      return;
    }
    updatePieceVisuals();
    updateNextHoldVisuals();
  }

  // ─── CASCADE MECHANICS ────────────────────────────────────────
  function applyCascadeGravity(): boolean {
    // In cascade mode, after clearing lines, blocks above gaps fall down
    let moved = false;
    for (let c = 0; c < COLS; c++) {
      let writeRow = 0;
      for (let r = 0; r < ROWS; r++) {
        if (board[r][c] !== 0) {
          if (r !== writeRow) {
            board[writeRow][c] = board[r][c];
            boardIsGarbage[writeRow][c] = boardIsGarbage[r][c];
            board[r][c] = 0;
            boardIsGarbage[r][c] = false;
            moved = true;
          }
          writeRow++;
        }
      }
      // Clear remaining rows
      for (let r = writeRow; r < ROWS; r++) {
        if (board[r][c] !== 0) {
          board[r][c] = 0;
          boardIsGarbage[r][c] = false;
          moved = true;
        }
      }
    }
    if (moved) rebuildBoardVisuals();
    return moved;
  }

  function checkCascadeClears(): number[] {
    const linesToClear: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (board[r].every(c => c !== 0)) linesToClear.push(r);
    }
    return linesToClear;
  }

  // ─── GARBAGE LINES ────────────────────────────────────────────
  function addGarbageLine() {
    // Check if top row has any blocks (would cause game over)
    if (board[ROWS - 1].some(c => c !== 0)) {
      endGame();
      return;
    }
    // Push all rows up by 1
    for (let r = ROWS - 1; r > 0; r--) {
      for (let c = 0; c < COLS; c++) {
        board[r][c] = board[r - 1][c];
        boardIsGarbage[r][c] = boardIsGarbage[r - 1][c];
      }
    }
    // Fill bottom row with garbage (one random gap)
    const gap = Math.floor(rng() * COLS);
    for (let c = 0; c < COLS; c++) {
      board[0][c] = c === gap ? 0 : 0x555555;
      boardIsGarbage[0][c] = c !== gap;
    }
    rebuildBoardVisuals();
    audio.garbage();

    // Move current piece up if needed
    const shape = getShape();
    if (!fits(shape, curCol, curRow)) {
      curRow++;
      if (!fits(shape, curCol, curRow)) {
        endGame();
        return;
      }
      updatePieceVisuals();
    }
  }

  function lockPiece() {
    const shape = getShape();
    const color = PIECE_COLORS[curType];

    // T-Spin detection
    let isTSpin = false;
    if (curType === 'T') {
      const corners = [[0, 0], [0, 2], [2, 0], [2, 2]];
      let filled = 0;
      for (const [dr, dc] of corners) {
        const br = curRow + dr; const bc = curCol + dc;
        if (br < 0 || br >= ROWS || bc < 0 || bc >= COLS || board[br][bc] !== 0) filled++;
      }
      if (filled >= 3) isTSpin = true;
    }

    // Place on board
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const br = curRow + r; const bc = curCol + c;
          if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) {
            board[br][bc] = color;
            placeBlock(br, bc, color);
          }
        }
      }
    }

    clearPieceMeshes();
    clearGhost();
    audio.lock();
    gamePieces++;
    // Track piece type counts
    gamePieceCounts[curType] = (gamePieceCounts[curType] || 0) + 1;
    if (!save.stats.pieceCounts) save.stats.pieceCounts = { I: 0, O: 0, T: 0, S: 0, Z: 0, J: 0, L: 0 };
    save.stats.pieceCounts[curType] = (save.stats.pieceCounts[curType] || 0) + 1;
    if (save.stats.pieceCounts['I'] >= 100) checkAchievement('piece_i_100');
    if (save.stats.pieceCounts['T'] >= 100) checkAchievement('piece_t_100');

    // Check for line clears
    const linesToClear: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (board[r].every(c => c !== 0)) linesToClear.push(r);
    }

    if (linesToClear.length > 0) {
      // Zone mode: bank lines instead of clearing
      if (zoneActive) {
        zoneLinesCleared += linesToClear.length;
        zonePendingRows.push(...linesToClear);

        // Remove the filled rows visually but keep board state for zone exit
        // Actually mark them as zone-banked by coloring them gold
        for (const row of linesToClear) {
          for (let c = 0; c < COLS; c++) {
            const block = activeBlocks[row]?.[c];
            if (block) {
              (block.material as MeshStandardMaterial).color.set(0xffcc00);
              (block.material as MeshStandardMaterial).emissive.set(0xffcc00);
              (block.material as MeshStandardMaterial).emissiveIntensity = 0.8;
            }
          }
        }

        // Score per zone line
        gameScore += linesToClear.length * 100 * gameLevel;
        audio.lineClear(linesToClear.length);

        const zaDoc = panelEntities.get('zoneActive')?.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
        if (zaDoc) {
          const lc = zaDoc.getElementById('zone-lines-count');
          if (lc) lc.text.value = `${zoneLinesCleared} LINES`;
        }

        // Spawn next piece without clearing
        spawnPiece();
        return; // Skip normal clear logic
      }

      // Track garbage lines cleared
      for (const row of linesToClear) {
        if (boardIsGarbage[row].some(g => g)) {
          garbageLinesCleared++;
          save.stats.garbageCleared++;
          checkAchievement('garbage_clear');
          if (save.stats.garbageCleared >= 10) checkAchievement('garbage_10');
        }
      }

      clearingLines = linesToClear;
      clearAnimTimer = CLEAR_ANIM_DUR;
      cascadeChainCount = 0;

      // Dig mode: check if all garbage is cleared
      if (gameMode === 'dig') {
        let garbageRemaining = 0;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (boardIsGarbage[r][c]) garbageRemaining++;
          }
        }
        // Account for lines about to be cleared
        for (const row of linesToClear) {
          for (let c = 0; c < COLS; c++) {
            if (boardIsGarbage[row][c]) garbageRemaining--;
          }
        }
        if (garbageRemaining <= 0) {
          digWon = true;
        }
      }

      const isDifficult = linesToClear.length >= 4 || isTSpin;
      const b2bMult = (lastWasDifficult && isDifficult) ? 1.5 : 1;

      const baseScores: Record<number, number> = { 1: 100, 2: 300, 3: 500, 4: 800 };
      let pts = (baseScores[linesToClear.length] || 100) * gameLevel;
      if (isTSpin) {
        pts *= 1.5;
        gameTspins++;
        save.stats.tspins++;
        audio.tSpin();
        const tSpinLabel = linesToClear.length >= 3 ? 'T-SPIN TRIPLE!' : linesToClear.length === 2 ? 'T-SPIN DOUBLE!' : linesToClear.length === 1 ? 'T-SPIN SINGLE!' : 'T-SPIN!';
        showLineClearText(tSpinLabel);
        checkAchievement('first_tspin');
        if (save.stats.tspins >= 10) checkAchievement('ten_tspins');
        if (save.stats.tspins >= 25) checkAchievement('twenty_five_tspins');
        if (save.stats.tspins >= 50) checkAchievement('fifty_tspins');
        if (linesToClear.length >= 3) checkAchievement('tspin_triple');
      }
      pts = Math.floor(pts * b2bMult);
      gameScore += pts;
      showScorePopup(pts);

      gameCombo++;
      if (gameCombo > 0) {
        gameScore += 50 * gameCombo * gameLevel;
        audio.combo(gameCombo);
      }
      if (gameCombo > maxCombo) maxCombo = gameCombo;

      gameLines += linesToClear.length;
      save.stats.totalLines += linesToClear.length;

      if (linesToClear.length === 1) { gameSingles++; save.stats.singles++; }
      else if (linesToClear.length === 2) { gameDoubles++; save.stats.doubles++; }
      else if (linesToClear.length === 3) { gameTriples++; save.stats.triples++; checkAchievement('triple'); }
      else if (linesToClear.length >= 4) {
        gameTetrises++;
        save.stats.tetrises++;
        checkAchievement('first_tetris');
        if (save.stats.tetrises >= 10) checkAchievement('ten_tetrises');
        if (save.stats.tetrises >= 25) checkAchievement('twenty_five_tetrises');
        if (save.stats.tetrises >= 50) checkAchievement('fifty_tetrises');
        if (save.stats.tetrises >= 100) checkAchievement('hundred_tetrises');
        // Screen shake on Tetris
        triggerShake(0.015, 0.3);
      }

      if (isDifficult) { backToBack++; } else { backToBack = 0; }
      lastWasDifficult = isDifficult;
      if (backToBack >= 3) checkAchievement('b2b_3');
      if (backToBack >= 5) checkAchievement('b2b_5');
      if (backToBack >= 7) checkAchievement('b2b_7');
      if (backToBack >= 10) checkAchievement('b2b_10');
      if (backToBack >= 15) checkAchievement('b2b_15');

      audio.lineClear(linesToClear.length);
      if (!isTSpin) {
        showLineClearText(linesToClear.length >= 4 ? 'TETRIS!' : linesToClear.length === 3 ? 'TRIPLE!' : linesToClear.length === 2 ? 'DOUBLE!' : 'SINGLE');
      }

      // Charge zone meter
      if (!zoneActive) {
        const zoneCharge = linesToClear.length * ZONE_METER_PER_LINE + (isTSpin ? 10 : 0) + (linesToClear.length >= 4 ? 8 : 0);
        zoneMeter = Math.min(ZONE_METER_MAX, zoneMeter + zoneCharge);
      }

      // Particle burst
      for (const lr of linesToClear) {
        const wp = new Vector3();
        wp.set(boardGroup.position.x + boardW / 2, boardGroup.position.y + lr * CELL + CELL / 2, boardGroup.position.z);
        spawnParticles(wp, currentTheme.accent, 10);
      }

      // Power-up: earn on combo x3+
      if (gameCombo >= 3 && gameCombo % 3 === 0) {
        const puType = POWERUP_TYPES[Math.floor(rng() * POWERUP_TYPES.length)];
        powerUpQueue.push(puType);
        checkAchievement('first_powerup');
        showToast(`Power-up: ${POWERUP_NAMES[puType]}!`);
        audio.powerUp();
      }

      // Battle mode: send garbage back when clearing 2+ lines
      if (gameMode === 'battle' && linesToClear.length >= 2) {
        const garbageToSend = linesToClear.length - 1 + (isTSpin ? 2 : 0) + Math.floor(gameCombo / 2);
        battleGarbageSent += garbageToSend;
        save.stats.garbageSent += garbageToSend;
        if (save.stats.garbageSent >= 10) checkAchievement('battle_send_10');
        if (save.stats.garbageSent >= 25) checkAchievement('battle_send_25');
      }

      // Achievements
      checkAchievement('first_clear');
      if (gameLines >= 10) checkAchievement('ten_lines');
      if (save.stats.totalLines >= 50) checkAchievement('fifty_lines');
      if (save.stats.totalLines >= 100) checkAchievement('hundred_lines');
      if (save.stats.totalLines >= 500) checkAchievement('five_hundred_lines');
      if (save.stats.totalLines >= 1000) checkAchievement('thousand_lines');
      if (save.stats.totalLines >= 2500) checkAchievement('twenty_five_hundred');

      if (gameCombo >= 5) checkAchievement('combo_5');
      if (gameCombo >= 10) checkAchievement('combo_10');
      if (gameCombo >= 15) checkAchievement('combo_15');
      if (gameCombo >= 20) checkAchievement('combo_20');
      if (gameCombo >= 25) checkAchievement('combo_25');
      if (gameCombo >= 30) checkAchievement('combo_30');

      // Level up
      if (gameMode === 'marathon' || gameMode === 'survival' || gameMode === 'classic') {
        const newLevel = Math.floor(gameLines / 10) + 1 + (difficulty === 0 ? 0 : difficulty === 2 ? 2 : 0);
        if (newLevel > gameLevel) {
          gameLevel = newLevel;
          audio.updateLevel(gameLevel);
        }
      }
    } else {
      gameCombo = -1;
      // Perfect clear check
      if (board.every(row => row.every(c => c === 0))) {
        gameScore += 3000 * gameLevel;
        gamePerfects++;
        save.stats.perfectClears++;
        checkAchievement('perfect_clear');
        if (save.stats.perfectClears >= 3) checkAchievement('perfect_3');
        if (save.stats.perfectClears >= 10) checkAchievement('perfect_10');
        showLineClearText('PERFECT CLEAR!');
        triggerShake(0.02, 0.4);
      }
      spawnPiece();
    }

    // Score achievements
    if (gameScore >= 1000) checkAchievement('score_1k');
    if (gameScore >= 10000) checkAchievement('score_10k');
    if (gameScore >= 50000) checkAchievement('score_50k');
    if (gameScore >= 100000) checkAchievement('score_100k');
    if (gameScore >= 250000) checkAchievement('score_250k');
    if (gameScore >= 500000) checkAchievement('score_500k');
    if (gameScore >= 1000000) checkAchievement('score_1m');
    if (gameLevel >= 5) { checkAchievement('level_5'); if (gameMode === 'survival') checkAchievement('survival_5'); }
    if (gameLevel >= 10) { checkAchievement('level_10'); if (gameMode === 'survival') checkAchievement('survival_10'); }
    if (gameLevel >= 15) { checkAchievement('level_15'); if (gameMode === 'survival') checkAchievement('survival_15'); }
    if (gameLevel >= 20) { checkAchievement('level_20'); if (gameMode === 'survival') checkAchievement('survival_20'); }
    if (gameLevel >= 25) checkAchievement('level_25');
    if (gameLevel >= 30) checkAchievement('level_30');

    // Speed achievement
    if (getDropInterval() < 0.1) checkAchievement('speed_20');
  }

  // ─── SCREEN SHAKE ─────────────────────────────────────────────
  function triggerShake(intensity: number, duration: number) {
    shakeIntensity = intensity;
    shakeTimer = duration;
  }

  function updateShake(dt: number) {
    if (shakeTimer > 0) {
      shakeTimer -= dt;
      const progress = shakeTimer > 0 ? shakeTimer / 0.4 : 0;
      const offset = shakeIntensity * progress;
      boardGroup.position.set(
        boardBasePos.x + (Math.random() - 0.5) * offset * 2,
        boardBasePos.y + (Math.random() - 0.5) * offset * 2,
        boardBasePos.z
      );
      if (shakeTimer <= 0) {
        boardGroup.position.copy(boardBasePos);
      }
    }
  }

  function clearLines() {
    const sorted = [...clearingLines].sort((a, b) => b - a);
    for (const row of sorted) {
      for (let c = 0; c < COLS; c++) removeBlock(row, c);
      board.splice(row, 1);
      board.push(Array(COLS).fill(0));
      boardIsGarbage.splice(row, 1);
      boardIsGarbage.push(Array(COLS).fill(false));
    }
    rebuildBoardVisuals();
    clearingLines = [];

    // Sprint: check win
    if (gameMode === 'sprint' && gameLines >= 40) { endGame(); return; }

    // Dig: check win (all garbage cleared)
    if (gameMode === 'dig' && digWon) {
      audio.digWin();
      endGame();
      return;
    }

    // Activate queued power-ups after line clear
    if (powerUpQueue.length > 0) activatePowerUp();

    // Cascade mode: apply gravity and check for chain clears
    if (gameMode === 'cascade') {
      const moved = applyCascadeGravity();
      if (moved) {
        const newClears = checkCascadeClears();
        if (newClears.length > 0) {
          cascadeChainCount++;
          if (cascadeChainCount > maxCascadeChain) maxCascadeChain = cascadeChainCount;
          if (cascadeChainCount > (save.stats.bestCascade || 0)) save.stats.bestCascade = cascadeChainCount;

          // Cascade bonus scoring
          const cascadeBonus = 200 * cascadeChainCount * gameLevel;
          gameScore += cascadeBonus;
          gameLines += newClears.length;
          save.stats.totalLines += newClears.length;

          audio.cascade();
          showLineClearText(`CASCADE x${cascadeChainCount}!`);

          if (cascadeChainCount >= 3) checkAchievement('cascade_chain');
          if (cascadeChainCount >= 5) checkAchievement('cascade_5');
          if (cascadeChainCount >= 7) checkAchievement('cascade_7');

          // Trigger cascade animation
          clearingLines = newClears;
          clearAnimTimer = CLEAR_ANIM_DUR;
          isCascading = true;

          // Particles for cascade
          for (const lr of newClears) {
            const wp = new Vector3();
            wp.set(boardGroup.position.x + boardW / 2, boardGroup.position.y + lr * CELL + CELL / 2, boardGroup.position.z);
            spawnParticles(wp, 0xffaa00, 12);
          }
          return; // Don't spawn next piece yet
        }
      }
    }

    isCascading = false;
    cascadeChainCount = 0;
    spawnPiece();
  }

  function rebuildBoardVisuals() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        removeBlock(r, c);
        if (board[r][c] !== 0) placeBlock(r, c, board[r][c]);
      }
    }
  }

  function getDropInterval(): number {
    // Classic mode: NES-style gravity curve (faster than normal)
    if (gameMode === 'classic') {
      const classicSpeeds: Record<number, number> = { 1: 0.8, 2: 0.72, 3: 0.63, 4: 0.55, 5: 0.47, 6: 0.38, 7: 0.3, 8: 0.22, 9: 0.17, 10: 0.1, 11: 0.1, 12: 0.1, 13: 0.08, 14: 0.08, 15: 0.08, 16: 0.07, 17: 0.07, 18: 0.07, 19: 0.05, 20: 0.03 };
      return classicSpeeds[Math.min(gameLevel, 20)] || 0.03;
    }
    const base = gameMode === 'zen' ? 999 : (difficulty === 0 ? 1.2 : difficulty === 2 ? 0.6 : 0.8);
    const speedup = gameMode === 'survival' || gameMode === 'battle' ? 0.06 : 0.04;
    const interval = Math.max(0.05, base - (gameLevel - 1) * speedup);
    return freezeTimer > 0 ? interval * 2 : zoneActive ? interval * 3 : interval;
  }

  // ─── POWER-UP ACTIVATION ──────────────────────────────────────
  function activatePowerUp() {
    if (powerUpQueue.length === 0) return;
    const pu = powerUpQueue.shift()!;
    save.stats.powerUpsUsed++;
    if (save.stats.powerUpsUsed >= 10) checkAchievement('powerup_10');
    if (save.stats.powerUpsUsed >= 25) checkAchievement('powerup_25');

    const puEntity = panelEntities.get('powerup');
    if (puEntity) {
      puEntity.object3D.visible = true;
      powerUpDisplayTimer = 1.5;
      const doc = puEntity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (doc) { const el = doc.getElementById('pu-name'); if (el) el.text.value = POWERUP_NAMES[pu]; }
    }

    switch (pu) {
      case 'bomb': {
        checkAchievement('powerup_bomb');
        // Clear bottom 3 rows
        for (let r = 0; r < Math.min(3, ROWS); r++) {
          for (let c = 0; c < COLS; c++) {
            if (board[r][c] !== 0) {
              const wp = new Vector3();
              wp.set(boardGroup.position.x + c * CELL + CELL / 2, boardGroup.position.y + r * CELL + CELL / 2, boardGroup.position.z);
              spawnParticles(wp, 0xff4400, 3);
            }
            board[r][c] = 0;
            boardIsGarbage[r][c] = false;
          }
        }
        triggerShake(0.02, 0.4);
        rebuildBoardVisuals();
        break;
      }
      case 'laser': {
        checkAchievement('powerup_laser');
        // Clear the lowest non-empty row
        for (let r = 0; r < ROWS; r++) {
          if (board[r].some(c => c !== 0)) {
            for (let c = 0; c < COLS; c++) {
              board[r][c] = 0;
              boardIsGarbage[r][c] = false;
            }
            const wp = new Vector3();
            wp.set(boardGroup.position.x + boardW / 2, boardGroup.position.y + r * CELL + CELL / 2, boardGroup.position.z);
            spawnParticles(wp, 0x00ff88, 15);
            gameLines++;
            save.stats.totalLines++;
            break;
          }
        }
        rebuildBoardVisuals();
        break;
      }
      case 'freeze': {
        checkAchievement('powerup_freeze');
        freezeTimer = 10; // 10 seconds of halved drop speed
        break;
      }
    }
    audio.powerUp();
  }

  // ─── ZONE SYSTEM ──────────────────────────────────────────────
  function activateZone() {
    if (zoneActive || zoneMeter < ZONE_METER_MAX || gameState !== 'playing') return;
    zoneActive = true;
    zoneTimer = ZONE_DURATION;
    zoneLinesCleared = 0;
    zonePendingRows = [];
    zoneMeter = 0;

    save.stats.zoneActivations++;
    checkAchievement('first_zone');
    if (save.stats.zoneActivations >= 5) checkAchievement('zone_5');
    if (save.stats.zoneActivations >= 10) checkAchievement('zone_10');
    if (save.stats.zoneActivations >= 25) checkAchievement('zone_25');

    audio.powerUp();
    showLineClearText('⚡ ZONE ⚡');
    triggerShake(0.01, 0.3);

    // Show zone active panel
    const zaEntity = panelEntities.get('zoneActive');
    if (zaEntity) zaEntity.object3D.visible = true;
    // Hide zone meter
    const zmEntity = panelEntities.get('zoneMeter');
    if (zmEntity) zmEntity.object3D.visible = false;
  }

  function deactivateZone() {
    if (!zoneActive) return;
    zoneActive = false;

    // Score: all zone lines clear simultaneously
    if (zoneLinesCleared > 0) {
      // Named clears for zone: Decahexatris (16), Dodecatris (12), Octotris (8)
      const zoneNames: Record<number, string> = {
        1: 'Single', 2: 'Double', 3: 'Triple', 4: 'Tetris',
        5: 'Pentris', 6: 'Hexatris', 7: 'Heptatris', 8: 'Octotris',
        9: 'Enneatris', 10: 'Decatris', 11: 'Hendecatris', 12: 'Dodecatris',
        13: 'Triskaidecatris', 14: 'Tetrakaidecatris', 15: 'Pentadecatris', 16: 'DECAHEXATRIS',
      };
      const clearName = zoneNames[Math.min(zoneLinesCleared, 16)] || `${zoneLinesCleared}-LINE`;
      showLineClearText(`ZONE ${clearName}!`);

      // Zone scoring: exponential bonus
      const zoneBonus = Math.floor(100 * Math.pow(zoneLinesCleared, 1.8) * gameLevel);
      gameScore += zoneBonus;

      // Achievements
      if (zoneLinesCleared >= 5) checkAchievement('zone_lines_5');
      if (zoneLinesCleared >= 8) checkAchievement('zone_lines_8');
      if (zoneLinesCleared >= 12) checkAchievement('zone_lines_12');
      if (zoneLinesCleared >= 16) { checkAchievement('zone_lines_16'); checkAchievement('zone_decahexatris'); }
      if (zoneLinesCleared > save.stats.bestZoneLines) save.stats.bestZoneLines = zoneLinesCleared;

      // Big screen shake and particles
      triggerShake(0.025 + zoneLinesCleared * 0.002, 0.5);
      for (const row of zonePendingRows) {
        const wp = new Vector3();
        wp.set(boardGroup.position.x + boardW / 2, boardGroup.position.y + row * CELL + CELL / 2, boardGroup.position.z);
        spawnParticles(wp, 0xffcc00, 15);
      }

      // Now actually clear the zone rows
      const sorted = [...new Set(zonePendingRows)].sort((a, b) => b - a);
      for (const row of sorted) {
        for (let c = 0; c < COLS; c++) removeBlock(row, c);
        board.splice(row, 1);
        board.push(Array(COLS).fill(0));
        boardIsGarbage.splice(row, 1);
        boardIsGarbage.push(Array(COLS).fill(false));
      }
      rebuildBoardVisuals();

      gameLines += zoneLinesCleared;
      save.stats.totalLines += zoneLinesCleared;

      // Zone perfect: board empty after zone
      if (board.every(row => row.every(c => c === 0))) {
        checkAchievement('zone_perfect');
        gameScore += 5000 * gameLevel;
        showLineClearText('ZONE PERFECT!');
      }

      audio.lineClear(Math.min(zoneLinesCleared, 4));
    }

    // Hide zone active panel
    const zaEntity = panelEntities.get('zoneActive');
    if (zaEntity) zaEntity.object3D.visible = false;
    // Show zone meter if playing
    const zmEntity = panelEntities.get('zoneMeter');
    if (zmEntity && gameState === 'playing') zmEntity.object3D.visible = true;

    zonePendingRows = [];
    zoneLinesCleared = 0;
    writeSave(save);
  }

  // ─── DROP TRAIL VFX ────────────────────────────────────────────
  function spawnDropTrail(col: number, fromRow: number, toRow: number, color: number) {
    const trailCount = Math.min(fromRow - toRow, 6);
    for (let i = 0; i < trailCount; i++) {
      const r = toRow + i;
      if (r < 0 || r >= ROWS) continue;
      const geo = new BoxGeometry(CELL * 0.6, CELL * 0.3, CELL * 0.1);
      const mat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: AdditiveBlending });
      const m = new Mesh(geo, mat);
      m.position.set(
        boardGroup.position.x + col * CELL + CELL / 2,
        boardGroup.position.y + r * CELL + CELL / 2,
        boardGroup.position.z + 0.01
      );
      world.scene.add(m);
      dropTrails.push({ mesh: m, life: 0.2 + i * 0.05 });
    }
  }

  function updateDropTrails(dt: number) {
    for (let i = dropTrails.length - 1; i >= 0; i--) {
      const t = dropTrails[i];
      t.life -= dt;
      if (t.life <= 0) { world.scene.remove(t.mesh); dropTrails.splice(i, 1); continue; }
      (t.mesh.material as MeshBasicMaterial).opacity = t.life * 2;
    }
  }

  function hardDrop() {
    const shape = getShape();
    let dropped = 0;
    while (fits(shape, curCol, curRow - 1)) { curRow--; dropped++; }
    gameScore += dropped * 2;
    gameHardDrops++;
    gameActions++;
    save.stats.hardDrops++;
    // Drop trail VFX
    if (dropped > 2) {
      const shape = getShape();
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) spawnDropTrail(curCol + c, curRow + dropped + r, curRow + r, PIECE_COLORS[curType]);
        }
      }
    }
    if (save.stats.hardDrops >= 100) checkAchievement('hard_drop_100');
    if (save.stats.hardDrops >= 500) checkAchievement('hard_drop_500');
    if (save.stats.hardDrops >= 1000) checkAchievement('hard_drop_1000');
    audio.drop();
    lockPiece();
  }

  function softDrop() {
    const shape = getShape();
    if (fits(shape, curCol, curRow - 1)) {
      curRow--;
      gameScore++;
      isLocking = false;
      lockTimer = 0;
      updatePieceVisuals();
    }
  }

  function movePiece(dir: number) {
    const shape = getShape();
    if (fits(shape, curCol + dir, curRow)) {
      curCol += dir;
      if (isLocking && lockResets < 15) { lockTimer = 0; lockResets++; }
      audio.move();
      gameActions++;
      updatePieceVisuals();
    }
  }

  function rotatePiece(dir: number) {
    const numRots = PIECE_SHAPES[curType].length;
    if (numRots <= 1) return;
    const newRot = ((curRotation + dir) % numRots + numRots) % numRots;
    const newShape = PIECE_SHAPES[curType][newRot];

    // Classic mode: no wall kicks, just try basic rotation
    if (gameMode === 'classic') {
      if (fits(newShape, curCol, curRow)) {
        curRotation = newRot;
        if (isLocking && lockResets < 15) { lockTimer = 0; lockResets++; }
        audio.rotate();
        gameActions++;
        updatePieceVisuals();
      }
      return;
    }

    const kicks = curType === 'I' ? KICK_I : KICK_JLSTZ;
    const kickIdx = dir > 0 ? curRotation : ((curRotation - 1 + numRots) % numRots);
    const kickData = kicks[kickIdx % kicks.length];

    for (const [dx, dy] of kickData) {
      const kx = dir > 0 ? dx : -dx;
      const ky = dir > 0 ? dy : -dy;
      if (fits(newShape, curCol + kx, curRow + ky)) {
        curCol += kx;
        curRow += ky;
        curRotation = newRot;
        if (isLocking && lockResets < 15) { lockTimer = 0; lockResets++; }
        audio.rotate();
        gameActions++;
        updatePieceVisuals();
        return;
      }
    }
  }

  function holdPiece() {
    if (holdUsed) return;
    if (gameMode === 'classic') return; // No hold in Classic mode
    holdUsed = true;
    holdUsedThisGame = true;
    save.stats.holdUsedCount++;
    checkAchievement('first_hold');
    clearPieceMeshes();
    clearGhost();
    if (holdType === null) {
      holdType = curType;
      spawnPiece();
    } else {
      const tmp = holdType;
      holdType = curType;
      curType = tmp;
      curRotation = 0;
      const shape = getShape();
      curCol = Math.floor((COLS - shape[0].length) / 2);
      curRow = ROWS - shape.length;
      isLocking = false;
      lockTimer = 0;
      lockResets = 0;
      updatePieceVisuals();
    }
    audio.hold();
    updateNextHoldVisuals();
  }

  function updatePieceVisuals() {
    const shape = getShape();
    const color = PIECE_COLORS[curType];
    drawPiece(shape, curCol, curRow, color);
    const ghostRow = getGhostRow();
    if (ghostRow !== curRow && save.settings.ghostVisible && gameMode !== 'classic') drawGhost(shape, curCol, ghostRow, color);
    else clearGhost();
  }

  function updateNextHoldVisuals() {
    while (nextQueue.length < 4) nextQueue.push(...generateBag());
    while (nextGroup.children.length) nextGroup.remove(nextGroup.children[0]);
    for (let i = 0; i < 3; i++) {
      const previewG = new Group();
      previewG.position.set(0, -i * CELL * 3.5, 0);
      drawPreviewPiece(previewG, nextQueue[i]);
      nextGroup.add(previewG);
    }
    while (holdGroup.children.length) holdGroup.remove(holdGroup.children[0]);
    if (holdType) drawPreviewPiece(holdGroup, holdType);
  }

  // ─── UI PANELS ────────────────────────────────────────────────
  const panelEntities: Map<string, any> = new Map();

  function createPanel(id: string, config: string, opts: { follower?: boolean; screenSpace?: boolean; width?: number; height?: number; ssWidth?: string; ssBottom?: string; ssRight?: string; ssLeft?: string; }) {
    const entity = world.createTransformEntity(undefined, { persistent: true });
    entity.object3D.visible = false;
    entity.addComponent(PanelUI, { config, maxWidth: opts.width || 0.8, maxHeight: opts.height || 1.0 });

    if (opts.follower) {
      entity.addComponent(Follower, {
        target: world.player.head,
        offsetPosition: [0, -0.1, -0.6],
        behavior: FollowBehavior.PivotY,
        speed: 5, tolerance: 0.3,
      });
    } else if (opts.screenSpace) {
      entity.addComponent(ScreenSpace, {
        width: opts.ssWidth || '40vw', height: 'auto',
        bottom: opts.ssBottom || '24px', right: opts.ssRight,
        left: opts.ssLeft, zOffset: 0.25,
      });
    } else {
      entity.object3D.position.set(0, 1.5, -2);
    }

    panelEntities.set(id, entity);
    return entity;
  }

  // Create all panels (17 total)
  createPanel('title', '/ui/main-menu.json', { width: 0.7, height: 0.9 });
  createPanel('modeSelect', '/ui/mode-select.json', { width: 0.6, height: 0.9 });
  createPanel('difficulty', '/ui/difficulty.json', { width: 0.5, height: 0.6 });
  createPanel('hud', '/ui/hud.json', { follower: true, width: 0.6, height: 0.08 });
  createPanel('nextHold', '/ui/next-hold.json', { screenSpace: true, ssWidth: '12vw', ssBottom: '120px', ssRight: '24px', width: 0.15, height: 0.3 });
  createPanel('pause', '/ui/pause-menu.json', { width: 0.5, height: 0.5 });
  createPanel('gameOver', '/ui/game-over.json', { width: 0.6, height: 0.9 });
  createPanel('leaderboard', '/ui/leaderboard.json', { width: 0.7, height: 0.9 });
  createPanel('achievements', '/ui/achievements.json', { width: 0.7, height: 0.9 });
  createPanel('stats', '/ui/stats.json', { width: 0.6, height: 1.0 });
  createPanel('settings', '/ui/settings.json', { width: 0.6, height: 0.7 });
  createPanel('help', '/ui/help.json', { width: 0.6, height: 1.0 });
  createPanel('skins', '/ui/skins.json', { width: 0.6, height: 0.8 });
  createPanel('toast', '/ui/toast.json', { follower: true, width: 0.3, height: 0.06 });
  createPanel('countdown', '/ui/countdown.json', { follower: true, width: 0.15, height: 0.15 });
  createPanel('lineClear', '/ui/line-clear.json', { follower: true, width: 0.3, height: 0.08 });
  createPanel('levelUp', '/ui/level-up.json', { follower: true, width: 0.3, height: 0.08 });
  createPanel('powerup', '/ui/powerup.json', { follower: true, width: 0.25, height: 0.06 });
  createPanel('zoneMeter', '/ui/zone-meter.json', { screenSpace: true, ssWidth: '10vw', ssBottom: '24px', ssLeft: '24px', width: 0.12, height: 0.12 });
  createPanel('zoneActive', '/ui/zone-active.json', { follower: true, width: 0.35, height: 0.12 });
  createPanel('pieceStats', '/ui/piece-stats.json', { screenSpace: true, ssWidth: '8vw', ssBottom: '200px', ssLeft: '24px', width: 0.1, height: 0.25 });
  createPanel('scorePopup', '/ui/score-popup.json', { follower: true, width: 0.25, height: 0.06 });

  function showPanel(id: string) {
    panelEntities.forEach((e, key) => { e.object3D.visible = key === id; });
  }
  function showPanels(...ids: string[]) {
    panelEntities.forEach((e, key) => { e.object3D.visible = ids.includes(key); });
  }
  function hideAll() { panelEntities.forEach(e => { e.object3D.visible = false; }); }

  // Toast
  let toastTimer = 0;
  const toastQueue: string[] = [];
  function showToast(msg: string) { toastQueue.push(msg); }
  function updateToast(dt: number) {
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) panelEntities.get('toast')!.object3D.visible = false;
    }
    if (toastTimer <= 0 && toastQueue.length > 0) {
      const msg = toastQueue.shift()!;
      const entity = panelEntities.get('toast')!;
      entity.object3D.visible = true;
      toastTimer = 2;
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (doc) { const el = doc.getElementById('toast-msg'); if (el) el.text.value = msg; }
    }
  }

  // Line clear display
  let lineClearTimer = 0;
  function showLineClearText(text: string) {
    const entity = panelEntities.get('lineClear')!;
    entity.object3D.visible = true;
    lineClearTimer = 1.5;
    const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (doc) { const el = doc.getElementById('line-clear-text'); if (el) el.text.value = text; }
  }

  // Score popup display
  let scorePopupTimer = 0;
  function showScorePopup(points: number) {
    const entity = panelEntities.get('scorePopup');
    if (!entity) return;
    entity.object3D.visible = true;
    scorePopupTimer = 1.2;
    const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (doc) { const el = doc.getElementById('score-popup-text'); if (el) el.text.value = `+${fmtNum(points)}`; }
  }

  // Level up display
  function showLevelUp(level: number) {
    const entity = panelEntities.get('levelUp')!;
    entity.object3D.visible = true;
    levelUpTimer = 2;
    const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (doc) { const el = doc.getElementById('lvl-text'); if (el) el.text.value = `LEVEL ${level}!`; }
    audio.levelUp();
    triggerShake(0.008, 0.2);
  }

  // ─── ACHIEVEMENT CHECK ────────────────────────────────────────
  function checkAchievement(id: string) {
    if (save.achievements.includes(id)) return;
    save.achievements.push(id);
    writeSave(save);
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (ach) {
      showToast(`${ach.name}: ${ach.desc}`);
      audio.achievement();
    }
  }

  // ─── ACHIEVEMENT PAGE ─────────────────────────────────────────
  let achievePage = 0;
  function updateAchievementsPanel() {
    const entity = panelEntities.get('achievements')!;
    const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (!doc) return;
    const perPage = 15;
    const maxPage = Math.max(1, Math.ceil(ACHIEVEMENTS.length / perPage));
    if (achievePage >= maxPage) achievePage = maxPage - 1;
    const start = achievePage * perPage;
    for (let i = 0; i < perPage; i++) {
      const idx = start + i;
      const a = ACHIEVEMENTS[idx];
      const c = doc.getElementById(`a-c${i + 1}`);
      const n = doc.getElementById(`a-n${i + 1}`);
      const d = doc.getElementById(`a-d${i + 1}`);
      if (c) c.text.value = a ? (save.achievements.includes(a.id) ? '[X]' : '[ ]') : '';
      if (n) n.text.value = a ? a.name : '';
      if (d) d.text.value = a ? a.desc : '';
    }
    const pi = doc.getElementById('page-info');
    if (pi) pi.text.value = `${achievePage + 1}/${maxPage}`;
  }

  // ─── LEADERBOARD ──────────────────────────────────────────────
  let lbFilterMode: string = 'ALL';
  const lbModes = ['ALL', 'marathon', 'sprint', 'ultra', 'survival', 'zen', 'blitz', 'daily', 'cascade', 'dig', 'battle', 'classic'];
  let lbModeIdx = 0;

  function updateLeaderboardPanel() {
    const entity = panelEntities.get('leaderboard')!;
    const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (!doc) return;
    const filtered = lbFilterMode === 'ALL' ? save.leaderboard : save.leaderboard.filter(e => e.mode === lbFilterMode);
    const lb = filtered.slice(0, 10);
    for (let i = 0; i < 10; i++) {
      const entry = lb[i];
      const s = doc.getElementById(`lb-s${i + 1}`);
      const m = doc.getElementById(`lb-m${i + 1}`);
      if (s) s.text.value = entry ? `${fmtNum(entry.score)}` : '-';
      if (m) m.text.value = entry ? `${entry.mode} L${entry.level}` : '-';
    }
    const modeLabel = doc.getElementById('lb-filter-mode');
    if (modeLabel) modeLabel.text.value = lbFilterMode === 'ALL' ? 'ALL' : lbFilterMode.toUpperCase();
  }

  // ─── STATS PANEL ──────────────────────────────────────────────
  function updateStatsPanel() {
    const entity = panelEntities.get('stats')!;
    const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (!doc) return;
    const s = save.stats;
    const setText = (id: string, val: string) => { const el = doc.getElementById(id); if (el) el.text.value = val; };
    setText('st-games', `${fmtNum(s.games)}`);
    setText('st-total-score', `${fmtNum(s.totalScore)}`);
    setText('st-best-score', `${fmtNum(s.bestScore)}`);
    setText('st-total-lines', `${fmtNum(s.totalLines)}`);
    setText('st-best-level', `${s.bestLevel}`);
    setText('st-playtime', `${Math.floor(s.playTimeMs / 60000)}m`);
    setText('st-player-level', `${save.playerLevel}`);
    setText('st-singles', `${fmtNum(s.singles || 0)}`);
    setText('st-doubles', `${fmtNum(s.doubles || 0)}`);
    setText('st-triples', `${fmtNum(s.triples || 0)}`);
    setText('st-tetrises', `${fmtNum(s.tetrises)}`);
    setText('st-tspins', `${fmtNum(s.tspins)}`);
    setText('st-perfects', `${fmtNum(s.perfectClears || 0)}`);
    setText('st-best-combo', `${s.bestCombo}`);
    setText('st-pieces', `${fmtNum(s.piecesPlaced)}`);
    setText('st-hard-drops', `${fmtNum(s.hardDrops || 0)}`);
    setText('st-best-cascade', `${s.bestCascade || 0}`);
    setText('st-achievements', `${save.achievements.length}/${ACHIEVEMENTS.length}`);
    setText('st-zone-uses', `${fmtNum(save.stats.zoneActivations || 0)}`);
    setText('st-zone-best', `${save.stats.bestZoneLines || 0}`);
    setText('st-sprint-pb', save.stats.sprintBestMs > 0 ? fmtTime(save.stats.sprintBestMs) : '-');
    setText('st-dig-pb', save.stats.digBestMs > 0 ? fmtTime(save.stats.digBestMs) : '-');
  }

  // ─── SETTINGS PANEL ──────────────────────────────────────────
  function updateSettingsPanel() {
    const entity = panelEntities.get('settings')!;
    const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (!doc) return;
    const setText = (id: string, val: string) => { const el = doc.getElementById(id); if (el) el.text.value = val; };
    setText('vol-master', `${save.settings.masterVol}`);
    setText('vol-sfx', `${save.settings.sfxVol}`);
    setText('vol-music', `${save.settings.musicVol}`);
    setText('theme-name', THEMES[save.settings.themeIdx]?.name || 'Neon');
    setText('ghost-val', save.settings.ghostVisible ? 'ON' : 'OFF');
    setText('das-val', DAS_LEVELS[save.settings.dasLevel]?.name || 'Normal');
  }

  // ─── HUD UPDATE ──────────────────────────────────────────────
  function updateHUD() {
    const entity = panelEntities.get('hud')!;
    const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (!doc) return;
    const setText = (id: string, val: string) => { const el = doc.getElementById(id); if (el) el.text.value = val; };
    setText('hud-score', `${fmtNum(gameScore)}`);
    setText('hud-level', `${gameLevel}`);
    setText('hud-lines', `${fmtNum(gameLines)}`);
    setText('hud-combo', gameCombo > 0 ? `x${gameCombo}` : '0');
    const secs = Math.floor(gameTimeMs / 1000);
    const mins = Math.floor(secs / 60);
    setText('hud-time', `${mins}:${(secs % 60).toString().padStart(2, '0')}`);
    setText('hud-mode', gameMode.toUpperCase());
    setText('hud-b2b', backToBack > 0 ? `x${backToBack}` : '-');
  }

  function updateNextHoldPanel() {
    const entity = panelEntities.get('nextHold')!;
    const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (!doc) return;
    while (nextQueue.length < 4) nextQueue.push(...generateBag());
    for (let i = 0; i < 3; i++) {
      const el = doc.getElementById(`next-${i + 1}`);
      if (el) el.text.value = nextQueue[i] || '-';
    }
    const hEl = doc.getElementById('hold-piece');
    if (hEl) hEl.text.value = holdType || '-';
  }

  // ─── TITLE PANEL ─────────────────────────────────────────────
  function updateTitlePanel() {
    const entity = panelEntities.get('title')!;
    const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (!doc) return;
    const lv = doc.getElementById('player-level');
    if (lv) lv.text.value = `${save.playerLevel}`;
    const tt = doc.getElementById('player-title');
    if (tt) tt.text.value = PLAYER_TITLES[Math.min(save.playerLevel - 1, PLAYER_TITLES.length - 1)];
  }

  // ─── GAME START/END ───────────────────────────────────────────
  function startGame() {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { board[r][c] = 0; boardIsGarbage[r][c] = false; removeBlock(r, c); }
    clearPieceMeshes(); clearGhost();
    nextQueue = [];
    holdType = null; holdUsed = false; holdUsedThisGame = false;
    gameScore = 0; gameLines = 0; gameCombo = -1; gameTspins = 0;
    gameSingles = 0; gameDoubles = 0; gameTriples = 0; gameTetrises = 0; gamePerfects = 0;
    maxCombo = 0; backToBack = 0; lastWasDifficult = false;
    gameTimeMs = 0; gamePieces = 0; gameHardDrops = 0;
    cascadeChainCount = 0; maxCascadeChain = 0;
    garbageTimer = 0; garbageLinesCleared = 0;
    isCascading = false;
    powerUpQueue = [];
    freezeTimer = 0;
    battleGarbageTimer = 0;
    battleGarbageSent = 0;
    battleAISpeed = 8;
    battleGarbageReceived = 0;
    digLinesLeft = 0;
    digWon = false;
    comboIntensity = 0;
    zoneMeter = 0;
    zoneActive = false;
    zoneTimer = 0;
    zoneLinesCleared = 0;
    zonePendingRows = [];
    gamePieceCounts = { I: 0, O: 0, T: 0, S: 0, Z: 0, J: 0, L: 0 };
    gameActions = 0;
    gameLevel = difficulty === 0 ? 1 : difficulty === 2 ? 3 : 1;
    prevGameLevel = gameLevel;
    lockTimer = 0; isLocking = false; lockResets = 0;
    audio.updateLevel(gameLevel);

    if (gameMode === 'daily') {
      rng = mulberry32(dateSeed());
    } else {
      rng = Math.random;
    }

    boardGroup.visible = true;

    // Dig mode: place preset garbage
    if (gameMode === 'dig') {
      const garbage = generateDigGarbage(rng);
      for (let r = 0; r < garbage.length; r++) {
        for (let c = 0; c < COLS; c++) {
          if (c !== garbage[r].gap) {
            board[r][c] = garbage[r].color;
            boardIsGarbage[r][c] = true;
            placeBlock(r, c, garbage[r].color);
          }
        }
      }
      digLinesLeft = garbage.length;
    }

    gameState = 'countdown';
    countdownVal = 3;
    countdownTimer = 1;
    showPanel('countdown');
    const cdDoc = panelEntities.get('countdown')!.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (cdDoc) { const el = cdDoc.getElementById('cd-value'); if (el) el.text.value = '3'; }
    audio.countdown();
  }

  function beginPlaying() {
    gameState = 'playing';
    showPanels('hud', 'nextHold', 'zoneMeter', 'pieceStats');
    spawnPiece();
    audio.startMusic();
  }

  function endGame() {
    if (zoneActive) deactivateZone();
    gameState = 'gameOver';
    clearPieceMeshes(); clearGhost();
    audio.gameOver();
    audio.stopMusic();
    boardGroup.visible = false;

    save.stats.games++;
    save.stats.totalScore += gameScore;
    const isNewBest = gameScore > save.stats.bestScore;
    if (isNewBest) save.stats.bestScore = gameScore;

    // Dig mode stats
    if (gameMode === 'dig' && digWon) {
      checkAchievement('dig_clear');
      if (gameTimeMs < 60000) checkAchievement('dig_under_60');
      if (gameTimeMs < 30000) checkAchievement('dig_under_30');
      if (gameTimeMs < 20000) checkAchievement('dig_under_20');
      if (save.stats.digBestMs === 0 || gameTimeMs < save.stats.digBestMs) save.stats.digBestMs = gameTimeMs;
    }

    // Sprint PB
    if (gameMode === 'sprint' && gameLines >= 40) {
      if (save.stats.sprintBestMs === 0 || gameTimeMs < save.stats.sprintBestMs) save.stats.sprintBestMs = gameTimeMs;
    }

    // Battle mode stats
    if (gameMode === 'battle') {
      if (gameTimeMs >= 60000) checkAchievement('battle_1min');
      if (gameTimeMs >= 180000) checkAchievement('battle_3min');
      if (gameTimeMs >= 300000) checkAchievement('battle_5min');
      if (gameTimeMs >= 600000) checkAchievement('battle_10min');
      if (save.stats.battleBestMs === 0 || gameTimeMs > save.stats.battleBestMs) save.stats.battleBestMs = gameTimeMs;
    }

    // Classic mode achievements
    if (gameMode === 'classic') {
      if (gameLevel >= 10) checkAchievement('classic_clear');
      if (gameScore >= 10000) checkAchievement('classic_10k');
      if (gameScore >= 50000) checkAchievement('classic_50k');
      if (gameScore >= 100000) checkAchievement('classic_100k');
      if (gameLevel >= 15 && gameTspins === 0) checkAchievement('classic_no_tspin');
      if (gameScore > (save.stats.classicBestScore || 0)) save.stats.classicBestScore = gameScore;
    }
    if (gameLevel > save.stats.bestLevel) save.stats.bestLevel = gameLevel;
    if (maxCombo > save.stats.bestCombo) save.stats.bestCombo = maxCombo;
    save.stats.playTimeMs += gameTimeMs;
    save.stats.piecesPlaced += gamePieces;
    if (!save.stats.modesPlayed.includes(gameMode)) save.stats.modesPlayed.push(gameMode);

    // XP
    const xpEarned = Math.floor(gameScore / 10) + gameLines * 5 + gamePieces * 2;
    save.xp += xpEarned;
    const xpPerLevel = (lv: number) => 100 + lv * 50;
    while (save.xp >= xpPerLevel(save.playerLevel) && save.playerLevel < 20) {
      save.xp -= xpPerLevel(save.playerLevel);
      save.playerLevel++;
    }

    // Leaderboard
    save.leaderboard.push({ score: gameScore, mode: gameMode, level: gameLevel, lines: gameLines, date: new Date().toISOString().slice(0, 10) });
    save.leaderboard.sort((a, b) => b.score - a.score);
    if (save.leaderboard.length > 20) save.leaderboard = save.leaderboard.slice(0, 20);

    // Achievements
    if (save.stats.games >= 10) checkAchievement('games_10');
    if (save.stats.games >= 50) checkAchievement('games_50');
    if (save.stats.games >= 100) checkAchievement('games_100');
    if (save.stats.games >= 500) checkAchievement('games_500');
    if (save.stats.piecesPlaced >= 100) checkAchievement('pieces_100');
    if (save.stats.piecesPlaced >= 1000) checkAchievement('pieces_1000');
    if (save.stats.piecesPlaced >= 5000) checkAchievement('pieces_5000');
    if (save.stats.piecesPlaced >= 10000) checkAchievement('pieces_10000');
    if (gameMode === 'sprint' && gameLines >= 40) {
      checkAchievement('sprint_clear');
      if (gameTimeMs < 120000) checkAchievement('sprint_under_2');
      if (gameTimeMs < 90000) checkAchievement('sprint_under_90');
      if (gameTimeMs < 60000) checkAchievement('sprint_under_60');
    }
    if (gameMode === 'blitz') {
      if (gameScore >= 5000) checkAchievement('blitz_5k');
      if (gameScore >= 10000) checkAchievement('blitz_10k');
      if (gameScore >= 25000) checkAchievement('blitz_25k');
    }
    if (gameMode === 'ultra') {
      if (gameScore >= 25000) checkAchievement('ultra_25k');
      if (gameScore >= 50000) checkAchievement('ultra_50k');
      if (gameScore >= 100000) checkAchievement('ultra_100k');
    }
    if (gameMode === 'daily') {
      checkAchievement('daily_done');
      const today = new Date().toISOString().slice(0, 10);
      if (save.stats.lastDailyDate === new Date(Date.now() - 86400000).toISOString().slice(0, 10)) {
        save.stats.dailyStreak++;
      } else if (save.stats.lastDailyDate !== today) {
        save.stats.dailyStreak = 1;
      }
      save.stats.lastDailyDate = today;
      if (save.stats.dailyStreak >= 3) checkAchievement('daily_3');
      if (save.stats.dailyStreak >= 7) checkAchievement('daily_7');
      if (save.stats.dailyStreak >= 30) checkAchievement('daily_30');
    }
    if (save.settings.skinIdx > 0) checkAchievement('skin_used');
    if (save.stats.modesPlayed.length >= 8) checkAchievement('all_modes');
    if (save.stats.modesPlayed.length >= 10) checkAchievement('all_10_modes');
    if (save.stats.modesPlayed.length >= 11) checkAchievement('all_11_modes');
    if (save.stats.games >= 250) checkAchievement('games_250');
    if (save.stats.totalScore >= 5000000) checkAchievement('score_5m');
    if (save.stats.totalScore >= 2000000) checkAchievement('score_2m');
    if (save.stats.totalScore >= 10000000) checkAchievement('score_10m');
    if (save.stats.totalLines >= 10000) checkAchievement('ten_thousand_lines');
    if (save.stats.playTimeMs >= 3600000) checkAchievement('playtime_1h');
    if (save.stats.playTimeMs >= 18000000) checkAchievement('playtime_5h');
    if (save.stats.playTimeMs >= 36000000) checkAchievement('playtime_10h');
    if (gameMode === 'marathon' && gameLevel >= 20) checkAchievement('marathon_lvl_20');
    if (gameMode === 'marathon' && gameLines >= 100) checkAchievement('marathon_100');
    if (gameMode === 'marathon' && gameLines >= 200) checkAchievement('marathon_200');

    // PPS achievements
    const gamePPS = gameTimeMs > 0 ? (gamePieces / (gameTimeMs / 1000)) : 0;
    if (gamePPS >= 1.0 && gamePieces >= 20) checkAchievement('pps_1');
    if (gamePPS >= 2.0 && gamePieces >= 20) checkAchievement('pps_2');
    if (gamePPS >= 3.0 && gamePieces >= 20) checkAchievement('pps_3');

    // Sprint PB achievements
    if (gameMode === 'sprint' && gameLines >= 40) {
      if (gameTimeMs < 45000) checkAchievement('sprint_under_45');
    }

    save.stats.totalActions = (save.stats.totalActions || 0) + gameActions;
    if (difficulty === 2) checkAchievement('hard_mode');
    if (save.playerLevel >= 3) checkAchievement('plvl_3');
    if (save.playerLevel >= 5) checkAchievement('plvl_5');
    if (save.playerLevel >= 7) checkAchievement('plvl_7');
    if (save.playerLevel >= 10) checkAchievement('plvl_10');
    if (save.playerLevel >= 15) checkAchievement('plvl_15');
    if (save.playerLevel >= 20) checkAchievement('plvl_20');
    // No-hold purist achievement
    if (!holdUsedThisGame && gameMode === 'marathon' && gameLevel >= 10) checkAchievement('no_hold_win');
    // Theme/skin collectors
    if (!save.stats.themesUsed.includes(save.settings.themeIdx)) save.stats.themesUsed.push(save.settings.themeIdx);
    if (!save.stats.skinsUsed.includes(save.settings.skinIdx)) save.stats.skinsUsed.push(save.settings.skinIdx);
    if (save.stats.themesUsed.length >= 10) checkAchievement('all_themes');
    if (save.stats.skinsUsed.length >= 10) checkAchievement('all_skins');
    if (save.stats.themesUsed.length >= 12) checkAchievement('all_12_themes');
    if (save.stats.skinsUsed.length >= 12) checkAchievement('all_12_skins');

    writeSave(save);

    showPanel('gameOver');
    const goEntity = panelEntities.get('gameOver')!;
    setTimeout(() => {
      const doc = goEntity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      const setText = (id: string, val: string) => { const el = doc.getElementById(id); if (el) el.text.value = val; };
      setText('go-score', `${fmtNum(gameScore)}`);
      setText('go-level', `${gameLevel}`);
      setText('go-lines', `${fmtNum(gameLines)}`);
      setText('go-combo', `${maxCombo}`);
      const secs = Math.floor(gameTimeMs / 1000);
      setText('go-time', `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`);
      setText('go-singles', `${gameSingles}`);
      setText('go-doubles', `${gameDoubles}`);
      setText('go-triples', `${gameTriples}`);
      setText('go-tetrises', `${gameTetrises}`);
      setText('go-tspins', `${gameTspins}`);
      setText('go-xp', `+${fmtNum(xpEarned)}`);
      setText('go-pb', isNewBest ? '★ NEW BEST! ★' : '');
      setText('go-dig-win', (gameMode === 'dig' && digWon) ? 'DIG COMPLETE!' : '');
      setText('go-garbage-sent', gameMode === 'battle' ? `${battleGarbageSent}` : '');
      // PPS / APM
      const pps = gameTimeMs > 0 ? (gamePieces / (gameTimeMs / 1000)).toFixed(2) : '0.00';
      const apm = gameTimeMs > 0 ? Math.round(gameActions / (gameTimeMs / 60000)) : 0;
      setText('go-pps', `${pps}`);
      setText('go-apm', `${apm}`);
      // Sprint/Dig PB
      if (gameMode === 'sprint' && gameLines >= 40) {
        setText('go-sprint-pb', save.stats.sprintBestMs > 0 ? `PB: ${fmtTime(save.stats.sprintBestMs)}` : '');
      }
      if (gameMode === 'dig' && digWon) {
        setText('go-dig-pb', save.stats.digBestMs > 0 ? `PB: ${fmtTime(save.stats.digBestMs)}` : '');
      }
    }, 100);
  }

  // ─── BUTTON WIRING ────────────────────────────────────────────
  function wireButton(panelId: string, btnId: string, cb: () => void) {
    const entity = panelEntities.get(panelId)!;
    const tryWire = () => {
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) { setTimeout(tryWire, 200); return; }
      const el = doc.getElementById(btnId);
      if (!el) { setTimeout(tryWire, 200); return; }
      el.addEventListener('click', () => { audio.click(); cb(); });
    };
    setTimeout(tryWire, 300);
  }

  // Title buttons
  wireButton('title', 'btn-play', () => { gameState = 'modeSelect'; showPanel('modeSelect'); });
  wireButton('title', 'btn-scores', () => { gameState = 'leaderboard'; lbModeIdx = 0; lbFilterMode = 'ALL'; updateLeaderboardPanel(); showPanel('leaderboard'); });
  wireButton('title', 'btn-achievements', () => { gameState = 'achievements'; achievePage = 0; updateAchievementsPanel(); showPanel('achievements'); });
  wireButton('title', 'btn-stats', () => { gameState = 'stats'; updateStatsPanel(); showPanel('stats'); });
  wireButton('title', 'btn-skins', () => { gameState = 'skins'; showPanel('skins'); });
  wireButton('title', 'btn-settings', () => { gameState = 'settings'; updateSettingsPanel(); showPanel('settings'); });
  wireButton('title', 'btn-help', () => { gameState = 'help'; showPanel('help'); });

  // Mode select
  const modes: [string, GameMode][] = [['btn-marathon', 'marathon'], ['btn-sprint', 'sprint'], ['btn-ultra', 'ultra'], ['btn-survival', 'survival'], ['btn-zen', 'zen'], ['btn-blitz', 'blitz'], ['btn-daily', 'daily'], ['btn-cascade', 'cascade'], ['btn-dig', 'dig'], ['btn-battle', 'battle'], ['btn-classic', 'classic']];
  for (const [btnId, mode] of modes) {
    wireButton('modeSelect', btnId, () => { gameMode = mode; gameState = 'difficulty'; showPanel('difficulty'); });
  }
  wireButton('modeSelect', 'btn-back', () => { gameState = 'title'; updateTitlePanel(); showPanel('title'); });

  // Difficulty
  wireButton('difficulty', 'btn-easy', () => { difficulty = 0; save.settings.difficulty = 0; writeSave(save); startGame(); });
  wireButton('difficulty', 'btn-normal', () => { difficulty = 1; save.settings.difficulty = 1; writeSave(save); startGame(); });
  wireButton('difficulty', 'btn-hard', () => { difficulty = 2; save.settings.difficulty = 2; writeSave(save); startGame(); });
  wireButton('difficulty', 'btn-back', () => { gameState = 'modeSelect'; showPanel('modeSelect'); });

  // Pause (with restart)
  wireButton('pause', 'btn-resume', () => { gameState = 'playing'; showPanels('hud', 'nextHold', 'zoneMeter', 'pieceStats'); audio.startMusic(); });
  wireButton('pause', 'btn-restart', () => { audio.stopMusic(); startGame(); });
  wireButton('pause', 'btn-quit', () => { gameState = 'title'; boardGroup.visible = false; clearPieceMeshes(); clearGhost(); audio.stopMusic(); updateTitlePanel(); showPanel('title'); });

  // Game Over
  wireButton('gameOver', 'btn-rematch', () => startGame());
  wireButton('gameOver', 'btn-menu', () => { gameState = 'title'; updateTitlePanel(); showPanel('title'); });

  // Leaderboard filters
  wireButton('leaderboard', 'btn-back', () => { gameState = 'title'; updateTitlePanel(); showPanel('title'); });
  wireButton('leaderboard', 'lb-filter-all', () => { lbModeIdx = 0; lbFilterMode = 'ALL'; updateLeaderboardPanel(); });
  wireButton('leaderboard', 'lb-filter-prev', () => { lbModeIdx = (lbModeIdx - 1 + lbModes.length) % lbModes.length; lbFilterMode = lbModes[lbModeIdx]; updateLeaderboardPanel(); });
  wireButton('leaderboard', 'lb-filter-next', () => { lbModeIdx = (lbModeIdx + 1) % lbModes.length; lbFilterMode = lbModes[lbModeIdx]; updateLeaderboardPanel(); });

  // Back buttons
  for (const panel of ['stats', 'help', 'skins']) {
    wireButton(panel, 'btn-back', () => { gameState = 'title'; updateTitlePanel(); showPanel('title'); });
  }
  wireButton('achievements', 'btn-back', () => { gameState = 'title'; updateTitlePanel(); showPanel('title'); });
  wireButton('achievements', 'btn-prev', () => { if (achievePage > 0) { achievePage--; updateAchievementsPanel(); } });
  wireButton('achievements', 'btn-next', () => { achievePage++; updateAchievementsPanel(); });

  // Settings
  wireButton('settings', 'btn-back', () => { gameState = 'title'; updateTitlePanel(); showPanel('title'); });
  wireButton('settings', 'btn-master-up', () => { save.settings.masterVol = Math.min(100, save.settings.masterVol + 10); audio.setVolumes(save.settings.masterVol, save.settings.sfxVol, save.settings.musicVol); updateSettingsPanel(); writeSave(save); });
  wireButton('settings', 'btn-master-down', () => { save.settings.masterVol = Math.max(0, save.settings.masterVol - 10); audio.setVolumes(save.settings.masterVol, save.settings.sfxVol, save.settings.musicVol); updateSettingsPanel(); writeSave(save); });
  wireButton('settings', 'btn-sfx-up', () => { save.settings.sfxVol = Math.min(100, save.settings.sfxVol + 10); audio.setVolumes(save.settings.masterVol, save.settings.sfxVol, save.settings.musicVol); updateSettingsPanel(); writeSave(save); });
  wireButton('settings', 'btn-sfx-down', () => { save.settings.sfxVol = Math.max(0, save.settings.sfxVol - 10); audio.setVolumes(save.settings.masterVol, save.settings.sfxVol, save.settings.musicVol); updateSettingsPanel(); writeSave(save); });
  wireButton('settings', 'btn-music-up', () => { save.settings.musicVol = Math.min(100, save.settings.musicVol + 10); audio.setVolumes(save.settings.masterVol, save.settings.sfxVol, save.settings.musicVol); updateSettingsPanel(); writeSave(save); });
  wireButton('settings', 'btn-music-down', () => { save.settings.musicVol = Math.max(0, save.settings.musicVol - 10); audio.setVolumes(save.settings.masterVol, save.settings.sfxVol, save.settings.musicVol); updateSettingsPanel(); writeSave(save); });
  wireButton('settings', 'btn-theme-next', () => {
    save.settings.themeIdx = (save.settings.themeIdx + 1) % THEMES.length;
    if (!save.stats.themesUsed.includes(save.settings.themeIdx)) save.stats.themesUsed.push(save.settings.themeIdx);
    if (save.stats.themesUsed.length >= 10) checkAchievement('all_themes');
    if (save.stats.themesUsed.length >= 12) checkAchievement('all_12_themes');
    applyTheme(save.settings.themeIdx); updateSettingsPanel(); writeSave(save);
  });
  // Ghost toggle
  wireButton('settings', 'btn-ghost', () => {
    save.settings.ghostVisible = !save.settings.ghostVisible;
    updateSettingsPanel();
    writeSave(save);
    showToast(save.settings.ghostVisible ? 'Ghost: ON' : 'Ghost: OFF');
  });
  // DAS speed
  wireButton('settings', 'btn-das-next', () => {
    save.settings.dasLevel = Math.min(2, save.settings.dasLevel + 1);
    updateSettingsPanel();
    writeSave(save);
  });
  wireButton('settings', 'btn-das-prev', () => {
    save.settings.dasLevel = Math.max(0, save.settings.dasLevel - 1);
    updateSettingsPanel();
    writeSave(save);
  });

  wireButton('settings', 'btn-theme-prev', () => {
    save.settings.themeIdx = (save.settings.themeIdx - 1 + THEMES.length) % THEMES.length;
    if (!save.stats.themesUsed.includes(save.settings.themeIdx)) save.stats.themesUsed.push(save.settings.themeIdx);
    if (save.stats.themesUsed.length >= 10) checkAchievement('all_themes');
    if (save.stats.themesUsed.length >= 12) checkAchievement('all_12_themes');
    applyTheme(save.settings.themeIdx); updateSettingsPanel(); writeSave(save);
  });

  // Skins (12 skins)
  for (let i = 0; i < SKINS.length; i++) {
    wireButton('skins', `skin-${i}`, () => {
      save.settings.skinIdx = i;
      if (!save.stats.skinsUsed.includes(i)) save.stats.skinsUsed.push(i);
      if (save.stats.skinsUsed.length >= 10) checkAchievement('all_skins');
      if (save.stats.skinsUsed.length >= 12) checkAchievement('all_12_skins');
      if (i > 0) checkAchievement('skin_used');
      writeSave(save);
      showToast(`Skin: ${SKINS[i].name}`);
    });
  }

  // ─── INPUT ────────────────────────────────────────────────────
  const keys: Set<string> = new Set();
  const keyDown: Set<string> = new Set();

  document.addEventListener('keydown', (e) => {
    if (!keys.has(e.code)) keyDown.add(e.code);
    keys.add(e.code);
  });
  document.addEventListener('keyup', (e) => { keys.delete(e.code); keyDown.delete(e.code); dasDir = 0; dasTimer = 0; });

  function processInput(dt: number) {
    if (gameState !== 'playing') {
      if (gameState === 'paused' && keyDown.has('Escape')) {
        gameState = 'playing';
        showPanels('hud', 'nextHold', 'zoneMeter', 'pieceStats');
        audio.startMusic();
      }
      keyDown.clear();
      return;
    }

    if (keyDown.has('Escape')) {
      gameState = 'paused';
      showPanel('pause');
      audio.stopMusic();
      keyDown.clear();
      return;
    }

    const dasConf = DAS_LEVELS[save.settings.dasLevel] || DAS_LEVELS[1];
    if (keyDown.has('ArrowLeft')) { movePiece(-1); dasDir = -1; dasTimer = dasConf.delay; }
    if (keyDown.has('ArrowRight')) { movePiece(1); dasDir = 1; dasTimer = dasConf.delay; }

    if (keys.has('ArrowLeft') && dasDir === -1) {
      dasTimer -= dt;
      if (dasTimer <= 0) { movePiece(-1); dasTimer = dasConf.repeat; }
    }
    if (keys.has('ArrowRight') && dasDir === 1) {
      dasTimer -= dt;
      if (dasTimer <= 0) { movePiece(1); dasTimer = dasConf.repeat; }
    }

    if (keyDown.has('ArrowUp') || keyDown.has('KeyX')) rotatePiece(1);
    if (keyDown.has('KeyZ')) rotatePiece(-1);

    if (keyDown.has('Space')) hardDrop();
    if (keys.has('ArrowDown')) softDrop();

    if (keyDown.has('KeyC')) holdPiece();

    // Zone activation
    if (keyDown.has('KeyQ')) activateZone();

    // Quick restart with R
    if (keyDown.has('KeyR')) {
      audio.stopMusic();
      startGame();
      keyDown.clear();
      return;
    }

    keyDown.clear();
  }

  // XR input
  function processXRInput(dt: number) {
    if (!world.input?.xr?.gamepads) return;
    const right = world.input.xr.gamepads.right as any;
    const left = world.input.xr.gamepads.left as any;
    if (!right) return;

    if (gameState === 'playing') {
      const tx = right.getAxesValues?.(2)?.[0] ?? 0;
      const ty = right.getAxesValues?.(2)?.[1] ?? 0;

      if (Math.abs(tx) > 0.5) {
        if (dasDir !== Math.sign(tx)) {
          movePiece(tx > 0 ? 1 : -1);
          dasDir = Math.sign(tx);
          dasTimer = 0.17;
        } else {
          dasTimer -= dt;
          if (dasTimer <= 0) { movePiece(tx > 0 ? 1 : -1); dasTimer = 0.03; }
        }
      } else if (Math.abs(tx) < 0.3) { dasDir = 0; }

      if (ty < -0.5) softDrop();

      if (right.getButtonDown?.(0)) hardDrop();
      if (right.getButtonDown?.(3)) rotatePiece(1);
      if (right.getButtonDown?.(4)) {
        gameState = 'paused';
        showPanel('pause');
        audio.stopMusic();
      }
      if (left?.getButtonDown?.(0)) holdPiece();
      // Left A button = rotate CCW
      if (left?.getButtonDown?.(3)) rotatePiece(-1);
      // Left squeeze = activate Zone
      if (left?.getButtonDown?.(1)) activateZone();
    }
  }

  // ─── GAME LOOP ────────────────────────────────────────────────
  let prevTime = performance.now();

  function gameLoop() {
    const now = performance.now();
    const dt = Math.min((now - prevTime) / 1000, 0.1);
    prevTime = now;

    const t = now / 1000;
    decoGroup.children.forEach(c => {
      c.rotation.y += (c.userData.rotSpeed || 0.3) * dt;
      c.position.y = c.userData.baseY + Math.sin(t + c.userData.phase) * 0.1;
    });
    particleGroup.children.forEach(c => {
      c.position.y = c.userData.baseY + Math.sin(t * 0.5 + c.userData.phase) * 0.08;
      c.position.x += (c.userData.driftX || 0) * dt;
      const pm = (c as Mesh).material as MeshBasicMaterial | undefined;
      if (pm) pm.opacity = 0.2 + Math.sin(t + c.userData.phase) * 0.2;
    });

    updateParticles(dt);
    updateToast(dt);
    updateShake(dt);

    // Line clear timer
    if (lineClearTimer > 0) {
      lineClearTimer -= dt;
      if (lineClearTimer <= 0) panelEntities.get('lineClear')!.object3D.visible = false;
    }

    // Level up timer
    if (levelUpTimer > 0) {
      levelUpTimer -= dt;
      if (levelUpTimer <= 0) panelEntities.get('levelUp')!.object3D.visible = false;
    }

    // Score popup timer
    if (scorePopupTimer > 0) {
      scorePopupTimer -= dt;
      if (scorePopupTimer <= 0) { const sp = panelEntities.get('scorePopup'); if (sp) sp.object3D.visible = false; }
    }

    // Border glow handled in playing state with combo intensity

    processInput(dt);
    processXRInput(dt);

    if (gameState === 'countdown') {
      countdownTimer -= dt;
      if (countdownTimer <= 0) {
        countdownVal--;
        if (countdownVal <= 0) {
          audio.countdownGo();
          beginPlaying();
        } else {
          countdownTimer = 1;
          audio.countdown();
          const cdDoc = panelEntities.get('countdown')!.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
          if (cdDoc) { const el = cdDoc.getElementById('cd-value'); if (el) el.text.value = `${countdownVal}`; }
        }
      }
    }

    if (gameState === 'playing') {
      gameTimeMs += dt * 1000;

      // Power-up display timer
      if (powerUpDisplayTimer > 0) {
        powerUpDisplayTimer -= dt;
        if (powerUpDisplayTimer <= 0) {
          const puEnt = panelEntities.get('powerup');
          if (puEnt) puEnt.object3D.visible = false;
        }
      }

      // Freeze timer
      if (freezeTimer > 0) {
        freezeTimer -= dt;
        if (freezeTimer <= 0) showToast('Freeze ended');
      }

      // Zone timer
      if (zoneActive) {
        zoneTimer -= dt;
        const zaDoc = panelEntities.get('zoneActive')?.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
        if (zaDoc) {
          const zt = zaDoc.getElementById('zone-timer');
          if (zt) zt.text.value = `${zoneTimer.toFixed(1)}s`;
        }
        if (zoneTimer <= 0) deactivateZone();
      }

      // Update zone meter UI
      if (!zoneActive) {
        const zmDoc = panelEntities.get('zoneMeter')?.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
        if (zmDoc) {
          const fill = zmDoc.getElementById('zone-fill');
          const pct = zmDoc.getElementById('zone-pct');
          const hint = zmDoc.getElementById('zone-hint');
          if (fill) (fill as any).style = { width: `${zoneMeter}%` };
          if (pct) pct.text.value = `${Math.floor(zoneMeter)}%`;
          if (hint) hint.text.value = zoneMeter >= ZONE_METER_MAX ? '[Q] READY!' : '[Q] Activate';
        }
      }

      // Update piece stats panel
      const psDoc = panelEntities.get('pieceStats')?.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (psDoc) {
        for (const pt of ['I', 'O', 'T', 'S', 'Z', 'J', 'L']) {
          const el = psDoc.getElementById(`ps-${pt.toLowerCase()}`);
          if (el) el.text.value = `${gamePieceCounts[pt] || 0}`;
        }
      }

      // Combo intensity decay
      if (comboIntensity > 0) comboIntensity = Math.max(0, comboIntensity - dt * 2);
      if (gameCombo > 0) comboIntensity = Math.min(1, gameCombo / 10);

      // Combo border glow
      if (borderMesh) {
        const basePulse = 0.4 + Math.sin(t * 2) * 0.2;
        const comboBright = comboIntensity * 0.5;
        (borderMesh.material as LineBasicMaterial).opacity = basePulse + comboBright;
        if (comboIntensity > 0.3) {
          const comboColor = new Color().setHSL(0.15 - comboIntensity * 0.15, 1, 0.5 + comboIntensity * 0.3);
          (borderMesh.material as LineBasicMaterial).color.copy(comboColor);
        } else {
          (borderMesh.material as LineBasicMaterial).color.set(currentTheme.accent);
        }
      }

      // Drop trail update
      updateDropTrails(dt);

      // Time-limited modes
      if (gameMode === 'ultra' && gameTimeMs >= 180000) { endGame(); return; }
      if (gameMode === 'blitz' && gameTimeMs >= 60000) { endGame(); return; }

      // Battle mode: AI sends garbage
      if (gameMode === 'battle') {
        battleGarbageTimer += dt;
        // Speed up over time
        battleAISpeed = Math.max(3, 8 - Math.floor(gameTimeMs / 30000));
        if (battleGarbageTimer >= battleAISpeed) {
          battleGarbageTimer = 0;
          battleGarbageReceived++;
          addGarbageLine();
          audio.battleHit();
        }

        // Level up with time
        const newLevel = Math.floor(gameTimeMs / 15000) + 1;
        if (newLevel > gameLevel) {
          gameLevel = newLevel;
          audio.updateLevel(gameLevel);
        }
      }

      // Survival: level up over time + garbage lines
      if (gameMode === 'survival') {
        const newLevel = Math.floor(gameTimeMs / 10000) + 1;
        if (newLevel > gameLevel) {
          gameLevel = newLevel;
          audio.updateLevel(gameLevel);
        }

        // Garbage lines every 30 seconds
        garbageTimer += dt;
        const garbageInterval = Math.max(15, 30 - gameLevel);
        if (garbageTimer >= garbageInterval) {
          garbageTimer = 0;
          addGarbageLine();
        }
      }

      // Level up detection
      if (gameLevel > prevGameLevel) {
        showLevelUp(gameLevel);
        prevGameLevel = gameLevel;
      }

      // Line clear animation
      if (clearingLines.length > 0) {
        clearAnimTimer -= dt;
        for (const row of clearingLines) {
          for (let c = 0; c < COLS; c++) {
            const block = activeBlocks[row]?.[c];
            if (block) {
              const mat = block.material as MeshStandardMaterial;
              mat.opacity = 0.3 + Math.sin(t * 20) * 0.7;
              mat.emissiveIntensity = 1 + Math.sin(t * 20) * 0.5;
            }
          }
        }
        if (clearAnimTimer <= 0) clearLines();
        return;
      }

      // Gravity / drop
      const interval = getDropInterval();
      dropTimer += dt;
      if (dropTimer >= interval) {
        dropTimer = 0;
        const shape = getShape();
        if (fits(shape, curCol, curRow - 1)) {
          curRow--;
          updatePieceVisuals();
          isLocking = false;
          lockTimer = 0;
        } else {
          isLocking = true;
        }
      }

      // Lock delay with visual flash
      if (isLocking) {
        lockTimer += dt;
        // Flash piece when close to locking
        const lockProgress = lockTimer / lockDelay;
        if (lockProgress > 0.5) {
          const flashOpacity = 0.5 + Math.sin(lockProgress * 20) * 0.3;
          pieceMeshes.forEach(m => {
            (m.material as MeshStandardMaterial).opacity = flashOpacity;
          });
        }
        if (lockTimer >= lockDelay) {
          lockPiece();
        }
      }

      if (gameMode === 'zen' && gamePieces >= 100) checkAchievement('zen_100');

      updateHUD();
      updateNextHoldPanel();
    }
  }

  world.onUpdate(gameLoop);

  // ─── INITIAL STATE ────────────────────────────────────────────
  boardGroup.visible = false;
  updateTitlePanel();
  showPanel('title');
}

main().catch(console.error);
