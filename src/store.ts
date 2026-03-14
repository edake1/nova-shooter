import { create } from 'zustand';

export interface EnemyData {
  id: number;
  position: [number, number, number];
}

export interface DebrisData {
  id: number;
  position: [number, number, number];
  color: string;
}

interface GameState {
  score: number;
  enemies: EnemyData[];
  debris: DebrisData[];
  incScore: (val: number) => void;
  removeEnemy: (id: number) => void;
  spawnEnemies: () => void;
  addDebris: (position: [number, number, number], color: string, count: number) => void;
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
  debris: [],
  incScore: (val) => set((state) => ({ score: state.score + val })),
  removeEnemy: (id) => set((state) => ({
    enemies: state.enemies.filter(e => e.id !== id)
  })),
  spawnEnemies: () => set((state) => ({
    enemies: [
      ...state.enemies,
      {
        id: Date.now(),
        position: [
          (Math.random() - 0.5) * 40,
          Math.random() * 10 + 2,
          (Math.random() - 0.5) * 40
        ]
      }
    ]
  })),
  addDebris: (position, color, count) => set((state) => {
    const newDebris = Array.from({ length: count }).map((_, i) => ({
      id: Date.now() + i,
      position,
      color
    }));
    return { debris: [...state.debris, ...newDebris].slice(-100) }; // Keep max 100 particles
  })
}));
