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
type GameMode = 'marathon' | 'sprint' | 'ultra' | 'survival' | 'zen' | 'blitz' | 'daily' | 'cascade';
type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

const COLS = 10, ROWS = 20;
const CELL = 0.08; // size of each block in world units
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
// SRS wall kick data (JLSTZ and I separate)
const KICK_JLSTZ: number[][][] = [
  [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], // 0->1
  [[0,0],[1,0],[1,-1],[0,2],[1,2]],     // 1->2
  [[0,0],[1,0],[1,1],[0,-2],[1,-2]],    // 2->3
  [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]], // 3->0
];
const KICK_I: number[][][] = [
  [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
];

const THEMES = [
  { name: 'Neon Holodeck', grid: 0x003333, accent: 0x00ffff, bg: 0x000a0a, fog: 0x001515, wall: 0x004444 },
  { name: 'Crimson', grid: 0x330000, accent: 0xff4444, bg: 0x0a0000, fog: 0x150000, wall: 0x440000 },
  { name: 'Toxic', grid: 0x003300, accent: 0x00ff44, bg: 0x000a00, fog: 0x001500, wall: 0x004400 },
  { name: 'Ultra Violet', grid: 0x220033, accent: 0xaa44ff, bg: 0x0a0015, fog: 0x150022, wall: 0x330044 },
  { name: 'Solar', grid: 0x332200, accent: 0xff8800, bg: 0x0a0500, fog: 0x150a00, wall: 0x443300 },
  { name: 'Deep Sea', grid: 0x001133, accent: 0x0088ff, bg: 0x000510, fog: 0x000a15, wall: 0x002244 },
];

const SKINS = [
  { name: 'Neon', wireframe: true, emissive: 1.0, roughness: 0.3, metalness: 0.7 },
  { name: 'Crystal', wireframe: false, emissive: 0.6, roughness: 0.1, metalness: 0.9 },
  { name: 'Hologram', wireframe: true, emissive: 1.5, roughness: 0.0, metalness: 1.0 },
  { name: 'Plasma', wireframe: false, emissive: 0.8, roughness: 0.5, metalness: 0.5 },
  { name: 'Void', wireframe: true, emissive: 0.4, roughness: 0.8, metalness: 0.2 },
  { name: 'Solar', wireframe: false, emissive: 1.2, roughness: 0.2, metalness: 0.8 },
];

const PLAYER_TITLES = ['Novice','Beginner','Apprentice','Student','Learner','Adept','Skilled','Expert','Master','Champion','Legend','Titan','Prodigy','Virtuoso','Grandmaster','Overlord','Demigod','Immortal','Transcendent','NEON GOD'];

interface Achievement { id: string; name: string; desc: string; }
const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_clear', name: 'First Line', desc: 'Clear your first line' },
  { id: 'ten_lines', name: 'Ten Lines', desc: 'Clear 10 lines in a game' },
  { id: 'fifty_lines', name: 'Fifty Lines', desc: 'Clear 50 lines total' },
  { id: 'hundred_lines', name: 'Century', desc: 'Clear 100 lines total' },
  { id: 'five_hundred_lines', name: 'Line Lord', desc: 'Clear 500 lines total' },
  { id: 'first_tetris', name: 'First Tetris', desc: 'Clear 4 lines at once' },
  { id: 'ten_tetrises', name: 'Tetris Master', desc: '10 Tetrises total' },
  { id: 'first_tspin', name: 'T-Spin!', desc: 'Perform a T-Spin' },
  { id: 'ten_tspins', name: 'T-Spin Expert', desc: '10 T-Spins total' },
  { id: 'combo_5', name: 'Combo x5', desc: 'Reach a 5 combo' },
  { id: 'combo_10', name: 'Combo x10', desc: 'Reach a 10 combo' },
  { id: 'combo_15', name: 'Unstoppable', desc: 'Reach a 15 combo' },
  { id: 'b2b_3', name: 'Back-to-Back x3', desc: '3 consecutive Tetrises/T-Spins' },
  { id: 'b2b_5', name: 'Back-to-Back x5', desc: '5 consecutive difficult clears' },
  { id: 'score_1k', name: 'Scorer', desc: 'Score 1,000 points' },
  { id: 'score_10k', name: 'High Scorer', desc: 'Score 10,000 points' },
  { id: 'score_50k', name: 'Score Legend', desc: 'Score 50,000 points' },
  { id: 'score_100k', name: 'Score God', desc: 'Score 100,000 points' },
  { id: 'level_5', name: 'Level 5', desc: 'Reach level 5' },
  { id: 'level_10', name: 'Level 10', desc: 'Reach level 10' },
  { id: 'level_15', name: 'Level 15', desc: 'Reach level 15' },
  { id: 'level_20', name: 'Level 20', desc: 'Reach level 20' },
  { id: 'sprint_clear', name: 'Sprinter', desc: 'Complete Sprint 40' },
  { id: 'sprint_under_2', name: 'Speed Demon', desc: 'Sprint 40 under 2 minutes' },
  { id: 'games_10', name: 'Regular', desc: 'Play 10 games' },
  { id: 'games_50', name: 'Dedicated', desc: 'Play 50 games' },
  { id: 'games_100', name: 'Veteran', desc: 'Play 100 games' },
  { id: 'pieces_100', name: 'Builder', desc: 'Place 100 pieces total' },
  { id: 'pieces_1000', name: 'Architect', desc: 'Place 1,000 pieces total' },
  { id: 'pieces_5000', name: 'Grand Architect', desc: 'Place 5,000 pieces total' },
  { id: 'perfect_clear', name: 'Perfect Clear', desc: 'Empty the entire board' },
  { id: 'daily_done', name: 'Daily Player', desc: 'Complete a Daily Challenge' },
  { id: 'daily_3', name: 'Daily Streak 3', desc: '3-day daily challenge streak' },
  { id: 'daily_7', name: 'Weekly Warrior', desc: '7-day daily challenge streak' },
  { id: 'skin_used', name: 'Fashion', desc: 'Use a non-default skin' },
  { id: 'all_modes', name: 'Explorer', desc: 'Play all 8 game modes' },
  { id: 'hard_mode', name: 'Hardcore', desc: 'Complete a game on Hard' },
  { id: 'zen_100', name: 'Zen Master', desc: 'Place 100 pieces in Zen mode' },
  { id: 'survival_5', name: 'Survivor', desc: 'Reach level 5 in Survival' },
  { id: 'cascade_chain', name: 'Chain Reaction', desc: 'Get a 3+ cascade chain' },
  { id: 'plvl_5', name: 'Rising Star', desc: 'Reach player level 5' },
  { id: 'plvl_10', name: 'Experienced', desc: 'Reach player level 10' },
  { id: 'plvl_20', name: 'NEON GOD', desc: 'Reach player level 20' },
  { id: 'triple', name: 'Triple', desc: 'Clear 3 lines at once' },
  { id: 'hard_drop_100', name: 'Slam', desc: 'Hard drop 100 times total' },
];

// ─── SAVE DATA ─────────────────────────────────────────────────────
interface SaveData {
  leaderboard: { score: number; mode: string; level: number; lines: number; date: string }[];
  achievements: string[];
  stats: {
    games: number; totalScore: number; bestScore: number; totalLines: number; bestLevel: number;
    tetrises: number; tspins: number; bestCombo: number; playTimeMs: number; piecesPlaced: number;
    hardDrops: number; modesPlayed: string[]; dailyStreak: number; lastDailyDate: string;
  };
  settings: { masterVol: number; sfxVol: number; musicVol: number; themeIdx: number; skinIdx: number; difficulty: number };
  xp: number; playerLevel: number;
}
function defaultSave(): SaveData {
  return {
    leaderboard: [], achievements: [], xp: 0, playerLevel: 1,
    stats: { games: 0, totalScore: 0, bestScore: 0, totalLines: 0, bestLevel: 0, tetrises: 0, tspins: 0, bestCombo: 0, playTimeMs: 0, piecesPlaced: 0, hardDrops: 0, modesPlayed: [], dailyStreak: 0, lastDailyDate: '' },
    settings: { masterVol: 100, sfxVol: 100, musicVol: 100, themeIdx: 0, skinIdx: 0, difficulty: 1 },
  };
}
function loadSave(): SaveData {
  try { const s = localStorage.getItem('neon-blocks-save'); if (s) { const d = JSON.parse(s); return { ...defaultSave(), ...d, stats: { ...defaultSave().stats, ...(d.stats || {}) }, settings: { ...defaultSave().settings, ...(d.settings || {}) } }; } } catch {}
  return defaultSave();
}
function writeSave(d: SaveData) { try { localStorage.setItem('neon-blocks-save', JSON.stringify(d)); } catch {} }

// ─── AUDIO ─────────────────────────────────────────────────────────
class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  private musicOscs: OscillatorNode[] = [];
  private musicPlaying = false;

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
    const ctx = this.ctx!;
    const freqs = count >= 4 ? [440, 554, 659, 880] : count === 3 ? [440, 554, 659] : count === 2 ? [440, 554] : [440];
    freqs.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.25, 0.18), i * 60);
    });
  }

  tSpin() {
    this.ensure();
    [660, 880, 1100].forEach((f, i) => setTimeout(() => this.playTone(f, 'triangle', 0.2, 0.15), i * 70));
  }

  combo(n: number) { this.playTone(330 + n * 55, 'triangle', 0.15, 0.12); }
  gameOver() { [440, 370, 330, 262].forEach((f, i) => setTimeout(() => this.playTone(f, 'sawtooth', 0.3, 0.1), i * 120)); }
  achievement() { [660, 770, 880, 990, 1100].forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.2, 0.1), i * 80)); }
  countdown() { this.playTone(440, 'sine', 0.15, 0.12); }
  countdownGo() { this.playTone(880, 'sine', 0.25, 0.15); }
  click() { this.playTone(600, 'sine', 0.05, 0.08); }

  startMusic() {
    if (this.musicPlaying) return;
    this.ensure();
    const ctx = this.ctx!;
    this.musicPlaying = true;
    const bass = ctx.createOscillator();
    const bassG = ctx.createGain();
    bass.type = 'sine'; bass.frequency.value = 55;
    bassG.gain.value = 0.08;
    bass.connect(bassG); bassG.connect(this.musicGain);
    bass.start();
    const pad = ctx.createOscillator();
    const padG = ctx.createGain();
    const padF = ctx.createBiquadFilter();
    pad.type = 'triangle'; pad.frequency.value = 82.5;
    padF.type = 'lowpass'; padF.frequency.value = 400;
    padG.gain.value = 0.05;
    pad.connect(padF); padF.connect(padG); padG.connect(this.musicGain);
    pad.start();
    const shimmer = ctx.createOscillator();
    const shimG = ctx.createGain();
    shimmer.type = 'sine'; shimmer.frequency.value = 110;
    shimG.gain.value = 0.03;
    shimmer.connect(shimG); shimG.connect(this.musicGain);
    shimmer.start();
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.type = 'sine'; lfo.frequency.value = 0.15;
    lfoG.gain.value = 0.02;
    lfo.connect(lfoG); lfoG.connect(shimG.gain);
    lfo.start();
    this.musicOscs = [bass, pad, shimmer, lfo];
  }

  stopMusic() {
    this.musicOscs.forEach(o => { try { o.stop(); } catch {} });
    this.musicOscs = [];
    this.musicPlaying = false;
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
  // Floor grid lines
  const floorLineGeo = new BufferGeometry();
  const floorVerts: number[] = [];
  for (let i = -gridSize/2; i <= gridSize/2; i += 1) {
    floorVerts.push(i, 0.001, -gridSize/2, i, 0.001, gridSize/2);
    floorVerts.push(-gridSize/2, 0.001, i, gridSize/2, 0.001, i);
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
    // Update board border
    if (borderMesh) (borderMesh.material as LineBasicMaterial).color.set(currentTheme.accent);
  }

  // ─── GAME BOARD (3D) ──────────────────────────────────────────
  const boardGroup = new Group();
  // Position board so it's centered and slightly in front of player
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
  for (let c = 0; c <= COLS; c++) {
    gVerts.push(c * CELL, 0, 0.001, c * CELL, boardH, 0.001);
  }
  for (let r = 0; r <= ROWS; r++) {
    gVerts.push(0, r * CELL, 0.001, boardW, r * CELL, 0.001);
  }
  gridLineGeo.setAttribute('position', new Float32BufferAttribute(gVerts, 3));
  const gridLines = new LineSegments(gridLineGeo, new LineBasicMaterial({ color: currentTheme.grid, transparent: true, opacity: 0.2 }));
  boardGroup.add(gridLines);

  // Block meshes pool
  const blockPool: Mesh[] = [];
  const edgePool: LineSegments[] = [];
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

  // Next piece preview meshes (3D, world-space)
  const nextGroup = new Group();
  nextGroup.position.set(boardW / 2 + 0.25, boardH - 0.1, 0);
  boardGroup.add(nextGroup);

  // Hold piece preview meshes
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
  const particlePoolMax = 150;

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
  let difficulty = save.settings.difficulty; // 0=easy, 1=normal, 2=hard

  // Board grid (0 = empty, or piece color)
  const board: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

  // Current piece state
  let curType: PieceType = 'T';
  let curRotation = 0;
  let curCol = 3;
  let curRow = 18; // row from bottom (0=bottom, ROWS-1=top)
  let holdType: PieceType | null = null;
  let holdUsed = false;
  let nextQueue: PieceType[] = [];
  let gameScore = 0;
  let gameLevel = 1;
  let gameLines = 0;
  let gameCombo = -1;
  let gameTspins = 0;
  let gameSingles = 0;
  let gameDoubles = 0;
  let gameTriples = 0;
  let gameTetrises = 0;
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
  let rng = Math.random;

  // Line clear animation
  let clearingLines: number[] = [];
  let clearAnimTimer = 0;
  const CLEAR_ANIM_DUR = 0.4;

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
      // Game over
      endGame();
      return;
    }
    updatePieceVisuals();
    updateNextHoldVisuals();
  }

  function lockPiece() {
    const shape = getShape();
    const color = PIECE_COLORS[curType];

    // Check T-Spin
    let isTSpin = false;
    if (curType === 'T') {
      // Check 3 of 4 corners occupied
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

    // Check for line clears
    const linesToClear: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (board[r].every(c => c !== 0)) linesToClear.push(r);
    }

    if (linesToClear.length > 0) {
      clearingLines = linesToClear;
      clearAnimTimer = CLEAR_ANIM_DUR;

      const isDifficult = linesToClear.length >= 4 || isTSpin;
      const b2bMult = (lastWasDifficult && isDifficult) ? 1.5 : 1;

      // Score
      const baseScores: Record<number, number> = { 1: 100, 2: 300, 3: 500, 4: 800 };
      let pts = (baseScores[linesToClear.length] || 100) * gameLevel;
      if (isTSpin) {
        pts *= 1.5;
        gameTspins++;
        save.stats.tspins++;
        audio.tSpin();
        showLineClearText('T-SPIN!');
        checkAchievement('first_tspin');
        if (save.stats.tspins >= 10) checkAchievement('ten_tspins');
      }
      pts = Math.floor(pts * b2bMult);
      gameScore += pts;

      // Combo
      gameCombo++;
      if (gameCombo > 0) {
        gameScore += 50 * gameCombo * gameLevel;
        audio.combo(gameCombo);
      }
      if (gameCombo > maxCombo) maxCombo = gameCombo;

      gameLines += linesToClear.length;
      save.stats.totalLines += linesToClear.length;

      // Stats
      if (linesToClear.length === 1) gameSingles++;
      else if (linesToClear.length === 2) gameDoubles++;
      else if (linesToClear.length === 3) { gameTriples++; checkAchievement('triple'); }
      else if (linesToClear.length >= 4) {
        gameTetrises++;
        save.stats.tetrises++;
        checkAchievement('first_tetris');
        if (save.stats.tetrises >= 10) checkAchievement('ten_tetrises');
      }

      // Back to back
      if (isDifficult) { backToBack++; } else { backToBack = 0; }
      lastWasDifficult = isDifficult;
      if (backToBack >= 3) checkAchievement('b2b_3');
      if (backToBack >= 5) checkAchievement('b2b_5');

      audio.lineClear(linesToClear.length);
      showLineClearText(linesToClear.length >= 4 ? 'TETRIS!' : linesToClear.length === 3 ? 'TRIPLE!' : linesToClear.length === 2 ? 'DOUBLE!' : 'SINGLE');

      // Particle burst at cleared lines
      for (const lr of linesToClear) {
        const wp = new Vector3();
        wp.set(boardGroup.position.x + boardW / 2, boardGroup.position.y + lr * CELL + CELL / 2, boardGroup.position.z);
        spawnParticles(wp, currentTheme.accent, 8);
      }

      // Check achievements
      checkAchievement('first_clear');
      if (gameLines >= 10) checkAchievement('ten_lines');
      if (save.stats.totalLines >= 50) checkAchievement('fifty_lines');
      if (save.stats.totalLines >= 100) checkAchievement('hundred_lines');
      if (save.stats.totalLines >= 500) checkAchievement('five_hundred_lines');

      if (gameCombo >= 5) checkAchievement('combo_5');
      if (gameCombo >= 10) checkAchievement('combo_10');
      if (gameCombo >= 15) checkAchievement('combo_15');

      // Level up in marathon
      if (gameMode === 'marathon' || gameMode === 'survival') {
        const newLevel = Math.floor(gameLines / 10) + 1 + (difficulty === 0 ? 0 : difficulty === 2 ? 2 : 0);
        if (newLevel > gameLevel) gameLevel = newLevel;
      }

      // Don't spawn next piece until animation done
    } else {
      gameCombo = -1;
      // Perfect clear check
      if (board.every(row => row.every(c => c === 0))) {
        gameScore += 3000 * gameLevel;
        checkAchievement('perfect_clear');
        showLineClearText('PERFECT CLEAR!');
      }
      spawnPiece();
    }

    // Score achievements
    if (gameScore >= 1000) checkAchievement('score_1k');
    if (gameScore >= 10000) checkAchievement('score_10k');
    if (gameScore >= 50000) checkAchievement('score_50k');
    if (gameScore >= 100000) checkAchievement('score_100k');
    if (gameLevel >= 5) { checkAchievement('level_5'); if (gameMode === 'survival') checkAchievement('survival_5'); }
    if (gameLevel >= 10) checkAchievement('level_10');
    if (gameLevel >= 15) checkAchievement('level_15');
    if (gameLevel >= 20) checkAchievement('level_20');
  }

  function clearLines() {
    // Actually remove lines from board
    const sorted = [...clearingLines].sort((a, b) => b - a);
    for (const row of sorted) {
      // Remove visual blocks for this row
      for (let c = 0; c < COLS; c++) removeBlock(row, c);
      // Shift board data down
      board.splice(row, 1);
      board.push(Array(COLS).fill(0));
    }
    // Rebuild all visuals
    rebuildBoardVisuals();
    clearingLines = [];

    // Sprint: check win
    if (gameMode === 'sprint' && gameLines >= 40) { endGame(); return; }

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
    const base = gameMode === 'zen' ? 999 : (difficulty === 0 ? 1.2 : difficulty === 2 ? 0.6 : 0.8);
    const speedup = gameMode === 'survival' ? 0.06 : 0.04;
    return Math.max(0.05, base - (gameLevel - 1) * speedup);
  }

  function hardDrop() {
    const shape = getShape();
    let dropped = 0;
    while (fits(shape, curCol, curRow - 1)) { curRow--; dropped++; }
    gameScore += dropped * 2;
    gameHardDrops++;
    save.stats.hardDrops++;
    if (save.stats.hardDrops >= 100) checkAchievement('hard_drop_100');
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
      updatePieceVisuals();
    }
  }

  function rotatePiece(dir: number) {
    const numRots = PIECE_SHAPES[curType].length;
    if (numRots <= 1) return; // O piece
    const newRot = ((curRotation + dir) % numRots + numRots) % numRots;
    const newShape = PIECE_SHAPES[curType][newRot];
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
        updatePieceVisuals();
        return;
      }
    }
  }

  function holdPiece() {
    if (holdUsed) return;
    holdUsed = true;
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
    // Ghost
    const ghostRow = getGhostRow();
    if (ghostRow !== curRow) drawGhost(shape, curCol, ghostRow, color);
    else clearGhost();
  }

  function updateNextHoldVisuals() {
    // Draw next 3 pieces using the 3D preview groups
    while (nextQueue.length < 4) nextQueue.push(...generateBag());
    // Clear and redraw nextGroup with 3 pieces stacked
    while (nextGroup.children.length) nextGroup.remove(nextGroup.children[0]);
    for (let i = 0; i < 3; i++) {
      const previewG = new Group();
      previewG.position.set(0, -i * CELL * 3.5, 0);
      drawPreviewPiece(previewG, nextQueue[i]);
      nextGroup.add(previewG);
    }
    // Hold
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

  // Create all panels
  createPanel('title', '/ui/main-menu.json', { width: 0.7, height: 0.9 });
  createPanel('modeSelect', '/ui/mode-select.json', { width: 0.6, height: 0.9 });
  createPanel('difficulty', '/ui/difficulty.json', { width: 0.5, height: 0.6 });
  createPanel('hud', '/ui/hud.json', { follower: true, width: 0.6, height: 0.08 });
  createPanel('nextHold', '/ui/next-hold.json', { screenSpace: true, ssWidth: '12vw', ssBottom: '120px', ssRight: '24px', width: 0.15, height: 0.3 });
  createPanel('pause', '/ui/pause-menu.json', { width: 0.5, height: 0.4 });
  createPanel('gameOver', '/ui/game-over.json', { width: 0.6, height: 0.9 });
  createPanel('leaderboard', '/ui/leaderboard.json', { width: 0.7, height: 0.8 });
  createPanel('achievements', '/ui/achievements.json', { width: 0.7, height: 0.9 });
  createPanel('stats', '/ui/stats.json', { width: 0.6, height: 0.8 });
  createPanel('settings', '/ui/settings.json', { width: 0.6, height: 0.7 });
  createPanel('help', '/ui/help.json', { width: 0.6, height: 1.0 });
  createPanel('skins', '/ui/skins.json', { width: 0.6, height: 0.6 });
  createPanel('toast', '/ui/toast.json', { follower: true, width: 0.3, height: 0.06 });
  createPanel('countdown', '/ui/countdown.json', { follower: true, width: 0.15, height: 0.15 });
  createPanel('lineClear', '/ui/line-clear.json', { follower: true, width: 0.3, height: 0.08 });

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
  function updateLeaderboardPanel() {
    const entity = panelEntities.get('leaderboard')!;
    const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (!doc) return;
    const lb = save.leaderboard.slice(0, 10);
    for (let i = 0; i < 10; i++) {
      const entry = lb[i];
      const s = doc.getElementById(`lb-s${i + 1}`);
      const m = doc.getElementById(`lb-m${i + 1}`);
      if (s) s.text.value = entry ? `${entry.score}` : '-';
      if (m) m.text.value = entry ? `${entry.mode} L${entry.level}` : '-';
    }
  }

  // ─── STATS PANEL ──────────────────────────────────────────────
  function updateStatsPanel() {
    const entity = panelEntities.get('stats')!;
    const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (!doc) return;
    const s = save.stats;
    const setText = (id: string, val: string) => { const el = doc.getElementById(id); if (el) el.text.value = val; };
    setText('st-games', `${s.games}`);
    setText('st-total-score', `${s.totalScore}`);
    setText('st-best-score', `${s.bestScore}`);
    setText('st-total-lines', `${s.totalLines}`);
    setText('st-best-level', `${s.bestLevel}`);
    setText('st-tetrises', `${s.tetrises}`);
    setText('st-tspins', `${s.tspins}`);
    setText('st-best-combo', `${s.bestCombo}`);
    setText('st-playtime', `${Math.floor(s.playTimeMs / 60000)}m`);
    setText('st-pieces', `${s.piecesPlaced}`);
    setText('st-achievements', `${save.achievements.length}/${ACHIEVEMENTS.length}`);
    setText('st-player-level', `${save.playerLevel}`);
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
  }

  // ─── HUD UPDATE ──────────────────────────────────────────────
  function updateHUD() {
    const entity = panelEntities.get('hud')!;
    const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
    if (!doc) return;
    const setText = (id: string, val: string) => { const el = doc.getElementById(id); if (el) el.text.value = val; };
    setText('hud-score', `${gameScore}`);
    setText('hud-level', `${gameLevel}`);
    setText('hud-lines', `${gameLines}`);
    setText('hud-combo', gameCombo > 0 ? `x${gameCombo}` : '0');
    const secs = Math.floor(gameTimeMs / 1000);
    const mins = Math.floor(secs / 60);
    setText('hud-time', `${mins}:${(secs % 60).toString().padStart(2, '0')}`);
    setText('hud-mode', gameMode.toUpperCase());
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
    // Reset board
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { board[r][c] = 0; removeBlock(r, c); }
    clearPieceMeshes(); clearGhost();
    nextQueue = [];
    holdType = null; holdUsed = false;
    gameScore = 0; gameLines = 0; gameCombo = -1; gameTspins = 0;
    gameSingles = 0; gameDoubles = 0; gameTriples = 0; gameTetrises = 0;
    maxCombo = 0; backToBack = 0; lastWasDifficult = false;
    gameTimeMs = 0; gamePieces = 0; gameHardDrops = 0;
    cascadeChainCount = 0;
    gameLevel = difficulty === 0 ? 1 : difficulty === 2 ? 3 : 1;
    lockTimer = 0; isLocking = false; lockResets = 0;

    if (gameMode === 'daily') {
      rng = mulberry32(dateSeed());
    } else {
      rng = Math.random;
    }

    boardGroup.visible = true;

    // Countdown
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
    showPanels('hud', 'nextHold');
    spawnPiece();
    audio.startMusic();
  }

  function endGame() {
    gameState = 'gameOver';
    clearPieceMeshes(); clearGhost();
    audio.gameOver();
    audio.stopMusic();
    boardGroup.visible = false;

    // Save stats
    save.stats.games++;
    save.stats.totalScore += gameScore;
    if (gameScore > save.stats.bestScore) save.stats.bestScore = gameScore;
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
    if (save.stats.piecesPlaced >= 100) checkAchievement('pieces_100');
    if (save.stats.piecesPlaced >= 1000) checkAchievement('pieces_1000');
    if (save.stats.piecesPlaced >= 5000) checkAchievement('pieces_5000');
    if (gameMode === 'sprint' && gameLines >= 40) {
      checkAchievement('sprint_clear');
      if (gameTimeMs < 120000) checkAchievement('sprint_under_2');
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
    }
    if (save.settings.skinIdx > 0) checkAchievement('skin_used');
    if (save.stats.modesPlayed.length >= 8) checkAchievement('all_modes');
    if (difficulty === 2) checkAchievement('hard_mode');
    if (save.playerLevel >= 5) checkAchievement('plvl_5');
    if (save.playerLevel >= 10) checkAchievement('plvl_10');
    if (save.playerLevel >= 20) checkAchievement('plvl_20');

    writeSave(save);

    // Show game over panel
    showPanel('gameOver');
    const goEntity = panelEntities.get('gameOver')!;
    setTimeout(() => {
      const doc = goEntity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      const setText = (id: string, val: string) => { const el = doc.getElementById(id); if (el) el.text.value = val; };
      setText('go-score', `${gameScore}`);
      setText('go-level', `${gameLevel}`);
      setText('go-lines', `${gameLines}`);
      setText('go-combo', `${maxCombo}`);
      const secs = Math.floor(gameTimeMs / 1000);
      setText('go-time', `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`);
      setText('go-singles', `${gameSingles}`);
      setText('go-doubles', `${gameDoubles}`);
      setText('go-triples', `${gameTriples}`);
      setText('go-tetrises', `${gameTetrises}`);
      setText('go-tspins', `${gameTspins}`);
      setText('go-xp', `+${xpEarned}`);
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
  wireButton('title', 'btn-scores', () => { gameState = 'leaderboard'; updateLeaderboardPanel(); showPanel('leaderboard'); });
  wireButton('title', 'btn-achievements', () => { gameState = 'achievements'; achievePage = 0; updateAchievementsPanel(); showPanel('achievements'); });
  wireButton('title', 'btn-stats', () => { gameState = 'stats'; updateStatsPanel(); showPanel('stats'); });
  wireButton('title', 'btn-skins', () => { gameState = 'skins'; showPanel('skins'); });
  wireButton('title', 'btn-settings', () => { gameState = 'settings'; updateSettingsPanel(); showPanel('settings'); });
  wireButton('title', 'btn-help', () => { gameState = 'help'; showPanel('help'); });

  // Mode select
  const modes: [string, GameMode][] = [['btn-marathon', 'marathon'], ['btn-sprint', 'sprint'], ['btn-ultra', 'ultra'], ['btn-survival', 'survival'], ['btn-zen', 'zen'], ['btn-blitz', 'blitz'], ['btn-daily', 'daily'], ['btn-cascade', 'cascade']];
  for (const [btnId, mode] of modes) {
    wireButton('modeSelect', btnId, () => { gameMode = mode; gameState = 'difficulty'; showPanel('difficulty'); });
  }
  wireButton('modeSelect', 'btn-back', () => { gameState = 'title'; updateTitlePanel(); showPanel('title'); });

  // Difficulty
  wireButton('difficulty', 'btn-easy', () => { difficulty = 0; save.settings.difficulty = 0; writeSave(save); startGame(); });
  wireButton('difficulty', 'btn-normal', () => { difficulty = 1; save.settings.difficulty = 1; writeSave(save); startGame(); });
  wireButton('difficulty', 'btn-hard', () => { difficulty = 2; save.settings.difficulty = 2; writeSave(save); startGame(); });
  wireButton('difficulty', 'btn-back', () => { gameState = 'modeSelect'; showPanel('modeSelect'); });

  // Pause
  wireButton('pause', 'btn-resume', () => { gameState = 'playing'; showPanels('hud', 'nextHold'); audio.startMusic(); });
  wireButton('pause', 'btn-quit', () => { gameState = 'title'; boardGroup.visible = false; clearPieceMeshes(); clearGhost(); audio.stopMusic(); updateTitlePanel(); showPanel('title'); });

  // Game Over
  wireButton('gameOver', 'btn-rematch', () => startGame());
  wireButton('gameOver', 'btn-menu', () => { gameState = 'title'; updateTitlePanel(); showPanel('title'); });

  // Leaderboard, achievements, stats, help, skins - back buttons
  for (const panel of ['leaderboard', 'stats', 'help', 'skins']) {
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
  wireButton('settings', 'btn-theme-next', () => { save.settings.themeIdx = (save.settings.themeIdx + 1) % THEMES.length; applyTheme(save.settings.themeIdx); updateSettingsPanel(); writeSave(save); });
  wireButton('settings', 'btn-theme-prev', () => { save.settings.themeIdx = (save.settings.themeIdx - 1 + THEMES.length) % THEMES.length; applyTheme(save.settings.themeIdx); updateSettingsPanel(); writeSave(save); });

  // Skins
  for (let i = 0; i < SKINS.length; i++) {
    wireButton('skins', `skin-${i}`, () => {
      save.settings.skinIdx = i;
      writeSave(save);
      if (i > 0) checkAchievement('skin_used');
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
      // Pause toggle
      if (gameState === 'paused' && keyDown.has('Escape')) {
        gameState = 'playing';
        showPanels('hud', 'nextHold');
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

    // Move
    if (keyDown.has('ArrowLeft')) { movePiece(-1); dasDir = -1; dasTimer = 0.17; }
    if (keyDown.has('ArrowRight')) { movePiece(1); dasDir = 1; dasTimer = 0.17; }

    // DAS (delayed auto-shift)
    if (keys.has('ArrowLeft') && dasDir === -1) {
      dasTimer -= dt;
      if (dasTimer <= 0) { movePiece(-1); dasTimer = 0.03; }
    }
    if (keys.has('ArrowRight') && dasDir === 1) {
      dasTimer -= dt;
      if (dasTimer <= 0) { movePiece(1); dasTimer = 0.03; }
    }

    // Rotate
    if (keyDown.has('ArrowUp') || keyDown.has('KeyX')) rotatePiece(1);
    if (keyDown.has('KeyZ')) rotatePiece(-1);

    // Drop
    if (keyDown.has('Space')) hardDrop();
    if (keys.has('ArrowDown')) softDrop();

    // Hold
    if (keyDown.has('KeyC')) holdPiece();

    keyDown.clear();
  }

  // XR input
  function processXRInput(dt: number) {
    if (!world.input?.xr?.gamepads) return;
    const right = world.input.xr.gamepads.right as any;
    const left = world.input.xr.gamepads.left as any;
    if (!right) return;

    if (gameState === 'playing') {
      // Right thumbstick horizontal for move
      const tx = right.getAxesValues?.(2)?.[0] ?? 0; // thumbstick X
      const ty = right.getAxesValues?.(2)?.[1] ?? 0; // thumbstick Y

      // Move with deadzone
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

      // Soft drop
      if (ty < -0.5) softDrop();

      // Trigger = hard drop
      if (right.getButtonDown?.(0)) hardDrop();
      // A = rotate CW
      if (right.getButtonDown?.(3)) rotatePiece(1);
      // B = pause
      if (right.getButtonDown?.(4)) {
        gameState = 'paused';
        showPanel('pause');
        audio.stopMusic();
      }
      // Left trigger = hold
      if (left?.getButtonDown?.(0)) holdPiece();
    }
  }

  // ─── GAME LOOP ────────────────────────────────────────────────
  let prevTime = performance.now();

  function gameLoop() {
    const now = performance.now();
    const dt = Math.min((now - prevTime) / 1000, 0.1);
    prevTime = now;

    // Animate decorations
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

    // Line clear timer
    if (lineClearTimer > 0) {
      lineClearTimer -= dt;
      if (lineClearTimer <= 0) panelEntities.get('lineClear')!.object3D.visible = false;
    }

    // Border glow pulse
    if (borderMesh) {
      const pulse = 0.4 + Math.sin(t * 2) * 0.2;
      (borderMesh.material as LineBasicMaterial).opacity = pulse;
    }

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

      // Time-limited modes
      if (gameMode === 'ultra' && gameTimeMs >= 180000) { endGame(); return; }
      if (gameMode === 'blitz' && gameTimeMs >= 60000) { endGame(); return; }

      // Survival: level up over time
      if (gameMode === 'survival') {
        gameLevel = Math.floor(gameTimeMs / 10000) + 1;
      }

      // Line clear animation
      if (clearingLines.length > 0) {
        clearAnimTimer -= dt;
        // Flash effect on clearing lines
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
        return; // Skip drop during animation
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

      // Lock delay
      if (isLocking) {
        lockTimer += dt;
        if (lockTimer >= lockDelay) {
          lockPiece();
        }
      }

      // Zen mode pieces tracking
      if (gameMode === 'zen' && gamePieces >= 100) checkAchievement('zen_100');

      updateHUD();
      updateNextHoldPanel();
    }
  }

  // Register update
  world.onUpdate(gameLoop);

  // ─── INITIAL STATE ────────────────────────────────────────────
  boardGroup.visible = false;
  updateTitlePanel();
  showPanel('title');
}

main().catch(console.error);
