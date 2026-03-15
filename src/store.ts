import { create } from 'zustand';

export type EnemyType = 'swarmer' | 'juggernaut' | 'bomber';

export type WeaponClass = 'kinetic' | 'energy' | 'explosive' | 'spread' | 'tech' | 'forbidden';
export type WeaponType = 'pulse_pistol' | 'plasma_caster' | 'frag_launcher' | 'shrapnel_blaster' | 'cryo_emitter' | 'void_reaper';
export type ExplosionType = 'kinetic' | 'energy' | 'explosive' | 'spread' | 'tech' | 'forbidden';

export const WEAPON_CLASS: Record<WeaponType, WeaponClass> = {
  pulse_pistol: 'kinetic',
  plasma_caster: 'energy',
  frag_launcher: 'explosive',
  shrapnel_blaster: 'spread',
  cryo_emitter: 'tech',
  void_reaper: 'forbidden',
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
const DROP_CHANCE: Record<EnemyType, number> = { swarmer: 0.2, bomber: 0.35, juggernaut: 0.5 };

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
  explosions: ExplosionData[];
  isPaused: boolean;
  isGameOver: boolean;
  playerHealth: number;
  playerMaxHealth: number;
  equippedWeapon: WeaponType;
  weaponLevels: Record<WeaponType, number>;
  hudSettings: HudSettings;
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
  // Loot
  lootDrops: LootDrop[];
  activeBuffs: ActiveBuff[];
  shieldHP: number;
  spawnLootDrop: (enemyType: EnemyType, position: [number, number, number]) => void;
  collectLoot: (id: number) => void;
  removeLootDrop: (id: number) => void;
  tickBuffs: () => void;
}

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
  explosions: [],
  isPaused: true,
  isGameOver: false,
  playerHealth: PLAYER_MAX_HEALTH,
  playerMaxHealth: PLAYER_MAX_HEALTH,
  equippedWeapon: 'pulse_pistol' as WeaponType,
  weaponLevels: {
    pulse_pistol: 1,
    plasma_caster: 0,
    frag_launcher: 0,
    shrapnel_blaster: 0,
    cryo_emitter: 0,
    void_reaper: 0,
  } as Record<WeaponType, number>,
  hudSettings: {
    reticleScale: 1,
    highContrastReticle: false,
    reducedMotion: false
  },
  // Loot state
  lootDrops: [],
  activeBuffs: [],
  shieldHP: 0,
  incScore: (val) => set((state) => ({ score: state.score + val })),
  setPaused: (val) => set({ isPaused: val }),
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
    weaponLevels: { pulse_pistol: 1, plasma_caster: 0, frag_launcher: 0, shrapnel_blaster: 0, cryo_emitter: 0, void_reaper: 0 },
    enemies: [
      { id: nextId(), position: [0, 4, -30] as [number,number,number], type: 'swarmer' as EnemyType, health: 1, maxHealth: 1 },
      { id: nextId(), position: [20, 3, -35] as [number,number,number], type: 'swarmer' as EnemyType, health: 1, maxHealth: 1 },
      { id: nextId(), position: [-18, 5, -28] as [number,number,number], type: 'swarmer' as EnemyType, health: 1, maxHealth: 1 },
    ],
    explosions: [],
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
    lootDrops: [],
    activeBuffs: [],
    shieldHP: 0,
    isPaused: true,
    isGameOver: false,
    playerHealth: PLAYER_MAX_HEALTH,
    playerMaxHealth: PLAYER_MAX_HEALTH,
    equippedWeapon: 'pulse_pistol',
    weaponLevels: { pulse_pistol: 1, plasma_caster: 0, frag_launcher: 0, shrapnel_blaster: 0, cryo_emitter: 0, void_reaper: 0 },
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
  damageEnemy: (id, amount) => set((state) => ({
    enemies: state.enemies.map(e => e.id === id ? { ...e, health: e.health - amount } : e)
  })),
  removeEnemy: (id) => set((state) => {
    const newEnemies = state.enemies.filter(e => e.id !== id);
    if (newEnemies.length < state.enemies.length) {
      const kills = state.killsThisLevel + 1;
      const newTotal = state.totalKills + 1;
      const requiredKills = state.level * 10;
      if (kills >= requiredKills) {
        return {
          enemies: newEnemies,
          killsThisLevel: 0,
          totalKills: newTotal,
          level: Math.min(state.level + 1, 10)
        };
      }
      return {
        enemies: newEnemies,
        killsThisLevel: kills,
        totalKills: newTotal,
      };
    }
    return { enemies: newEnemies };
  }),
  spawnEnemies: (playerPos) => set((state) => {
    const maxEnemies = 5 + state.level * 3;
    if (state.enemies.length >= maxEnemies) return state;
    
    const types: EnemyType[] = ['swarmer', 'swarmer', 'swarmer'];
    if (state.level > 2) types.push('bomber', 'bomber');
    if (state.level > 4) types.push('juggernaut');
    if (state.level > 6) types.push('juggernaut', 'bomber');
    
    const type = types[Math.floor(Math.random() * types.length)];
    const healthMultiplier = 1 + (state.level * 0.2);
    const baseHealth = type === 'juggernaut' ? 5 : type === 'bomber' ? 2 : 1;
    const maxHealth = Math.floor(baseHealth * healthMultiplier);

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
}));
