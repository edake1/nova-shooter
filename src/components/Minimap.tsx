"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/store";

const MAP_SIZE = 140;
const MAP_RANGE = 50; // world units visible on the map

export function Minimap({ playerPos }: { playerPos: [number, number, number] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const enemies = useStore((s) => s.enemies);
  const gamePhase = useStore((s) => s.gamePhase);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || gamePhase !== 'playing') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const half = MAP_SIZE / 2;
    const scale = MAP_SIZE / (MAP_RANGE * 2);

    ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();

    // Grid rings
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.1)';
    ctx.lineWidth = 0.5;
    for (const r of [0.33, 0.66, 1]) {
      ctx.beginPath();
      ctx.arc(half, half, half * r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Crosshair
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)';
    ctx.beginPath();
    ctx.moveTo(half, 0);
    ctx.lineTo(half, MAP_SIZE);
    ctx.moveTo(0, half);
    ctx.lineTo(MAP_SIZE, half);
    ctx.stroke();

    // Enemy dots
    for (const e of enemies) {
      const dx = (e.position[0] - playerPos[0]) * scale;
      const dz = (e.position[2] - playerPos[2]) * scale;
      const ex = half + dx;
      const ey = half + dz;

      // Skip if outside circle
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > half - 2) continue;

      const colors: Record<string, string> = {
        swarmer: '#ff0044',
        spitter: '#aa00ff',
        charger: '#ff6600',
        shielder: '#0066ff',
        bomber: '#ffaa00',
        juggernaut: '#0088ff',
        phantom: '#00ff88',
        hive_queen: '#ff00aa',
      };
      const dotSize = e.type === 'juggernaut' || e.type === 'hive_queen' ? 3 : 2;

      ctx.fillStyle = colors[e.type] ?? '#ff0044';
      ctx.beginPath();
      ctx.arc(ex, ey, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player dot (center)
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(half, half, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [enemies, playerPos, gamePhase]);

  if (gamePhase !== 'playing') return null;

  return (
    <div className="absolute bottom-20 left-4 z-20 pointer-events-none">
      <canvas
        ref={canvasRef}
        width={MAP_SIZE}
        height={MAP_SIZE}
        className="rounded-full border border-cyan-500/30"
        style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.2))' }}
      />
      <div className="text-center mt-1">
        <span className="font-mono text-[8px] text-cyan-500/40 uppercase tracking-widest">Radar</span>
      </div>
    </div>
  );
}
