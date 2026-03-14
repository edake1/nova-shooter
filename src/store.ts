import { create } from 'zustand';

export type EnemyType = 'swarmer' | 'juggernaut' | 'bomber';

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
}

interface GameState {
  score: number;
  level: number;
  killsThisLevel: number;
  enemies: EnemyData[];
  explosions: ExplosionData[];
  isPaused: boolean;
  incScore: (val: number) => void;
  damageEnemy: (id: number, amount: number) => void;
  removeEnemy: (id: number) => void;
  spawnEnemies: () => void;
  addExplosion: (position: [number, number, number], color: string) => void;
  removeExplosion: (id: number) => void;
  setPaused: (val: boolean) => void;
}

const INITIAL_ENEMIES: EnemyData[] = [
  { id: 1, position: [0, 4, -10], type: 'swarmer', health: 1, maxHealth: 1 },
  { id: 2, position: [5, 3, -15], type: 'juggernaut', health: 5, maxHealth: 5 },
  { id: 3, position: [-5, 5, -12], type: 'swarmer', health: 1, maxHealth: 1 },
  { id: 4, position: [8, 4, -8], type: 'bomber', health: 2, maxHealth: 2 },
  { id: 5, position: [-8, 3, -8], type: 'swarmer', health: 1, maxHealth: 1 },
];

export const useStore = create<GameState>((set) => ({
  score: 0,
  level: 1,
  killsThisLevel: 0,
  enemies: INITIAL_ENEMIES,
  explosions: [],
  isPaused: true,
  incScore: (val) => set((state) => ({ score: state.score + val })),
  setPaused: (val) => set({ isPaused: val }),
  damageEnemy: (id, amount) => set((state) => ({
    enemies: state.enemies.map(e => e.id === id ? { ...e, health: e.health - amount } : e)
  })),
  removeEnemy: (id) => set((state) => {
    const newEnemies = state.enemies.filter(e => e.id !== id);
    if (newEnemies.length < state.enemies.length) {
      const kills = state.killsThisLevel + 1;
      const requiredKills = state.level * 10;
      if (kills >= requiredKills) {
        return {
          enemies: newEnemies,
          killsThisLevel: 0,
          level: Math.min(state.level + 1, 10)
        };
      }
      return {
        enemies: newEnemies,
        killsThisLevel: kills
      };
    }
    return { enemies: newEnemies };
  }),
  spawnEnemies: () => set((state) => {
    const maxEnemies = 10 + state.level * 5;
    if (state.enemies.length > maxEnemies) return state;
    
    // Spawn tougher enemies based on level
    const types: EnemyType[] = ['swarmer', 'swarmer', 'swarmer'];
    if (state.level > 2) types.push('bomber', 'bomber');
    if (state.level > 4) types.push('juggernaut');
    if (state.level > 6) types.push('juggernaut', 'bomber');
    
    const type = types[Math.floor(Math.random() * types.length)];
    // Scale enemy health slightly with level
    const healthMultiplier = 1 + (state.level * 0.2);
    const baseHealth = type === 'juggernaut' ? 5 : type === 'bomber' ? 2 : 1;
    const maxHealth = Math.floor(baseHealth * healthMultiplier);

    return {
      enemies: [
        ...state.enemies,
        {
          id: Date.now(),
          position: [
            (Math.random() - 0.5) * 80,
            Math.random() * 10 + 2,
            (Math.random() - 0.5) * 80
          ],
          type,
          health: maxHealth,
          maxHealth
        }
      ]
    };
  }),
  addExplosion: (position, color) => set((state) => ({
    explosions: [...state.explosions, { id: Date.now() + Math.random(), position, color }]
  })),
  removeExplosion: (id) => set((state) => ({
    explosions: state.explosions.filter(e => e.id !== id)
  }))
}));
