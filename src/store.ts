import { create } from 'zustand';

export type EnemyType = 'swarmer' | 'juggernaut' | 'bomber';
export type WeaponType = 'plasmacaster' | 'shrapnel' | 'bio' | 'nuke';
export type ExplosionType = 'plasma' | 'shrapnel' | 'bio' | 'nuke';

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
  spawnEnemies: () => void;
  addExplosion: (position: [number, number, number], color: string, type?: ExplosionType) => void;
  removeExplosion: (id: number) => void;
  setPaused: (val: boolean) => void;
  damagePlayer: (amount: number) => void;
  resetGame: () => void;
  buyWeaponUpgrade: (weapon: WeaponType, cost: number) => boolean;
  equipWeapon: (weapon: WeaponType) => void;
  cycleReticleScale: () => void;
  toggleHighContrastReticle: () => void;
  toggleReducedMotion: () => void;
}

const INITIAL_ENEMIES: EnemyData[] = [
  { id: nextId(), position: [0, 4, -10], type: 'swarmer', health: 1, maxHealth: 1 },
  { id: nextId(), position: [5, 3, -15], type: 'juggernaut', health: 5, maxHealth: 5 },
  { id: nextId(), position: [-5, 5, -12], type: 'swarmer', health: 1, maxHealth: 1 },
  { id: nextId(), position: [8, 4, -8], type: 'bomber', health: 2, maxHealth: 2 },
  { id: nextId(), position: [-8, 3, -8], type: 'swarmer', health: 1, maxHealth: 1 },
];

const PLAYER_MAX_HEALTH = 100;

export const useStore = create<GameState>((set) => ({
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
  equippedWeapon: 'plasmacaster',
  weaponLevels: {
    plasmacaster: 1,
    shrapnel: 0,
    bio: 0,
    nuke: 0
  },
  hudSettings: {
    reticleScale: 1,
    highContrastReticle: false,
    reducedMotion: false
  },
  incScore: (val) => set((state) => ({ score: state.score + val })),
  setPaused: (val) => set({ isPaused: val }),

  damagePlayer: (amount) => set((state) => {
    const newHealth = Math.max(0, state.playerHealth - amount);
    if (newHealth <= 0) {
      return { playerHealth: 0, isGameOver: true, isPaused: true };
    }
    return { playerHealth: newHealth };
  }),

  resetGame: () => set({
    score: 0,
    level: 1,
    killsThisLevel: 0,
    totalKills: 0,
    enemies: [
      { id: nextId(), position: [0, 4, -10], type: 'swarmer', health: 1, maxHealth: 1 },
      { id: nextId(), position: [5, 3, -15], type: 'swarmer', health: 1, maxHealth: 1 },
      { id: nextId(), position: [-5, 5, -12], type: 'swarmer', health: 1, maxHealth: 1 },
    ],
    explosions: [],
    isPaused: true,
    isGameOver: false,
    playerHealth: PLAYER_MAX_HEALTH,
    playerMaxHealth: PLAYER_MAX_HEALTH,
    equippedWeapon: 'plasmacaster',
    weaponLevels: { plasmacaster: 1, shrapnel: 0, bio: 0, nuke: 0 },
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
    const next = current < 1.2 ? 1.2 : current < 1.45 ? 1.45 : 1;
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
  spawnEnemies: () => set((state) => {
    const maxEnemies = 10 + state.level * 5;
    if (state.enemies.length > maxEnemies) return state;
    
    const types: EnemyType[] = ['swarmer', 'swarmer', 'swarmer'];
    if (state.level > 2) types.push('bomber', 'bomber');
    if (state.level > 4) types.push('juggernaut');
    if (state.level > 6) types.push('juggernaut', 'bomber');
    
    const type = types[Math.floor(Math.random() * types.length)];
    const healthMultiplier = 1 + (state.level * 0.2);
    const baseHealth = type === 'juggernaut' ? 5 : type === 'bomber' ? 2 : 1;
    const maxHealth = Math.floor(baseHealth * healthMultiplier);

    // Spawn within 30-45 units from origin (inside fog range, outside immediate view)
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 15;

    return {
      enemies: [
        ...state.enemies,
        {
          id: nextId(),
          position: [
            Math.cos(angle) * dist,
            Math.random() * 10 + 2,
            Math.sin(angle) * dist,
          ],
          type,
          health: maxHealth,
          maxHealth
        }
      ]
    };
  }),
  addExplosion: (position, color, type = 'plasma') => set((state) => ({
    explosions: [...state.explosions, { id: nextId(), position, color, type }]
  })),
  removeExplosion: (id) => set((state) => ({
    explosions: state.explosions.filter(e => e.id !== id)
  }))
}));
