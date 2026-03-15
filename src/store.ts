import { create } from 'zustand';

export type EnemyType = 'swarmer' | 'juggernaut' | 'bomber' | 'spitter' | 'charger' | 'shielder' | 'phantom';

export type WeaponClass = 'kinetic' | 'energy' | 'explosive' | 'spread' | 'tech' | 'forbidden' | 'arc' | 'beam' | 'force' | 'singularity' | 'swarm' | 'sonic' | 'nano' | 'photon' | 'whip' | 'warp';
export type WeaponType = 'pulse_pistol' | 'plasma_caster' | 'frag_launcher' | 'shrapnel_blaster' | 'cryo_emitter' | 'void_reaper' | 'lightning_coil' | 'blade_wave' | 'railgun' | 'gravity_well' | 'swarm_missiles' | 'beam_laser' | 'ricochet_cannon' | 'sonic_boom' | 'nano_swarm' | 'photon_burst' | 'plasma_whip' | 'warp_lance';
export type ExplosionType = 'kinetic' | 'energy' | 'explosive' | 'spread' | 'tech' | 'forbidden' | 'arc' | 'beam' | 'force' | 'singularity' | 'swarm' | 'sonic' | 'nano' | 'photon' | 'whip' | 'warp';

export const WEAPON_CLASS: Record<WeaponType, WeaponClass> = {
  pulse_pistol: 'kinetic',
  plasma_caster: 'energy',
  frag_launcher: 'explosive',
  shrapnel_blaster: 'spread',
  cryo_emitter: 'tech',
  void_reaper: 'forbidden',
  lightning_coil: 'arc',
  blade_wave: 'force',
  railgun: 'kinetic',
  gravity_well: 'singularity',
  swarm_missiles: 'swarm',
  beam_laser: 'beam',
  ricochet_cannon: 'kinetic',
  sonic_boom: 'sonic',
  nano_swarm: 'nano',
  photon_burst: 'photon',
  plasma_whip: 'whip',
  warp_lance: 'warp',
};

export const MAX_WEAPON_LEVEL = 5;

export interface WeaponProfile {
  id: WeaponType;
  label: string;
  blurb: string;
  weaponClass: WeaponClass;
  unlockCost: number;
  baseUpgradeCost: number;
  accent: string;
}

export const WEAPON_PROFILES: WeaponProfile[] = [
  { id: 'pulse_pistol', label: 'Pulse Pistol', blurb: 'Reliable kinetic sidearm. Fast fire, clean kills.', weaponClass: 'kinetic', unlockCost: 0, baseUpgradeCost: 1500, accent: 'slate' },
  { id: 'plasma_caster', label: 'Plasma Caster', blurb: '3-round energy burst. Melts armor at medium range.', weaponClass: 'energy', unlockCost: 3000, baseUpgradeCost: 2500, accent: 'cyan' },
  { id: 'frag_launcher', label: 'Frag Launcher', blurb: 'Bouncing grenades. Devastating area denial.', weaponClass: 'explosive', unlockCost: 5000, baseUpgradeCost: 4000, accent: 'orange' },
  { id: 'shrapnel_blaster', label: 'Shrapnel Blaster', blurb: 'Wide cone of metal death. Up close and personal.', weaponClass: 'spread', unlockCost: 4000, baseUpgradeCost: 3000, accent: 'amber' },
  { id: 'cryo_emitter', label: 'Cryo Emitter', blurb: 'Flash-freeze cone. Slows enemies to a crawl.', weaponClass: 'tech', unlockCost: 8000, baseUpgradeCost: 5000, accent: 'blue' },
  { id: 'void_reaper', label: 'Void Reaper', blurb: 'Forbidden chain scythe. Reality itself recoils.', weaponClass: 'forbidden', unlockCost: 50000, baseUpgradeCost: 15000, accent: 'purple' },
  // New weapons
  { id: 'lightning_coil', label: 'Lightning Coil', blurb: 'Arc lightning chains between foes. More targets, more carnage.', weaponClass: 'arc', unlockCost: 6000, baseUpgradeCost: 4000, accent: 'yellow' },
  { id: 'blade_wave', label: 'Blade Wave', blurb: 'Devastating sword aura arc. Obliterates everything in its path.', weaponClass: 'force', unlockCost: 10000, baseUpgradeCost: 6000, accent: 'rose' },
  { id: 'railgun', label: 'Railgun', blurb: 'Hypersonic penetrator. Punches through entire formations.', weaponClass: 'kinetic', unlockCost: 7000, baseUpgradeCost: 5000, accent: 'emerald' },
  { id: 'gravity_well', label: 'Gravity Well', blurb: 'Launches a singularity that pulls enemies together, then detonates.', weaponClass: 'singularity', unlockCost: 12000, baseUpgradeCost: 7000, accent: 'violet' },
  { id: 'swarm_missiles', label: 'Swarm Missiles', blurb: 'Volley of micro-missiles that lock onto nearest targets.', weaponClass: 'swarm', unlockCost: 8000, baseUpgradeCost: 5000, accent: 'red' },
  { id: 'beam_laser', label: 'Beam Laser', blurb: 'Continuous precision beam. Hold to burn through armor.', weaponClass: 'beam', unlockCost: 9000, baseUpgradeCost: 6000, accent: 'lime' },
  { id: 'ricochet_cannon', label: 'Ricochet Cannon', blurb: 'Bouncing rounds that careen between enemies.', weaponClass: 'kinetic', unlockCost: 6000, baseUpgradeCost: 4000, accent: 'teal' },
  { id: 'sonic_boom', label: 'Sonic Boom', blurb: 'Cone shockwave that sends enemies flying.', weaponClass: 'sonic', unlockCost: 7000, baseUpgradeCost: 4500, accent: 'sky' },
  { id: 'nano_swarm', label: 'Nano Swarm', blurb: 'Cloud of nanobots that eats through organic matter.', weaponClass: 'nano', unlockCost: 15000, baseUpgradeCost: 8000, accent: 'green' },
  { id: 'photon_burst', label: 'Photon Burst', blurb: 'Charge up, then unleash a massive energy nova.', weaponClass: 'photon', unlockCost: 11000, baseUpgradeCost: 6500, accent: 'yellow' },
  { id: 'plasma_whip', label: 'Plasma Whip', blurb: 'Crackling energy lash. Wide arc, brutal damage.', weaponClass: 'whip', unlockCost: 9000, baseUpgradeCost: 5500, accent: 'pink' },
  { id: 'warp_lance', label: 'Warp Lance', blurb: 'Teleport-strike. Blink behind enemies and impale them.', weaponClass: 'warp', unlockCost: 20000, baseUpgradeCost: 10000, accent: 'indigo' },
];

// Upgrade cost multipliers per level: Lv1→2, Lv2→3, Lv3→4, Lv4→5
const UPGRADE_COST_MULT = [1.0, 1.5, 2.5, 4.0];
export function getUpgradeCost(base: number, currentLevel: number): number {
  if (currentLevel >= MAX_WEAPON_LEVEL || currentLevel < 1) return Infinity;
  return Math.floor(base * UPGRADE_COST_MULT[currentLevel - 1]);
}

export type GamePhase = 'menu' | 'playing' | 'paused' | 'gameover';

// === LOOT DROP SYSTEM ===
export type LootType = 'health' | 'shield' | 'damage_boost' | 'speed_boost' | 'ammo_surge' | 'intel_cache';

export interface LootDrop {
  id: number;
  position: [number, number, number];
  type: LootType;
  spawnedAt: number; // performance.now()
}

export interface ActiveBuff {
  type: 'damage_boost' | 'speed_boost' | 'ammo_surge' | 'shield';
  expiresAt: number; // performance.now() + duration
  value: number;
}

export const LOOT_CONFIG: Record<LootType, { color: string; label: string; dropWeight: number }> = {
  health:       { color: '#22c55e', label: 'HEALTH',       dropWeight: 30 },
  shield:       { color: '#3b82f6', label: 'SHIELD',       dropWeight: 15 },
  damage_boost: { color: '#ef4444', label: 'DAMAGE BOOST', dropWeight: 12 },
  speed_boost:  { color: '#eab308', label: 'SPEED BOOST',  dropWeight: 10 },
  ammo_surge:   { color: '#f97316', label: 'AMMO SURGE',   dropWeight: 8 },
  intel_cache:  { color: '#06b6d4', label: 'INTEL',        dropWeight: 25 },
};

// Drop chance per enemy type
const DROP_CHANCE: Record<EnemyType, number> = {
  swarmer: 0.2, bomber: 0.35, juggernaut: 0.5,
  spitter: 0.2, charger: 0.25, shielder: 0.3, phantom: 0.4,
};

function rollLootDrop(enemyType: EnemyType, position: [number, number, number]): LootDrop | null {
  if (Math.random() > DROP_CHANCE[enemyType]) return null;
  // Weighted random selection
  const entries = Object.entries(LOOT_CONFIG) as [LootType, typeof LOOT_CONFIG[LootType]][];
  const totalWeight = entries.reduce((s, [, v]) => s + v.dropWeight, 0);
  let roll = Math.random() * totalWeight;
  for (const [type, cfg] of entries) {
    roll -= cfg.dropWeight;
    if (roll <= 0) return { id: nextId(), position: [...position] as [number, number, number], type, spawnedAt: performance.now() };
  }
  return { id: nextId(), position: [...position] as [number, number, number], type: 'health', spawnedAt: performance.now() };
}
// === END LOOT ===

// === ENEMY PROJECTILES ===
export interface EnemyProjectile {
  id: number;
  position: [number, number, number];
  velocity: [number, number, number];
  damage: number;
  color: string;
  spawnedAt: number;
}
// === END ENEMY PROJECTILES ===

// === COMBO SYSTEM ===
export interface ComboState {
  count: number;
  multiplier: number;
  lastKillAt: number;
  maxCombo: number;
}

const COMBO_WINDOW = 3000; // 3 seconds to keep combo alive
const COMBO_TIERS = [
  { threshold: 0, label: '', multiplier: 1.0, color: '#ffffff' },
  { threshold: 3, label: 'COMBO', multiplier: 1.5, color: '#22d3ee' },
  { threshold: 6, label: 'RAMPAGE', multiplier: 2.0, color: '#f59e0b' },
  { threshold: 10, label: 'CARNAGE', multiplier: 2.5, color: '#ef4444' },
  { threshold: 15, label: 'MASSACRE', multiplier: 3.0, color: '#f97316' },
  { threshold: 20, label: 'GODLIKE', multiplier: 4.0, color: '#a855f7' },
  { threshold: 30, label: 'NOVA STREAK', multiplier: 5.0, color: '#ec4899' },
];

export function getComboTier(count: number) {
  let tier = COMBO_TIERS[0];
  for (const t of COMBO_TIERS) {
    if (count >= t.threshold) tier = t;
  }
  return tier;
}
// === END COMBO ===

export interface EnemyData {
  id: number;
  position: [number, number, number];
  type: EnemyType;
  health: number;
  maxHealth: number;
}

export interface ExplosionData {
  id: number;
  position: [number, number, number];
  color: string;
  type: ExplosionType;
}

export interface HudSettings {
  reticleScale: number;
  highContrastReticle: boolean;
  reducedMotion: boolean;
  sfxVolume: number;
  musicVolume: number;
  mouseSensitivity: number;
}

// Monotonic ID counter — guaranteed unique, no Date.now() collisions
let _nextId = 1;
function nextId() { return _nextId++; }

interface GameState {
  gamePhase: GamePhase;
  score: number;
  level: number;
  killsThisLevel: number;
  totalKills: number;
  enemies: EnemyData[];
  enemyProjectiles: EnemyProjectile[];
  explosions: ExplosionData[];
  isPaused: boolean;
  isGameOver: boolean;
  playerHealth: number;
  playerMaxHealth: number;
  equippedWeapon: WeaponType;
  weaponLevels: Record<WeaponType, number>;
  hudSettings: HudSettings;
  // Combo
  combo: ComboState;
  registerKill: () => void;
  tickCombo: () => void;
  //
  incScore: (val: number) => void;
  damageEnemy: (id: number, amount: number) => void;
  removeEnemy: (id: number) => void;
  spawnEnemies: (playerPos?: [number, number, number]) => void;
  addExplosion: (position: [number, number, number], color: string, type?: ExplosionType) => void;
  removeExplosion: (id: number) => void;
  setPaused: (val: boolean) => void;
  setGamePhase: (phase: GamePhase) => void;
  startGame: () => void;
  damagePlayer: (amount: number) => void;
  resetGame: () => void;
  buyWeaponUpgrade: (weapon: WeaponType, cost: number) => boolean;
  equipWeapon: (weapon: WeaponType) => void;
  cycleReticleScale: () => void;
  toggleHighContrastReticle: () => void;
  toggleReducedMotion: () => void;
  setSfxVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setMouseSensitivity: (v: number) => void;
  // Loot
  lootDrops: LootDrop[];
  activeBuffs: ActiveBuff[];
  shieldHP: number;
  spawnLootDrop: (enemyType: EnemyType, position: [number, number, number]) => void;
  collectLoot: (id: number) => void;
  removeLootDrop: (id: number) => void;
  tickBuffs: () => void;
  // Enemy projectiles
  spawnEnemyProjectile: (pos: [number, number, number], vel: [number, number, number], damage: number, color: string) => void;
  tickEnemyProjectiles: (playerPos: [number, number, number]) => void;
  destroyEnemyProjectile: (id: number) => void;
  // Save system
  saveGame: () => void;
  loadGame: () => boolean;
  hasSave: () => boolean;
  deleteSave: () => void;
}

// === SAVE SYSTEM ===
const SAVE_KEY = 'nova_save';

interface SaveData {
  level: number;
  score: number;
  totalKills: number;
  weaponLevels: Record<string, number>;
  equippedWeapon: string;
  playerHealth: number;
  hudSettings: HudSettings;
  savedAt: number;
}

function writeSave(data: SaveData) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {}
}

function readSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch { return null; }
}
// === END SAVE ===

const INITIAL_ENEMIES: EnemyData[] = [
  { id: nextId(), position: [0, 4, -30], type: 'swarmer', health: 1, maxHealth: 1 },
  { id: nextId(), position: [20, 3, -35], type: 'juggernaut', health: 5, maxHealth: 5 },
  { id: nextId(), position: [-18, 5, -28], type: 'swarmer', health: 1, maxHealth: 1 },
  { id: nextId(), position: [25, 4, -20], type: 'bomber', health: 2, maxHealth: 2 },
  { id: nextId(), position: [-22, 3, -25], type: 'swarmer', health: 1, maxHealth: 1 },
];

const PLAYER_MAX_HEALTH = 200;

export const useStore = create<GameState>((set) => ({
  gamePhase: 'menu' as GamePhase,
  score: 0,
  level: 1,
  killsThisLevel: 0,
  totalKills: 0,
  enemies: INITIAL_ENEMIES,
  enemyProjectiles: [],
  explosions: [],
  isPaused: true,
  isGameOver: false,
  playerHealth: PLAYER_MAX_HEALTH,
  playerMaxHealth: PLAYER_MAX_HEALTH,
  equippedWeapon: 'pulse_pistol' as WeaponType,
  weaponLevels: {
    pulse_pistol: 1, plasma_caster: 0, frag_launcher: 0, shrapnel_blaster: 0, cryo_emitter: 0, void_reaper: 0,
    lightning_coil: 0, blade_wave: 0, railgun: 0, gravity_well: 0, swarm_missiles: 0, beam_laser: 0,
    ricochet_cannon: 0, sonic_boom: 0, nano_swarm: 0, photon_burst: 0, plasma_whip: 0, warp_lance: 0,
  } as Record<WeaponType, number>,
  combo: { count: 0, multiplier: 1, lastKillAt: 0, maxCombo: 0 },
  hudSettings: {
    reticleScale: 1,
    highContrastReticle: false,
    reducedMotion: false,
    sfxVolume: 0.5,
    musicVolume: 0.3,
    mouseSensitivity: 1.0,
  },
  // Loot state
  lootDrops: [],
  activeBuffs: [],
  shieldHP: 0,
  incScore: (val) => set((state) => ({ score: state.score + val })),
  setPaused: (val) => {
    set({ isPaused: val });
    if (val) setTimeout(() => useStore.getState().saveGame(), 0);
  },
  setGamePhase: (phase) => set({ gamePhase: phase, isPaused: phase !== 'playing', isGameOver: phase === 'gameover' }),
  startGame: () => set({
    gamePhase: 'playing' as GamePhase,
    isPaused: false,
    isGameOver: false,
    score: 0,
    level: 1,
    killsThisLevel: 0,
    totalKills: 0,
    playerHealth: PLAYER_MAX_HEALTH,
    playerMaxHealth: PLAYER_MAX_HEALTH,
    equippedWeapon: 'pulse_pistol' as WeaponType,
    weaponLevels: { pulse_pistol: 1, plasma_caster: 0, frag_launcher: 0, shrapnel_blaster: 0, cryo_emitter: 0, void_reaper: 0, lightning_coil: 0, blade_wave: 0, railgun: 0, gravity_well: 0, swarm_missiles: 0, beam_laser: 0, ricochet_cannon: 0, sonic_boom: 0, nano_swarm: 0, photon_burst: 0, plasma_whip: 0, warp_lance: 0 },
    combo: { count: 0, multiplier: 1, lastKillAt: 0, maxCombo: 0 },
    enemies: [
      { id: nextId(), position: [0, 4, -30] as [number,number,number], type: 'swarmer' as EnemyType, health: 1, maxHealth: 1 },
      { id: nextId(), position: [20, 3, -35] as [number,number,number], type: 'swarmer' as EnemyType, health: 1, maxHealth: 1 },
      { id: nextId(), position: [-18, 5, -28] as [number,number,number], type: 'swarmer' as EnemyType, health: 1, maxHealth: 1 },
    ],
    explosions: [],
    enemyProjectiles: [],
    lootDrops: [],
    activeBuffs: [],
    shieldHP: 0,
  }),

  damagePlayer: (amount) => set((state) => {
    let remaining = amount;
    let newShield = state.shieldHP;
    // Shield absorbs damage first
    if (newShield > 0) {
      const absorbed = Math.min(newShield, remaining);
      newShield -= absorbed;
      remaining -= absorbed;
    }
    const newHealth = Math.max(0, state.playerHealth - remaining);
    if (newHealth <= 0) {
      return { playerHealth: 0, shieldHP: 0, isGameOver: true, isPaused: true, gamePhase: 'gameover' as GamePhase };
    }
    return { playerHealth: newHealth, shieldHP: newShield };
  }),

  resetGame: () => set({
    gamePhase: 'menu' as GamePhase,
    score: 0,
    level: 1,
    killsThisLevel: 0,
    totalKills: 0,
    enemies: [
      { id: nextId(), position: [0, 4, -30], type: 'swarmer', health: 1, maxHealth: 1 },
      { id: nextId(), position: [20, 3, -35], type: 'swarmer', health: 1, maxHealth: 1 },
      { id: nextId(), position: [-18, 5, -28], type: 'swarmer', health: 1, maxHealth: 1 },
    ],
    explosions: [],
    enemyProjectiles: [],
    lootDrops: [],
    activeBuffs: [],
    shieldHP: 0,
    isPaused: true,
    isGameOver: false,
    playerHealth: PLAYER_MAX_HEALTH,
    playerMaxHealth: PLAYER_MAX_HEALTH,
    equippedWeapon: 'pulse_pistol',
    weaponLevels: { pulse_pistol: 1, plasma_caster: 0, frag_launcher: 0, shrapnel_blaster: 0, cryo_emitter: 0, void_reaper: 0, lightning_coil: 0, blade_wave: 0, railgun: 0, gravity_well: 0, swarm_missiles: 0, beam_laser: 0, ricochet_cannon: 0, sonic_boom: 0, nano_swarm: 0, photon_burst: 0, plasma_whip: 0, warp_lance: 0 },
    combo: { count: 0, multiplier: 1, lastKillAt: 0, maxCombo: 0 },
  }),
  buyWeaponUpgrade: (weapon, cost) => {
    let success = false;
    set((state) => {
      if (state.score >= cost) {
        success = true;
        const newLevel = state.weaponLevels[weapon] + 1;
        return {
          score: state.score - cost,
          weaponLevels: { ...state.weaponLevels, [weapon]: newLevel },
          equippedWeapon: state.weaponLevels[weapon] === 0 ? weapon : state.equippedWeapon
        };
      }
      return state;
    });
    return success;
  },
  equipWeapon: (weapon) => set((state) => {
    if (state.weaponLevels[weapon] > 0) {
      return { equippedWeapon: weapon };
    }
    return state;
  }),
  cycleReticleScale: () => set((state) => {
    const current = state.hudSettings.reticleScale;
    const steps = [0.6, 0.8, 1.0, 1.2, 1.45];
    const idx = steps.findIndex(s => current <= s + 0.01);
    const next = steps[(idx + 1) % steps.length];
    return { hudSettings: { ...state.hudSettings, reticleScale: next } };
  }),
  toggleHighContrastReticle: () => set((state) => ({
    hudSettings: {
      ...state.hudSettings,
      highContrastReticle: !state.hudSettings.highContrastReticle
    }
  })),
  toggleReducedMotion: () => set((state) => ({
    hudSettings: {
      ...state.hudSettings,
      reducedMotion: !state.hudSettings.reducedMotion
    }
  })),
  setSfxVolume: (v) => set((state) => ({
    hudSettings: { ...state.hudSettings, sfxVolume: Math.max(0, Math.min(1, v)) }
  })),
  setMusicVolume: (v) => set((state) => ({
    hudSettings: { ...state.hudSettings, musicVolume: Math.max(0, Math.min(1, v)) }
  })),
  setMouseSensitivity: (v) => set((state) => ({
    hudSettings: { ...state.hudSettings, mouseSensitivity: Math.max(0.1, Math.min(3, v)) }
  })),
  damageEnemy: (id, amount) => set((state) => ({
    enemies: state.enemies.map(e => e.id === id ? { ...e, health: e.health - amount } : e)
  })),
  removeEnemy: (id) => set((state) => {
    const newEnemies = state.enemies.filter(e => e.id !== id);
    if (newEnemies.length < state.enemies.length) {
      const kills = state.killsThisLevel + 1;
      const newTotal = state.totalKills + 1;
      const requiredKills = state.level * 10;
      // Combo tracking
      const now = performance.now();
      const comboActive = state.combo.lastKillAt > 0 && (now - state.combo.lastKillAt) < COMBO_WINDOW;
      const newCount = comboActive ? state.combo.count + 1 : 1;
      const tier = getComboTier(newCount);
      const newCombo: ComboState = {
        count: newCount,
        multiplier: tier.multiplier,
        lastKillAt: now,
        maxCombo: Math.max(state.combo.maxCombo, newCount),
      };
      if (newCount >= 3) {
        window.dispatchEvent(new CustomEvent('nova:combo', { detail: { count: newCount, tier: tier.label, multiplier: tier.multiplier } }));
      }
      if (kills >= requiredKills) {
        const newLevel = state.level + 1;
        window.dispatchEvent(new CustomEvent('nova:levelup', { detail: { level: newLevel } }));
        setTimeout(() => useStore.getState().saveGame(), 0);
        return {
          enemies: newEnemies,
          killsThisLevel: 0,
          totalKills: newTotal,
          level: newLevel,
          combo: newCombo,
        };
      }
      return {
        enemies: newEnemies,
        killsThisLevel: kills,
        totalKills: newTotal,
        combo: newCombo,
      };
    }
    return { enemies: newEnemies };
  }),
  registerKill: () => set((state) => {
    const now = performance.now();
    const comboActive = state.combo.lastKillAt > 0 && (now - state.combo.lastKillAt) < COMBO_WINDOW;
    const newCount = comboActive ? state.combo.count + 1 : 1;
    const tier = getComboTier(newCount);
    return { combo: { count: newCount, multiplier: tier.multiplier, lastKillAt: now, maxCombo: Math.max(state.combo.maxCombo, newCount) } };
  }),
  tickCombo: () => set((state) => {
    if (state.combo.count === 0) return state;
    const now = performance.now();
    if ((now - state.combo.lastKillAt) > COMBO_WINDOW) {
      return { combo: { ...state.combo, count: 0, multiplier: 1 } };
    }
    return state;
  }),
  spawnEnemies: (playerPos) => set((state) => {
    const maxEnemies = 5 + state.level * 3;
    if (state.enemies.length >= maxEnemies) return state;
    
    // Build spawn pool based on level — new types phase in gradually
    const types: EnemyType[] = ['swarmer', 'swarmer', 'swarmer'];
    if (state.level >= 2) types.push('spitter', 'spitter');
    if (state.level >= 3) types.push('bomber', 'bomber', 'charger');
    if (state.level >= 4) types.push('shielder');
    if (state.level >= 5) types.push('juggernaut');
    if (state.level >= 6) types.push('phantom', 'charger');
    if (state.level >= 7) types.push('juggernaut', 'bomber', 'phantom');
    
    const type = types[Math.floor(Math.random() * types.length)];
    const healthMultiplier = 1 + (state.level * 0.2);
    const baseHealth: Record<EnemyType, number> = {
      swarmer: 1, spitter: 2, bomber: 2, charger: 4, shielder: 3, juggernaut: 5, phantom: 3,
    };
    const maxHealth = Math.floor((baseHealth[type] ?? 1) * healthMultiplier);

    // Spawn 35-50 units from the PLAYER (not origin), clamped to arena bounds
    const cx = playerPos ? playerPos[0] : 0;
    const cz = playerPos ? playerPos[2] : 0;
    const angle = Math.random() * Math.PI * 2;
    const dist = 35 + Math.random() * 15;
    const x = Math.max(-48, Math.min(48, cx + Math.cos(angle) * dist));
    const z = Math.max(-48, Math.min(48, cz + Math.sin(angle) * dist));

    return {
      enemies: [
        ...state.enemies,
        {
          id: nextId(),
          position: [x, Math.random() * 10 + 2, z],
          type,
          health: maxHealth,
          maxHealth
        }
      ]
    };
  }),
  addExplosion: (position, color, type = 'energy') => set((state) => ({
    explosions: [...state.explosions, { id: nextId(), position, color, type }]
  })),
  removeExplosion: (id) => set((state) => ({
    explosions: state.explosions.filter(e => e.id !== id)
  })),

  // === LOOT ACTIONS ===
  spawnLootDrop: (enemyType, position) => set((state) => {
    const drop = rollLootDrop(enemyType, position);
    if (!drop) return state;
    return { lootDrops: [...state.lootDrops, drop] };
  }),

  collectLoot: (id) => set((state) => {
    const drop = state.lootDrops.find(d => d.id === id);
    if (!drop) return state;
    const newDrops = state.lootDrops.filter(d => d.id !== id);
    const now = performance.now();
    switch (drop.type) {
      case 'health': {
        const heal = Math.min(50, state.playerMaxHealth - state.playerHealth);
        return { lootDrops: newDrops, playerHealth: state.playerHealth + heal };
      }
      case 'shield':
        return { lootDrops: newDrops, shieldHP: Math.min(state.shieldHP + 30, 100), activeBuffs: [...state.activeBuffs.filter(b => b.type !== 'shield'), { type: 'shield' as const, expiresAt: now + 30000, value: 30 }] };
      case 'damage_boost':
        return { lootDrops: newDrops, activeBuffs: [...state.activeBuffs.filter(b => b.type !== 'damage_boost'), { type: 'damage_boost' as const, expiresAt: now + 10000, value: 1.5 }] };
      case 'speed_boost':
        return { lootDrops: newDrops, activeBuffs: [...state.activeBuffs.filter(b => b.type !== 'speed_boost'), { type: 'speed_boost' as const, expiresAt: now + 8000, value: 1.4 }] };
      case 'ammo_surge':
        return { lootDrops: newDrops, activeBuffs: [...state.activeBuffs.filter(b => b.type !== 'ammo_surge'), { type: 'ammo_surge' as const, expiresAt: now + 6000, value: 2.0 }] };
      case 'intel_cache':
        return { lootDrops: newDrops, score: state.score + 500 };
      default:
        return { lootDrops: newDrops };
    }
  }),

  removeLootDrop: (id) => set((state) => ({
    lootDrops: state.lootDrops.filter(d => d.id !== id)
  })),

  tickBuffs: () => set((state) => {
    const now = performance.now();
    const active = state.activeBuffs.filter(b => b.expiresAt > now);
    const hadShield = state.activeBuffs.some(b => b.type === 'shield');
    const hasShield = active.some(b => b.type === 'shield');
    return {
      activeBuffs: active,
      shieldHP: hadShield && !hasShield ? 0 : state.shieldHP,
    };
  }),

  // === ENEMY PROJECTILES ===
  spawnEnemyProjectile: (pos, vel, damage, color) => set((state) => ({
    enemyProjectiles: [...state.enemyProjectiles, { id: nextId(), position: pos, velocity: vel, damage, color, spawnedAt: performance.now() }],
  })),

  tickEnemyProjectiles: (playerPos) => set((state) => {
    const now = performance.now();
    const HIT_RANGE = 2.0;
    const MAX_LIFETIME = 3000;
    const surviving: EnemyProjectile[] = [];
    let totalDamage = 0;
    for (const p of state.enemyProjectiles) {
      if (now - p.spawnedAt > MAX_LIFETIME) continue; // expired
      const dx = p.position[0] - playerPos[0];
      const dy = p.position[1] - playerPos[1];
      const dz = p.position[2] - playerPos[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < HIT_RANGE) {
        totalDamage += p.damage;
        continue; // hit player, remove
      }
      surviving.push(p);
    }
    if (totalDamage > 0) {
      // Apply damage through shield first
      let remaining = totalDamage;
      let newShield = state.shieldHP;
      if (newShield > 0) {
        const absorbed = Math.min(newShield, remaining);
        newShield -= absorbed;
        remaining -= absorbed;
      }
      const newHealth = Math.max(0, state.playerHealth - remaining);
      window.dispatchEvent(new CustomEvent('nova:playerHit', { detail: { damage: totalDamage } }));
      if (newHealth <= 0) {
        return { enemyProjectiles: surviving, playerHealth: 0, shieldHP: newShield, gamePhase: 'gameover' as GamePhase, isPaused: true, isGameOver: true };
      }
      return { enemyProjectiles: surviving, playerHealth: newHealth, shieldHP: newShield };
    }
    return { enemyProjectiles: surviving };
  }),

  destroyEnemyProjectile: (id) => set((state) => ({
    enemyProjectiles: state.enemyProjectiles.filter(p => p.id !== id),
  })),

  // === SAVE SYSTEM ===
  saveGame: () => {
    const s = useStore.getState();
    writeSave({
      level: s.level,
      score: s.score,
      totalKills: s.totalKills,
      weaponLevels: s.weaponLevels,
      equippedWeapon: s.equippedWeapon,
      playerHealth: s.playerHealth,
      hudSettings: s.hudSettings,
      savedAt: Date.now(),
    });
  },

  loadGame: () => {
    const data = readSave();
    if (!data) return false;
    useStore.setState({
      gamePhase: 'playing' as GamePhase,
      isPaused: false,
      isGameOver: false,
      level: data.level,
      score: data.score,
      totalKills: data.totalKills,
      killsThisLevel: 0,
      weaponLevels: data.weaponLevels as Record<WeaponType, number>,
      equippedWeapon: data.equippedWeapon as WeaponType,
      playerHealth: data.playerHealth,
      playerMaxHealth: PLAYER_MAX_HEALTH,
      hudSettings: { ...useStore.getState().hudSettings, ...data.hudSettings },
      enemies: [],
      enemyProjectiles: [],
      explosions: [],
      lootDrops: [],
      activeBuffs: [],
      shieldHP: 0,
    });
    return true;
  },

  hasSave: () => readSave() !== null,

  deleteSave: () => {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
  },
}));
