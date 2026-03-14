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
  enemies: INITIAL_ENEMIES,
  explosions: [],
  isPaused: true,
  incScore: (val) => set((state) => ({ score: state.score + val })),
  setPaused: (val) => set({ isPaused: val }),
  damageEnemy: (id, amount) => set((state) => ({
    enemies: state.enemies.map(e => e.id === id ? { ...e, health: e.health - amount } : e)
  })),
  removeEnemy: (id) => set((state) => ({
    enemies: state.enemies.filter(e => e.id !== id)
  })),
  spawnEnemies: () => set((state) => {
    // Only spawn if we are under a threshold to keep it playable
    if (state.enemies.length > 50) return state;
    
    // Weighted probabilities
    const types: EnemyType[] = ['swarmer', 'swarmer', 'swarmer', 'swarmer', 'bomber', 'bomber', 'juggernaut'];
    const type = types[Math.floor(Math.random() * types.length)];
    const maxHealth = type === 'juggernaut' ? 5 : type === 'bomber' ? 2 : 1;

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
