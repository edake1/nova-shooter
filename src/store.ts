import { create } from 'zustand';

export interface EnemyData {
  id: number;
  position: [number, number, number];
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
  incScore: (val: number) => void;
  removeEnemy: (id: number) => void;
  spawnEnemies: () => void;
  addExplosion: (position: [number, number, number], color: string) => void;
  removeExplosion: (id: number) => void;
}

const INITIAL_ENEMIES: EnemyData[] = [
  { id: 1, position: [0, 4, -10] },
  { id: 2, position: [5, 3, -15] },
  { id: 3, position: [-5, 5, -12] },
  { id: 4, position: [8, 4, -8] },
  { id: 5, position: [-8, 3, -8] },
];

export const useStore = create<GameState>((set) => ({
  score: 0,
  enemies: INITIAL_ENEMIES,
  explosions: [],
  incScore: (val) => set((state) => ({ score: state.score + val })),
  removeEnemy: (id) => set((state) => ({
    enemies: state.enemies.filter(e => e.id !== id)
  })),
  spawnEnemies: () => set((state) => {
    // Only spawn if we are under a threshold to keep it playable
    if (state.enemies.length > 30) return state;
    return {
      enemies: [
        ...state.enemies,
        {
          id: Date.now(),
          position: [
            (Math.random() - 0.5) * 60,
            Math.random() * 10 + 2,
            (Math.random() - 0.5) * 60
          ]
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
