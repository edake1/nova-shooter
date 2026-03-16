"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useStore, WEAPON_PROFILES } from "@/store";
import type { WeaponType } from "@/store";

export function WeaponWheel() {
  const { equipWeapon, equippedWeapon, weaponLevels, gamePhase } = useStore();
  const [open, setOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Only show unlocked weapons (level >= 1)
  const unlocked = WEAPON_PROFILES.filter((w) => weaponLevels[w.id] >= 1);

  const handleSelect = useCallback(
    (weapon: WeaponType) => {
      equipWeapon(weapon);
      setOpen(false);
    },
    [equipWeapon]
  );

  // Q hold to open, release to close+select
  useEffect(() => {
    if (gamePhase !== "playing") {
      setOpen(false);
      return;
    }

    const down = (e: KeyboardEvent) => {
      const kb = useStore.getState().hudSettings.keyBinds;
      if (e.code === kb.weaponWheel && !e.repeat) {
        setOpen(true);
        centerRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      }
      // Number keys 1-9 for quick switch
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        const wep = unlocked[num - 1];
        if (wep) handleSelect(wep.id);
      }
    };
    const up = (e: KeyboardEvent) => {
      const kb = useStore.getState().hudSettings.keyBinds;
      if (e.code === kb.weaponWheel) {
        if (hoveredIdx >= 0 && hoveredIdx < unlocked.length) {
          handleSelect(unlocked[hoveredIdx].id);
        }
        setOpen(false);
        setHoveredIdx(-1);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [gamePhase, hoveredIdx, unlocked, handleSelect]);

  // Scroll to cycle weapons
  useEffect(() => {
    if (gamePhase !== "playing") return;
    const onWheel = (e: WheelEvent) => {
      if (open) return; // don't cycle while wheel is open
      const idx = unlocked.findIndex((w) => w.id === equippedWeapon);
      const dir = e.deltaY > 0 ? 1 : -1;
      const next = (idx + dir + unlocked.length) % unlocked.length;
      equipWeapon(unlocked[next].id);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [gamePhase, open, unlocked, equippedWeapon, equipWeapon]);

  // Track mouse angle relative to center for radial selection
  useEffect(() => {
    if (!open) return;
    const onMove = (e: MouseEvent) => {
      const cx = centerRef.current.x;
      const cy = centerRef.current.y;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 30) {
        setHoveredIdx(-1);
        return;
      }
      // Angle from 12-o'clock, clockwise
      let angle = Math.atan2(dx, -dy); // 0 = up, positive = clockwise
      if (angle < 0) angle += Math.PI * 2;
      const sliceSize = (Math.PI * 2) / unlocked.length;
      const idx = Math.floor(angle / sliceSize);
      setHoveredIdx(Math.min(idx, unlocked.length - 1));
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [open, unlocked.length]);

  if (!open || unlocked.length <= 1) return null;

  const ACCENT: Record<string, string> = {
    slate: "#94a3b8", cyan: "#22d3ee", orange: "#f97316",
    amber: "#f59e0b", blue: "#3b82f6", purple: "#a855f7",
  };

  const RADIUS = 120;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
      {/* Dim overlay */}
      <div className="absolute inset-0 bg-black/30" />
      {/* Center label */}
      <div className="absolute font-orbitron text-cyan-400/60 text-xs tracking-widest uppercase">SELECT WEAPON</div>
      {/* Radial items */}
      {unlocked.map((w, i) => {
        const sliceAngle = (Math.PI * 2) / unlocked.length;
        const angle = sliceAngle * i - Math.PI / 2; // start from top
        const x = Math.cos(angle) * RADIUS;
        const y = Math.sin(angle) * RADIUS;
        const isActive = w.id === equippedWeapon;
        const isHovered = hoveredIdx === i;
        const color = ACCENT[w.accent] ?? "#94a3b8";

        return (
          <div
            key={w.id}
            className="absolute transition-all duration-150"
            style={{
              transform: `translate(${x}px, ${y}px) scale(${isHovered ? 1.15 : 1})`,
            }}
          >
            <div
              className="rounded-xl border-2 px-3 py-2 text-center min-w-[100px] backdrop-blur-sm"
              style={{
                borderColor: isHovered ? color : isActive ? color : "rgba(100,200,255,0.2)",
                background: isHovered
                  ? `${color}30`
                  : isActive
                  ? `${color}15`
                  : "rgba(0,0,0,0.6)",
                boxShadow: isHovered ? `0 0 20px ${color}50` : isActive ? `0 0 10px ${color}30` : "none",
              }}
            >
              <div
                className="font-orbitron text-xs font-bold tracking-wider"
                style={{ color: isHovered || isActive ? color : "#94a3b8" }}
              >
                {w.label}
              </div>
              <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                LVL {weaponLevels[w.id]} &middot; {i + 1}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
