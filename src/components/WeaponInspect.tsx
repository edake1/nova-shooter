"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { WeaponType } from "@/store";

const WEAPON_COLORS: Record<WeaponType, { barrel: string; emissive: string }> = {
  pulse_pistol:     { barrel: "#aaa",    emissive: "#ffffff" },
  plasma_caster:    { barrel: "#0ff",    emissive: "#00ffff" },
  frag_launcher:    { barrel: "#ff6600", emissive: "#ff4400" },
  shrapnel_blaster: { barrel: "#f59e0b", emissive: "#ff8800" },
  cryo_emitter:     { barrel: "#60a5fa", emissive: "#3b82f6" },
  void_reaper:      { barrel: "#a855f7", emissive: "#7c3aed" },
  lightning_coil:   { barrel: "#facc15", emissive: "#eab308" },
  blade_wave:       { barrel: "#fb7185", emissive: "#f43f5e" },
  railgun:          { barrel: "#34d399", emissive: "#10b981" },
  gravity_well:     { barrel: "#a78bfa", emissive: "#8b5cf6" },
  swarm_missiles:   { barrel: "#f87171", emissive: "#ef4444" },
  beam_laser:       { barrel: "#a3e635", emissive: "#84cc16" },
  ricochet_cannon:  { barrel: "#2dd4bf", emissive: "#14b8a6" },
  sonic_boom:       { barrel: "#38bdf8", emissive: "#0ea5e9" },
  nano_swarm:       { barrel: "#4ade80", emissive: "#22c55e" },
  photon_burst:     { barrel: "#facc15", emissive: "#eab308" },
  plasma_whip:      { barrel: "#f472b6", emissive: "#ec4899" },
  warp_lance:       { barrel: "#818cf8", emissive: "#6366f1" },
};

function DragControl({ groupRef }: { groupRef: React.RefObject<THREE.Group | null> }) {
  const isDragging = useRef(false);
  const prev = useRef({ x: 0, y: 0 });

  useFrame(({ gl }) => {
    const canvas = gl.domElement;
    if (!canvas.dataset.dragBound) {
      canvas.dataset.dragBound = '1';
      canvas.addEventListener('pointerdown', (e) => { isDragging.current = true; prev.current = { x: e.clientX, y: e.clientY }; });
      canvas.addEventListener('pointerup', () => { isDragging.current = false; });
      canvas.addEventListener('pointerleave', () => { isDragging.current = false; });
      canvas.addEventListener('pointermove', (e) => {
        if (!isDragging.current || !groupRef.current) return;
        const dx = e.clientX - prev.current.x;
        const dy = e.clientY - prev.current.y;
        groupRef.current.rotation.y += dx * 0.01;
        groupRef.current.rotation.x += dy * 0.01;
        prev.current = { x: e.clientX, y: e.clientY };
      });
    }
  });
  return null;
}

function InspectScene({ weapon, level }: { weapon: WeaponType; level: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const colors = WEAPON_COLORS[weapon];
  const effectiveLevel = Math.max(level, 1);
  const barrelWidth = 0.08 + (effectiveLevel >= 4 ? 0.02 : 0);
  const barrelLength = 0.6 + (effectiveLevel >= 4 ? 0.1 : 0);
  const glowIntensity = 1.5 + (effectiveLevel - 1) * 1.0;
  const isMastered = effectiveLevel >= 5;

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[2, 3, 2]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-2, -1, 3]} intensity={0.8} color={colors.emissive} />
      <DragControl groupRef={groupRef} />
      <group ref={groupRef} scale={2.8}>
        <mesh>
          <boxGeometry args={[barrelWidth, 0.15, barrelLength]} />
          <meshStandardMaterial color={isMastered ? '#1a1a2e' : '#111'} metalness={0.9} roughness={0.1} emissive={isMastered ? colors.emissive : '#000000'} emissiveIntensity={isMastered ? 0.3 : 0} />
        </mesh>
        <mesh position={[0, 0.08, 0.1]}>
          <boxGeometry args={[0.02, 0.05, barrelLength * 0.65]} />
          <meshStandardMaterial color={colors.barrel} emissive={colors.emissive} emissiveIntensity={glowIntensity} toneMapped={false} />
        </mesh>
        {effectiveLevel >= 2 && (
          <mesh position={[0, -0.08, 0.1]}>
            <boxGeometry args={[0.02, 0.03, barrelLength * 0.5]} />
            <meshStandardMaterial color={colors.barrel} emissive={colors.emissive} emissiveIntensity={glowIntensity * 0.7} toneMapped={false} />
          </mesh>
        )}
        {effectiveLevel >= 3 && (
          <>
            <mesh position={[0.045, 0, 0.05]}>
              <boxGeometry args={[0.01, 0.12, barrelLength * 0.4]} />
              <meshStandardMaterial color={colors.barrel} emissive={colors.emissive} emissiveIntensity={glowIntensity * 0.5} toneMapped={false} />
            </mesh>
            <mesh position={[-0.045, 0, 0.05]}>
              <boxGeometry args={[0.01, 0.12, barrelLength * 0.4]} />
              <meshStandardMaterial color={colors.barrel} emissive={colors.emissive} emissiveIntensity={glowIntensity * 0.5} toneMapped={false} />
            </mesh>
          </>
        )}
        {effectiveLevel >= 4 && (
          <mesh position={[0, 0, -barrelLength / 2 - 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.06, 0.01, 8, 16]} />
            <meshStandardMaterial color="#000" emissive={colors.emissive} emissiveIntensity={glowIntensity} toneMapped={false} />
          </mesh>
        )}
        {isMastered && (
          <mesh position={[0, 0, -0.05]}>
            <boxGeometry args={[barrelWidth + 0.04, 0.2, barrelLength + 0.06]} />
            <meshStandardMaterial color="#000" emissive={colors.emissive} emissiveIntensity={2} transparent opacity={0.08} toneMapped={false} />
          </mesh>
        )}
      </group>
    </>
  );
}

export default function WeaponInspect({ weapon, level, onClose }: { weapon: WeaponType; level: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-[420px] h-[340px] bg-slate-950/95 border border-cyan-900/40 rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 z-10 bg-gradient-to-b from-slate-950 to-transparent">
          <span className="font-orbitron font-bold text-cyan-400 text-xs tracking-widest uppercase">INSPECT</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-sm cursor-pointer">✕</button>
        </div>
        {/* 3D canvas */}
        <Canvas camera={{ position: [0, 0.2, 1.8], fov: 40 }} style={{ background: 'transparent' }}>
          <InspectScene weapon={weapon} level={level} />
        </Canvas>
        {/* Footer hint */}
        <div className="absolute bottom-0 left-0 right-0 text-center py-2 bg-gradient-to-t from-slate-950 to-transparent">
          <span className="text-slate-600 text-[9px] font-mono tracking-widest">DRAG TO ROTATE</span>
        </div>
      </div>
    </div>
  );
}
