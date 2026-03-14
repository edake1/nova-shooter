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

function getReticleProfile(weapon: string) {
  if (weapon === "shrapnel") {
    return { label: "SPREAD", color: "#f59e0b", ringScale: 1.18 };
  }
  if (weapon === "bio") {
    return { label: "CORROSIVE", color: "#34d399", ringScale: 1.08 };
  }
  if (weapon === "nuke") {
    return { label: "AOE LOCK", color: "#fb7185", ringScale: 1.28 };
  }
  return { label: "PINPOINT", color: "#22d3ee", ringScale: 1 };
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
  const { score, level, killsThisLevel, isPaused, isGameOver, setPaused, equippedWeapon, weaponLevels, hudSettings, playerHealth, playerMaxHealth, resetGame } = useStore();
  const levelTarget = level * 10;
  const levelProgress = Math.min(100, (killsThisLevel / levelTarget) * 100);
  const healthPercent = (playerHealth / playerMaxHealth) * 100;
  const [hasPointerLock, setHasPointerLock] = useState(false);
  const [reticlePulse, setReticlePulse] = useState(false);
  const [reticleBloom, setReticleBloom] = useState(0);
  const [hitMarker, setHitMarker] = useState<"hit" | "kill" | null>(null);
  const [incoming, setIncoming] = useState({ left: 0, right: 0, front: 0, back: 0 });
  const [damageFlash, setDamageFlash] = useState(0);
  const reticleProfile = getReticleProfile(equippedWeapon);
  const showGameplayReticle = hasPointerLock || !isPaused;

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
      setPaused(!activeLock);
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);
    handlePointerLockChange();

    return () => {
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
    };
  }, [setPaused]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (document.pointerLockElement) {
          document.exitPointerLock();
        } else {
          const target = document.getElementById("game-root") ?? document.body;
          target.requestPointerLock().catch(err => {
            console.warn("Could not lock pointer on Tab, might need a click:", err);
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setPaused]);

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

  return (
    <main id="game-root" className="w-screen h-screen relative bg-[#050510] font-sans selection:bg-cyan-900 overflow-hidden">
      <Canvas shadows camera={{ fov: 75 }} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }}>
        {/* Environment Settings */}
        <color attach="background" args={["#030308"]} />
        <fog attach="fog" args={["#030308", 5, 40]} />
        <ambientLight intensity={0.2} />
        <directionalLight castShadow position={[10, 20, 10]} intensity={1.5} color="#4455ff" />
        <pointLight position={[-10, -10, -10]} intensity={2} color="#ff0044" />

        <Suspense fallback={null}>
          <Physics debug={false}>
            {/* Player & Weapon */}
            <Player />
            <Weapon />
            
            {/* Enemies */}
            <Enemies />

            {/* True GPU Particles */}
            <GPUParticles />

            {/* Giant Monolith Obstacles */}
            <RigidBody type="fixed" position={[0, 4, -15]} colliders="cuboid">
              <mesh castShadow receiveShadow>
                <boxGeometry args={[4, 10, 4]} />
                <meshStandardMaterial color="#000" roughness={0.1} metalness={0.9} />
              </mesh>
            </RigidBody>
            <RigidBody type="fixed" position={[12, 3, -5]} colliders="cuboid">
              <mesh castShadow receiveShadow>
                <boxGeometry args={[3, 6, 3]} />
                <meshStandardMaterial color="#000" roughness={0.1} metalness={0.9} />
              </mesh>
            </RigidBody>

            {/* Highly Reflective Mirror Floor */}
            <RigidBody type="fixed" colliders="cuboid" position={[0, -0.5, 0]}>
              <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
                <planeGeometry args={[200, 200]} />
                <MeshReflectorMaterial
                  blur={[200, 80]}
                  resolution={512}
                  mixBlur={1}
                  mixStrength={35}
                  roughness={1}
                  depthScale={1.2}
                  minDepthThreshold={0.4}
                  maxDepthThreshold={1.4}
                  color="#151520"
                  metalness={0.5}
                  mirror={0.8}
                />
              </mesh>
              <mesh visible={false}>
                <boxGeometry args={[200, 1, 200]} />
              </mesh>
            </RigidBody>

            {/* Arena Boundary Walls (50 unit radius box) */}
            {[
              { pos: [50, 10, 0] as const, args: [1, 20, 100] as const, rot: 0 },
              { pos: [-50, 10, 0] as const, args: [1, 20, 100] as const, rot: 0 },
              { pos: [0, 10, 50] as const, args: [100, 20, 1] as const, rot: 0 },
              { pos: [0, 10, -50] as const, args: [100, 20, 1] as const, rot: 0 },
            ].map((wall, i) => (
              <RigidBody key={`wall-${i}`} type="fixed" colliders="cuboid" position={[wall.pos[0], wall.pos[1], wall.pos[2]]}>
                <mesh>
                  <boxGeometry args={wall.args} />
                  <meshStandardMaterial color="#000" transparent opacity={0.05} emissive="#00ffff" emissiveIntensity={0.3} wireframe />
                </mesh>
              </RigidBody>
            ))}
          </Physics>

          {/* Environment Global Illumination Map */}
          <Environment preset="night" />

          {/* Neon Grid overlaying the floor */}
          <Grid 
            position={[0, 0.01, 0]} 
            args={[200, 200]} 
            cellColor="#00ffff" 
            sectionColor="#ff00ff" 
            cellThickness={0.5}
            sectionThickness={1.0}
            fadeDistance={40} 
          />

          <Stars radius={50} depth={50} count={3000} factor={2} fade speed={0.5} />
        </Suspense>

        {/* Post-Processing Pipeline! The 2026 Tech */}
        <EffectComposer>
          <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} />
          <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.002, 0.002)} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
          <Noise opacity={0.03} />
        </EffectComposer>

        <PointerLockControls 
          selector="#game-root"
          onLock={() => setPaused(false)} 
          onUnlock={() => setPaused(true)} 
        />
      </Canvas>

      {/* Always-visible combat reticle while actively playing */}
      {showGameplayReticle && (
        <div className="fixed inset-0 pointer-events-none z-[120]">
          <div className={`combat-reticle ${reticlePulse ? "combat-reticle-pulse" : ""} ${hudSettings.reducedMotion ? "reticle-reduced-motion" : ""}`}
            style={{
              transform: `translate(-50%, -50%) scale(${hudSettings.reticleScale})`,
              filter: hudSettings.highContrastReticle ? "drop-shadow(0 0 14px rgba(255,255,255,0.9))" : "none",
            }}
          >
            <div className="combat-reticle-center" />
            <div className="combat-reticle-ring" style={{ borderColor: reticleProfile.color, width: `${(46 + reticleBloom) * reticleProfile.ringScale}px`, height: `${(46 + reticleBloom) * reticleProfile.ringScale}px` }} />
            <div className="combat-reticle-ring-secondary" style={{ borderColor: `${reticleProfile.color}99`, width: `${(68 + reticleBloom * 1.4) * reticleProfile.ringScale}px`, height: `${(68 + reticleBloom * 1.4) * reticleProfile.ringScale}px` }} />
            <span className="combat-reticle-arm arm-top" />
            <span className="combat-reticle-arm arm-right" />
            <span className="combat-reticle-arm arm-bottom" />
            <span className="combat-reticle-arm arm-left" />
            <div className="combat-reticle-label">{reticleProfile.label}</div>

            {hitMarker && (
              <div className={`hit-marker ${hitMarker === "kill" ? "hit-marker-kill" : ""}`}>
                <span />
                <span />
              </div>
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


      {/* Cyberpunk HUD Overlay (Client-only to avoid hydration mismatch) */}
      {!isPaused && (
        <div className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300">
          
          <div className="absolute top-8 left-8 pointer-events-none flex flex-col gap-4">
            {/* God Tier Labels & Glassmorphism */}
            <div className="glass-panel p-6 w-80">
              <h1 className="font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 font-black text-5xl tracking-tighter italic glass-text">
                NOVA
              </h1>
              <h2 className="text-xl font-bold tracking-[0.3em] text-cyan-500 mt-1">SYSTEM ONLINE</h2>
              
              <div className="mt-6 border-t border-cyan-500/30 pt-4 flex flex-col gap-3">
                 <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                    <span className="text-yellow-400/70 font-mono text-xs uppercase flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping"></span>
                      Level <AliveText value={level} animate={true} />
                    </span>
                    <span className="text-yellow-400 font-mono font-bold tracking-widest"><AliveText value={killsThisLevel} /> / {levelTarget} KILLS</span>
                 </div>
                  <div className="h-2 rounded-full border border-cyan-400/20 bg-black/50 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-300 transition-all duration-500" style={{ width: `${levelProgress}%` }} />
                  </div>
                 <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-colors">
                    <span className="text-cyan-400/70 font-mono text-xs uppercase flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                       Target Intel
                    </span>
                    <span className="text-cyan-300 font-mono font-bold tracking-widest"><AliveText value={score.toString().padStart(4, '0')} animate={true} suffix=" PTS" /></span>
                 </div>
                 
                 <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-purple-500/10">
                    <span className="text-purple-400/70 font-mono text-xs uppercase flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                      Threat Level
                    </span>
                    <span className="text-purple-400 font-mono font-bold animate-pulse glass-text-secondary"><AliveText value="CRITICAL" animate={true} /></span>
                 </div>

                 {/* Player Health Bar */}
                 <div className="bg-black/40 p-3 rounded-lg border border-red-500/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-red-400/70 font-mono text-xs uppercase flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${healthPercent > 30 ? 'bg-red-400' : 'bg-red-500 animate-ping'}`}></span>
                        Hull Integrity
                      </span>
                      <span className={`font-mono font-bold tracking-widest ${healthPercent > 60 ? 'text-emerald-400' : healthPercent > 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {playerHealth} / {playerMaxHealth}
                      </span>
                    </div>
                    <div className="h-3 rounded-full border border-red-400/20 bg-black/50 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${healthPercent > 60 ? 'bg-gradient-to-r from-emerald-500 to-emerald-300' : healthPercent > 30 ? 'bg-gradient-to-r from-yellow-500 to-yellow-300' : 'bg-gradient-to-r from-red-600 to-red-400'}`}
                        style={{ width: `${healthPercent}%` }} 
                      />
                    </div>
                 </div>
              </div>
              
              <div className="mt-4 text-cyan-400/50 font-mono text-[10px] tracking-widest uppercase">
                SYS.OP: W A S D / SPACE / CLICK
              </div>
            </div>
          </div>
          
          <div className="absolute top-8 right-8 pointer-events-auto">
            <button 
              onClick={() => {
                if (isPaused) {
                  if (!document.pointerLockElement) {
                      const target = document.getElementById("game-root") ?? document.body;
                    target.requestPointerLock();
                  }
                } else {
                  if (document.pointerLockElement) {
                    document.exitPointerLock();
                  }
                }
              }}
              className="glass-panel px-6 py-3 border border-cyan-500/50 text-cyan-400 font-orbitron font-bold tracking-widest text-sm hover:bg-cyan-500/20 transition-colors uppercase cursor-pointer"
            >
              {isPaused ? "▶ RESUME" : "⏸ MENU (ESC)"}
            </button>
          </div>
          
          <div className="absolute bottom-8 right-8 pointer-events-none">
             <div className="text-cyan-400 font-mono text-xs tracking-widest text-right uppercase">Weapon // {equippedWeapon}</div>
             <div className="text-white font-black text-3xl italic tracking-tighter text-right">LVL: {weaponLevels[equippedWeapon]}</div>
             <div className="text-cyan-300/70 font-mono text-[10px] tracking-[0.2em] text-right uppercase mt-1">STATUS: HOT</div>
          </div>
        </div>
      )}

      {/* Damage flash vignette */}
      {damageFlash > 0 && (
        <div 
          className="fixed inset-0 pointer-events-none z-[90]"
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, rgba(255, 0, 0, ${damageFlash * 0.5}) 100%)`,
            boxShadow: `inset 0 0 80px rgba(255, 0, 0, ${damageFlash * 0.4})`,
          }}
        />
      )}

      {/* Game Over Screen */}
      {isGameOver && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="glass-panel p-10 text-center max-w-lg border-red-500/40 shadow-[0_0_60px_rgba(255,0,0,0.2)]">
            <h1 className="font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400 font-black text-6xl tracking-tighter italic">
              TERMINATED
            </h1>
            <p className="text-red-400/80 font-mono text-sm tracking-[0.3em] mt-3 uppercase">Hull integrity compromised</p>
            
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-cyan-500/30 bg-black/50 p-4">
                <div className="text-cyan-400/70 font-mono text-[10px] uppercase tracking-widest">Final Score</div>
                <div className="text-cyan-300 font-mono font-black text-3xl mt-1">{score.toString().padStart(5, '0')}</div>
              </div>
              <div className="rounded-lg border border-cyan-500/30 bg-black/50 p-4">
                <div className="text-cyan-400/70 font-mono text-[10px] uppercase tracking-widest">Level Reached</div>
                <div className="text-cyan-300 font-mono font-black text-3xl mt-1">{level}</div>
              </div>
            </div>
            
            <button
              onClick={() => {
                resetGame();
                // Re-engage pointer lock on restart
                const target = document.getElementById("game-root") ?? document.body;
                target.requestPointerLock();
              }}
              className="mt-8 glass-panel px-10 py-4 border border-cyan-500/60 text-cyan-300 font-orbitron font-bold tracking-[0.3em] text-lg hover:bg-cyan-500/20 transition-colors uppercase cursor-pointer"
            >
              REINITIALIZE
            </button>
            <p className="text-cyan-400/40 font-mono text-xs tracking-widest mt-4 uppercase">Click to restart simulation</p>
          </div>
        </div>
      )}

      {isPaused && !isGameOver && <PauseMenu />}
    </main>
  );
}
