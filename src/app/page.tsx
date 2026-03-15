"use client";

import { Canvas } from "@react-three/fiber";
import { PointerLockControls, Grid, Stars, MeshReflectorMaterial, Environment } from "@react-three/drei";
import { Physics, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { Player } from "@/components/Player";
import { Weapon } from "@/components/Weapon";
import { Enemies } from "@/components/Enemies";
import { GPUParticles } from "@/components/GPUParticles";
import { useStore } from "@/store";
import { PauseMenu } from "@/components/PauseMenu";

const RETICLE_PROFILES = {
  pulse_pistol:     { label: "KINETIC",   color: "#e2e8f0", size: 86 },
  plasma_caster:    { label: "PLASMA",    color: "#22d3ee", size: 90 },
  frag_launcher:    { label: "AOE LOCK",  color: "#f97316", size: 110 },
  shrapnel_blaster: { label: "SPREAD",    color: "#f59e0b", size: 100 },
  cryo_emitter:     { label: "CRYO",      color: "#60a5fa", size: 94 },
  void_reaper:      { label: "VOID",      color: "#a855f7", size: 96 },
} as const;

function WeaponReticle({ weapon, bloom, pulse }: { weapon: string; bloom: number; pulse: boolean }) {
  const p = RETICLE_PROFILES[weapon as keyof typeof RETICLE_PROFILES] ?? RETICLE_PROFILES.pulse_pistol;
  const s = p.size + bloom * 1.2;

  if (weapon === "pulse_pistol" || weapon === "plasma_caster") {
    // Precision diamond + spinning inner ring + crosshair lines
    return (
      <svg width={s} height={s} viewBox="0 0 100 100" className={pulse ? "combat-reticle-pulse" : ""}>
        {/* Outer spinning ring */}
        <circle cx="50" cy="50" r="40" fill="none" stroke={p.color} strokeWidth="0.8" strokeDasharray="6 4" opacity="0.6" className="reticle-spin" />
        {/* Inner ring */}
        <circle cx="50" cy="50" r="24" fill="none" stroke={p.color} strokeWidth="1" opacity="0.9" className="reticle-spin-rev" />
        {/* Diamond center */}
        <rect x="46" y="46" width="8" height="8" rx="1" fill={p.color} transform="rotate(45 50 50)" opacity="0.95" className="reticle-breathe" />
        {/* Crosshair arms */}
        <line x1="50" y1="8" x2="50" y2="30" stroke={p.color} strokeWidth="1.2" opacity="0.7" />
        <line x1="50" y1="70" x2="50" y2="92" stroke={p.color} strokeWidth="1.2" opacity="0.7" />
        <line x1="8" y1="50" x2="30" y2="50" stroke={p.color} strokeWidth="1.2" opacity="0.7" />
        <line x1="70" y1="50" x2="92" y2="50" stroke={p.color} strokeWidth="1.2" opacity="0.7" />
        {/* Corner ticks */}
        <line x1="22" y1="22" x2="30" y2="30" stroke={p.color} strokeWidth="0.8" opacity="0.4" />
        <line x1="78" y1="22" x2="70" y2="30" stroke={p.color} strokeWidth="0.8" opacity="0.4" />
        <line x1="22" y1="78" x2="30" y2="70" stroke={p.color} strokeWidth="0.8" opacity="0.4" />
        <line x1="78" y1="78" x2="70" y2="70" stroke={p.color} strokeWidth="0.8" opacity="0.4" />
      </svg>
    );
  }

  if (weapon === "shrapnel_blaster") {
    // Wide cone spread indicator — multiple expanding arcs
    return (
      <svg width={s} height={s} viewBox="0 0 100 100" className={pulse ? "combat-reticle-pulse" : ""}>
        {/* Spread arcs */}
        <path d="M50 50 L30 15 L70 15 Z" fill="none" stroke={p.color} strokeWidth="0.8" opacity="0.3" className="reticle-breathe" />
        <path d="M50 50 L15 30 L15 70 Z" fill="none" stroke={p.color} strokeWidth="0.8" opacity="0.3" className="reticle-breathe" />
        <path d="M50 50 L30 85 L70 85 Z" fill="none" stroke={p.color} strokeWidth="0.8" opacity="0.3" className="reticle-breathe" />
        <path d="M50 50 L85 30 L85 70 Z" fill="none" stroke={p.color} strokeWidth="0.8" opacity="0.3" className="reticle-breathe" />
        {/* Inner hex */}
        <circle cx="50" cy="50" r="18" fill="none" stroke={p.color} strokeWidth="1.5" strokeDasharray="8 5" className="reticle-spin" />
        {/* Scatter dots */}
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <circle key={a} cx={50 + Math.cos(a * Math.PI / 180) * 32} cy={50 + Math.sin(a * Math.PI / 180) * 32} r="2" fill={p.color} opacity="0.6" className="reticle-breathe" />
        ))}
        {/* Center X */}
        <line x1="46" y1="46" x2="54" y2="54" stroke={p.color} strokeWidth="2" opacity="0.9" />
        <line x1="54" y1="46" x2="46" y2="54" stroke={p.color} strokeWidth="2" opacity="0.9" />
        {/* Outer chunky ring */}
        <circle cx="50" cy="50" r="42" fill="none" stroke={p.color} strokeWidth="2" strokeDasharray="4 8" opacity="0.4" className="reticle-spin-rev" />
      </svg>
    );
  }

  if (weapon === "void_reaper" || weapon === "cryo_emitter") {
    // Organic pulsing — irregular wobble paths + spore dots
    return (
      <svg width={s} height={s} viewBox="0 0 100 100" className={pulse ? "combat-reticle-pulse" : ""}>
        {/* Organic outer blob */}
        <path d="M50 8 Q72 18, 82 38 Q92 55, 82 72 Q68 90, 50 92 Q30 90, 18 72 Q8 55, 18 38 Q28 18, 50 8 Z" fill="none" stroke={p.color} strokeWidth="0.8" opacity="0.4" className="reticle-wobble" />
        {/* Inner organic ring */}
        <path d="M50 22 Q64 28, 70 42 Q78 54, 70 66 Q60 78, 50 78 Q38 78, 30 66 Q22 54, 30 42 Q36 28, 50 22 Z" fill="none" stroke={p.color} strokeWidth="1.2" opacity="0.7" className="reticle-wobble-rev" />
        {/* Spore dots orbiting */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <circle key={a} cx={50 + Math.cos(a * Math.PI / 180) * 36} cy={50 + Math.sin(a * Math.PI / 180) * 36} r="1.5" fill={p.color} opacity="0.5" className="reticle-breathe" />
        ))}
        {/* Center biohazard dot */}
        <circle cx="50" cy="50" r="4" fill={p.color} opacity="0.85" className="reticle-breathe" />
        <circle cx="50" cy="50" r="8" fill="none" stroke={p.color} strokeWidth="0.8" opacity="0.5" className="reticle-spin" />
      </svg>
    );
  }

  // Nuke — target lock circle + warning triangles
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className={pulse ? "combat-reticle-pulse" : ""}>
      {/* Outer lock ring */}
      <circle cx="50" cy="50" r="44" fill="none" stroke={p.color} strokeWidth="1.5" strokeDasharray="3 3" className="reticle-spin" />
      {/* Middle ring */}
      <circle cx="50" cy="50" r="30" fill="none" stroke={p.color} strokeWidth="1" opacity="0.7" className="reticle-spin-rev" />
      {/* Warning triangles at cardinal points */}
      <polygon points="50,6 46,14 54,14" fill={p.color} opacity="0.7" className="reticle-breathe" />
      <polygon points="50,94 46,86 54,86" fill={p.color} opacity="0.7" className="reticle-breathe" />
      <polygon points="6,50 14,46 14,54" fill={p.color} opacity="0.7" className="reticle-breathe" />
      <polygon points="94,50 86,46 86,54" fill={p.color} opacity="0.7" className="reticle-breathe" />
      {/* Inner crosshair */}
      <line x1="50" y1="36" x2="50" y2="44" stroke={p.color} strokeWidth="1.5" opacity="0.9" />
      <line x1="50" y1="56" x2="50" y2="64" stroke={p.color} strokeWidth="1.5" opacity="0.9" />
      <line x1="36" y1="50" x2="44" y2="50" stroke={p.color} strokeWidth="1.5" opacity="0.9" />
      <line x1="56" y1="50" x2="64" y2="50" stroke={p.color} strokeWidth="1.5" opacity="0.9" />
      {/* Center impact dot */}
      <circle cx="50" cy="50" r="3" fill={p.color} opacity="0.95" />
      <circle cx="50" cy="50" r="6" fill="none" stroke={p.color} strokeWidth="0.8" opacity="0.5" className="reticle-breathe" />
    </svg>
  );
}

function AliveText({ value, prefix = "", suffix = "", animate = false }: { value: string | number, prefix?: string, suffix?: string, animate?: boolean }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);
  const lastGlitchRef = useRef(0);
  
  useEffect(() => {
    if (!animate || !spanRef.current) return;
    
    const tick = (now: number) => {
      // Glitch at ~20fps instead of hammering setState every 50ms
      if (now - lastGlitchRef.current > 50) {
        lastGlitchRef.current = now;
        const text = value.toString();
        const glitched = text.split('').map(char => 
          Math.random() > 0.95 ? String.fromCharCode(33 + Math.floor(Math.random() * 94)) : char
        ).join('');
        if (spanRef.current) {
          spanRef.current.textContent = prefix + glitched + suffix;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, animate, prefix, suffix]);

  return <span ref={spanRef}>{prefix}{value.toString()}{suffix}</span>;
}

export default function Game() {
  const { score, level, killsThisLevel, isPaused, isGameOver, setPaused, equippedWeapon, weaponLevels, hudSettings, playerHealth, playerMaxHealth, resetGame, gamePhase, startGame, setGamePhase } = useStore();
  const levelTarget = level * 10;
  const levelProgress = Math.min(100, (killsThisLevel / levelTarget) * 100);
  const healthPercent = (playerHealth / playerMaxHealth) * 100;
  const [hasPointerLock, setHasPointerLock] = useState(false);
  const [reticlePulse, setReticlePulse] = useState(false);
  const [reticleBloom, setReticleBloom] = useState(0);
  const [hitMarker, setHitMarker] = useState<"hit" | "kill" | null>(null);
  const [incoming, setIncoming] = useState({ left: 0, right: 0, front: 0, back: 0 });
  const [damageFlash, setDamageFlash] = useState(0);
  const reticleLabel = (RETICLE_PROFILES[equippedWeapon as keyof typeof RETICLE_PROFILES] ?? RETICLE_PROFILES.plasmacaster).label;
  const reticleColor = (RETICLE_PROFILES[equippedWeapon as keyof typeof RETICLE_PROFILES] ?? RETICLE_PROFILES.plasmacaster).color;
  const showGameplayReticle = gamePhase === 'playing' && hasPointerLock;

  // Player damage flash
  useEffect(() => {
    const handlePlayerHit = () => {
      setDamageFlash(1);
    };
    window.addEventListener("nova:playerHit", handlePlayerHit);
    return () => window.removeEventListener("nova:playerHit", handlePlayerHit);
  }, []);

  // Decay damage flash
  useEffect(() => {
    if (damageFlash <= 0) return;
    const id = requestAnimationFrame(() => setDamageFlash((f) => Math.max(0, f - 0.04)));
    return () => cancelAnimationFrame(id);
  }, [damageFlash]);

  useEffect(() => {
    const handlePointerLockChange = () => {
      const activeLock = Boolean(document.pointerLockElement);
      setHasPointerLock(activeLock);
      const phase = useStore.getState().gamePhase;
      // Only allow pointer lock transitions during playing/paused
      if (phase === 'playing' || phase === 'paused') {
        if (activeLock) {
          setGamePhase('playing');
        } else {
          setGamePhase('paused');
        }
      } else if (activeLock) {
        // Pointer lock acquired during menu/gameover — force exit
        document.exitPointerLock();
      }
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);
    handlePointerLockChange();

    return () => {
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
    };
  }, [setPaused, setGamePhase]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const phase = useStore.getState().gamePhase;
        if (phase !== 'playing' && phase !== 'paused') return;
        if (document.pointerLockElement) {
          document.exitPointerLock();
        } else {
          const target = document.getElementById("game-root") ?? document.body;
          target.requestPointerLock().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleShotPulse = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (!document.pointerLockElement) return;
      setReticlePulse(true);
      setReticleBloom((prev) => Math.min(26, prev + 8));
      window.setTimeout(() => setReticlePulse(false), 110);
    };

    window.addEventListener("pointerdown", handleShotPulse);
    return () => window.removeEventListener("pointerdown", handleShotPulse);
  }, []);

  useEffect(() => {
    const handleHit = (event: Event) => {
      const custom = event as CustomEvent<{ kind?: "hit" | "kill" }>;
      const kind = custom.detail?.kind === "kill" ? "kill" : "hit";
      setHitMarker(kind);
      window.setTimeout(() => setHitMarker(null), 120);
    };

    const handleIncoming = (event: Event) => {
      const custom = event as CustomEvent<{ side: number; front: number; intensity: number }>;
      const detail = custom.detail;
      if (!detail) return;

      setIncoming((prev) => ({
        left: Math.max(prev.left, detail.side < 0 ? Math.abs(detail.side) * detail.intensity : 0),
        right: Math.max(prev.right, detail.side > 0 ? Math.abs(detail.side) * detail.intensity : 0),
        front: Math.max(prev.front, detail.front > 0 ? Math.abs(detail.front) * detail.intensity : 0),
        back: Math.max(prev.back, detail.front < 0 ? Math.abs(detail.front) * detail.intensity : 0),
      }));
    };

    window.addEventListener("nova:hit", handleHit as EventListener);
    window.addEventListener("nova:incoming", handleIncoming as EventListener);

    return () => {
      window.removeEventListener("nova:hit", handleHit as EventListener);
      window.removeEventListener("nova:incoming", handleIncoming as EventListener);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setReticleBloom((prev) => Math.max(0, prev - 1.4));
      setIncoming((prev) => ({
        left: Math.max(0, prev.left * 0.86 - 0.01),
        right: Math.max(0, prev.right * 0.86 - 0.01),
        front: Math.max(0, prev.front * 0.86 - 0.01),
        back: Math.max(0, prev.back * 0.86 - 0.01),
      }));
    }, 40);

    return () => window.clearInterval(interval);
  }, []);

  const handleStartGame = useCallback(() => {
    startGame();
    setTimeout(() => {
      const target = document.getElementById("game-root") ?? document.body;
      target.requestPointerLock().catch(() => {});
    }, 100);
  }, [startGame]);

  const handlePlayAgain = useCallback(() => {
    startGame();
    setTimeout(() => {
      const target = document.getElementById("game-root") ?? document.body;
      target.requestPointerLock().catch(() => {});
    }, 100);
  }, [startGame]);

  const handleMainMenu = useCallback(() => {
    resetGame();
    if (document.pointerLockElement) document.exitPointerLock();
  }, [resetGame]);

  return (
    <main id="game-root" className="w-screen h-screen relative bg-[#050510] font-sans selection:bg-cyan-900 overflow-hidden">
      <Canvas shadows camera={{ fov: 75 }} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: gamePhase === 'playing' ? 'auto' : 'none' }}>
        <color attach="background" args={["#030308"]} />
        <fog attach="fog" args={["#030308", 5, 60]} />
        <ambientLight intensity={0.2} />
        <directionalLight castShadow position={[10, 20, 10]} intensity={1.5} color="#4455ff" />
        <pointLight position={[-10, -10, -10]} intensity={2} color="#ff0044" />

        <Suspense fallback={null}>
          <Physics debug={false}>
            <Player />
            <Weapon />
            <Enemies />
            <GPUParticles />

            <RigidBody type="fixed" position={[0, 4, -15]} colliders="cuboid">
              <mesh castShadow receiveShadow><boxGeometry args={[4, 10, 4]} /><meshStandardMaterial color="#000" roughness={0.1} metalness={0.9} /></mesh>
            </RigidBody>
            <RigidBody type="fixed" position={[12, 3, -5]} colliders="cuboid">
              <mesh castShadow receiveShadow><boxGeometry args={[3, 6, 3]} /><meshStandardMaterial color="#000" roughness={0.1} metalness={0.9} /></mesh>
            </RigidBody>

            <RigidBody type="fixed" colliders="cuboid" position={[0, -0.5, 0]}>
              <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
                <planeGeometry args={[200, 200]} />
                <MeshReflectorMaterial blur={[200, 80]} resolution={512} mixBlur={1} mixStrength={35} roughness={1} depthScale={1.2} minDepthThreshold={0.4} maxDepthThreshold={1.4} color="#151520" metalness={0.5} mirror={0.8} />
              </mesh>
              <mesh visible={false}><boxGeometry args={[200, 1, 200]} /></mesh>
            </RigidBody>

            {[
              { pos: [50, 10, 0] as const, args: [1, 20, 100] as const },
              { pos: [-50, 10, 0] as const, args: [1, 20, 100] as const },
              { pos: [0, 10, 50] as const, args: [100, 20, 1] as const },
              { pos: [0, 10, -50] as const, args: [100, 20, 1] as const },
            ].map((wall, i) => (
              <RigidBody key={`wall-${i}`} type="fixed" colliders="cuboid" position={[wall.pos[0], wall.pos[1], wall.pos[2]]}>
                <mesh><boxGeometry args={wall.args} /><meshStandardMaterial color="#000" transparent opacity={0.05} emissive="#00ffff" emissiveIntensity={0.3} wireframe /></mesh>
              </RigidBody>
            ))}
          </Physics>

          <Environment preset="night" />
          <Grid position={[0, 0.01, 0]} args={[200, 200]} cellColor="#00ffff" sectionColor="#ff00ff" cellThickness={0.5} sectionThickness={1.0} fadeDistance={40} />
          <Stars radius={50} depth={50} count={3000} factor={2} fade speed={0.5} />
        </Suspense>

        <EffectComposer>
          <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} />
          <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.002, 0.002)} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
          <Noise opacity={0.03} />
        </EffectComposer>

        <PointerLockControls />
      </Canvas>

      {/* ===== RETICLE (only during active gameplay) ===== */}
      {showGameplayReticle && (
        <div className="fixed inset-0 pointer-events-none z-[120]">
          <div className={`combat-reticle ${hudSettings.reducedMotion ? "reticle-reduced-motion" : ""}`}
            style={{
              transform: `translate(-50%, -50%) scale(${hudSettings.reticleScale})`,
              filter: hudSettings.highContrastReticle ? `drop-shadow(0 0 14px rgba(255,255,255,0.9)) drop-shadow(0 0 6px ${reticleColor})` : `drop-shadow(0 0 8px ${reticleColor}80)`,
            }}
          >
            <WeaponReticle weapon={equippedWeapon} bloom={reticleBloom} pulse={reticlePulse} />
            <div className="combat-reticle-label" style={{ color: `${reticleColor}cc` }}>{reticleLabel}</div>
            {hitMarker && (
              <div className={`hit-marker ${hitMarker === "kill" ? "hit-marker-kill" : ""}`}><span /><span /></div>
            )}
          </div>
          <div className="incoming-indicators">
            <div className="incoming-arrow incoming-front" style={{ opacity: incoming.front }} />
            <div className="incoming-arrow incoming-right" style={{ opacity: incoming.right }} />
            <div className="incoming-arrow incoming-back" style={{ opacity: incoming.back }} />
            <div className="incoming-arrow incoming-left" style={{ opacity: incoming.left }} />
          </div>
        </div>
      )}

      {/* ===== HUD (only during active gameplay) ===== */}
      {gamePhase === 'playing' && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Top-left stats */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <div className="glass-panel p-4 w-72">
              <div className="flex items-center justify-between">
                <h1 className="font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 font-black text-2xl tracking-tighter italic glass-text">NOVA</h1>
                <span className="text-cyan-500 font-mono text-xs tracking-widest">LVL {level}</span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-yellow-400/80 uppercase">Kills {killsThisLevel}/{levelTarget}</span>
                  <span className="text-cyan-300 font-bold">{score.toString().padStart(5, '0')} PTS</span>
                </div>
                <div className="h-1.5 rounded-full bg-black/50 overflow-hidden border border-cyan-400/20">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-300 transition-all duration-300" style={{ width: `${levelProgress}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom-left health bar */}
          <div className="absolute bottom-4 left-4 w-72">
            <div className="glass-panel p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-red-400/80 font-mono text-xs uppercase">Hull Integrity</span>
                <span className={`font-mono font-bold text-sm ${healthPercent > 60 ? 'text-emerald-400' : healthPercent > 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {playerHealth}/{playerMaxHealth}
                </span>
              </div>
              <div className="h-3 rounded-full bg-black/50 overflow-hidden border border-red-400/20">
                <div className={`h-full transition-all duration-300 ${healthPercent > 60 ? 'bg-gradient-to-r from-emerald-500 to-emerald-300' : healthPercent > 30 ? 'bg-gradient-to-r from-yellow-500 to-yellow-300' : 'bg-gradient-to-r from-red-600 to-red-400'}`}
                  style={{ width: `${healthPercent}%` }} />
              </div>
            </div>
          </div>

          {/* Bottom-right weapon info */}
          <div className="absolute bottom-4 right-4">
            <div className="glass-panel p-3 text-right">
              <div className="text-cyan-400 font-mono text-xs tracking-widest uppercase">{equippedWeapon}</div>
              <div className="text-white font-black text-xl italic tracking-tighter">LVL {weaponLevels[equippedWeapon]}</div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DAMAGE FLASH ===== */}
      {damageFlash > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[90]"
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, rgba(255, 0, 0, ${damageFlash * 0.5}) 100%)`,
            boxShadow: `inset 0 0 80px rgba(255, 0, 0, ${damageFlash * 0.4})`,
          }} />
      )}

      {/* ===== HOME SCREEN ===== */}
      {gamePhase === 'menu' && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center cursor-default"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative z-10 flex flex-col items-center gap-6 text-center px-4">
            <h1 className="font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 font-black text-7xl md:text-8xl tracking-tighter italic"
              style={{ textShadow: '0 0 60px rgba(0,255,255,0.4)' }}>
              NOVA
            </h1>
            <p className="text-cyan-400/80 font-mono text-sm md:text-base tracking-[0.5em] uppercase">Cyberpunk Arena Shooter</p>
            
            <div className="mt-8 flex flex-col gap-4 items-center">
              <button onClick={handleStartGame}
                className="px-12 py-4 rounded-xl border-2 border-cyan-400 bg-cyan-500/20 text-white font-orbitron font-black tracking-[0.3em] text-lg hover:bg-cyan-400/40 hover:border-cyan-300 hover:scale-105 transition-all uppercase cursor-pointer shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                START SIMULATION
              </button>
              <p className="text-cyan-400/50 font-mono text-xs tracking-widest uppercase mt-2">WASD Move &bull; Mouse Aim &bull; Click Shoot</p>
            </div>

            <div className="mt-12 flex gap-8 text-center">
              <div className="flex flex-col items-center gap-1">
                <span className="text-cyan-400 font-mono text-xs uppercase tracking-widest">Weapons</span>
                <span className="text-white font-bold text-lg">4 Types</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-cyan-400 font-mono text-xs uppercase tracking-widest">Enemies</span>
                <span className="text-white font-bold text-lg">3 Classes</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-cyan-400 font-mono text-xs uppercase tracking-widest">Levels</span>
                <span className="text-white font-bold text-lg">10 Waves</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== GAME OVER SCREEN ===== */}
      {gamePhase === 'gameover' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center cursor-default"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/85 backdrop-blur-lg" />
          <div className="relative z-10 glass-panel p-10 text-center max-w-lg border-red-500/50 shadow-[0_0_80px_rgba(255,0,0,0.3)]">
            <h1 className="font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400 font-black text-6xl tracking-tighter italic"
              style={{ textShadow: '0 0 30px rgba(255,60,60,0.6)' }}>
              TERMINATED
            </h1>
            <p className="text-red-300 font-mono text-base tracking-[0.3em] mt-3 uppercase font-bold">Hull integrity compromised</p>
            
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-cyan-400/40 bg-black/60 p-4">
                <div className="text-cyan-300 font-mono text-xs uppercase tracking-widest font-bold">Final Score</div>
                <div className="text-white font-mono font-black text-3xl mt-1">{score.toString().padStart(5, '0')}</div>
              </div>
              <div className="rounded-lg border border-cyan-400/40 bg-black/60 p-4">
                <div className="text-cyan-300 font-mono text-xs uppercase tracking-widest font-bold">Level Reached</div>
                <div className="text-white font-mono font-black text-3xl mt-1">{level}</div>
              </div>
            </div>
            
            <div className="mt-8 flex flex-col gap-3">
              <button onClick={handlePlayAgain}
                className="w-full px-8 py-4 rounded-xl border-2 border-cyan-400 bg-cyan-500/20 text-white font-orbitron font-black tracking-[0.3em] text-lg hover:bg-cyan-400/40 hover:border-cyan-300 transition-all uppercase cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                PLAY AGAIN
              </button>
              <button onClick={handleMainMenu}
                className="w-full px-8 py-3 rounded-xl border border-slate-500/50 bg-slate-800/30 text-slate-300 font-orbitron font-bold tracking-[0.2em] text-sm hover:bg-slate-700/40 hover:text-white transition-all uppercase cursor-pointer">
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PAUSE MENU ===== */}
      {gamePhase === 'paused' && <PauseMenu />}
    </main>
  );
}
