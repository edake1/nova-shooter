"use client";

import { Canvas } from "@react-three/fiber";
import { Grid, Stars, MeshReflectorMaterial, Environment } from "@react-three/drei";
import { Physics, RigidBody } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Suspense, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";

// Broadcasts camera position to a ref for HUD elements outside the Canvas
function CameraTracker({ posRef }: { posRef: React.MutableRefObject<[number, number, number]> }) {
  useFrame((state) => {
    const p = state.camera.position;
    posRef.current[0] = p.x;
    posRef.current[1] = p.y;
    posRef.current[2] = p.z;
  });
  return null;
}

// Syncs camera FOV with hudSettings
function CameraFOV() {
  const { camera } = useThree();
  const fov = useStore((s) => s.hudSettings.fov);
  useEffect(() => {
    if ((camera as THREE.PerspectiveCamera).fov !== fov) {
      (camera as THREE.PerspectiveCamera).fov = fov;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
  }, [camera, fov]);
  return null;
}

// Custom mouselook — only rotates camera on mousemove when pointer is locked.
// Does NOT add any click-to-lock listeners (we manage pointer lock manually).
function MouseLook() {
  const { camera } = useThree();
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return;
      const sens = useStore.getState().hudSettings.mouseSensitivity;
      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y -= e.movementX * 0.002 * sens;
      euler.current.x -= e.movementY * 0.002 * sens;
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };
    document.addEventListener('mousemove', onMouseMove);
    return () => document.removeEventListener('mousemove', onMouseMove);
  }, [camera]);
  
  return null;
}
import { Player } from "@/components/Player";
import { Weapon } from "@/components/Weapon";
import { Enemies } from "@/components/Enemies";
import { GPUParticles } from "@/components/GPUParticles";
import { LootDrops } from "@/components/LootDrops";
import { EnemyProjectiles } from "@/components/EnemyProjectiles";
import { useStore, LOOT_CONFIG, getHighScores, getSaveSlots } from "@/store";
import type { HighScoreEntry } from "@/store";
import { PauseMenu } from "@/components/PauseMenu";
import { WeaponWheel } from "@/components/WeaponWheel";
import { Minimap } from "@/components/Minimap";
import { audioManager } from "@/lib/audio";

const RETICLE_PROFILES = {
  pulse_pistol:     { label: "KINETIC",      color: "#e2e8f0", size: 86 },
  plasma_caster:    { label: "PLASMA",       color: "#22d3ee", size: 90 },
  frag_launcher:    { label: "AOE LOCK",     color: "#f97316", size: 110 },
  shrapnel_blaster: { label: "SPREAD",       color: "#f59e0b", size: 100 },
  cryo_emitter:     { label: "CRYO",         color: "#60a5fa", size: 94 },
  void_reaper:      { label: "VOID",         color: "#a855f7", size: 96 },
  lightning_coil:   { label: "ARC",          color: "#facc15", size: 92 },
  blade_wave:       { label: "FORCE",        color: "#fb7185", size: 108 },
  railgun:          { label: "RAIL",         color: "#34d399", size: 80 },
  gravity_well:     { label: "SINGULARITY",  color: "#a78bfa", size: 114 },
  swarm_missiles:   { label: "SWARM",        color: "#f87171", size: 98 },
  beam_laser:       { label: "BEAM",         color: "#a3e635", size: 78 },
  ricochet_cannon:  { label: "RICOCHET",     color: "#2dd4bf", size: 88 },
  sonic_boom:       { label: "SONIC",        color: "#38bdf8", size: 106 },
  nano_swarm:       { label: "NANO",         color: "#4ade80", size: 112 },
  photon_burst:     { label: "NOVA",         color: "#facc15", size: 116 },
  plasma_whip:      { label: "WHIP",         color: "#f472b6", size: 104 },
  warp_lance:       { label: "WARP",         color: "#818cf8", size: 76 },
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

/** Moving platform that oscillates between two points */
function MovingPlatform({ from, to, size, speed = 1 }: { from: [number, number, number]; to: [number, number, number]; size: [number, number, number]; speed?: number }) {
  const rigidRef = useRef<RapierRigidBody>(null);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (!rigidRef.current) return;
    elapsed.current += delta * speed;
    const t = (Math.sin(elapsed.current) + 1) / 2;
    rigidRef.current.setTranslation({
      x: from[0] + (to[0] - from[0]) * t,
      y: from[1] + (to[1] - from[1]) * t,
      z: from[2] + (to[2] - from[2]) * t,
    }, true);
  });
  return (
    <RigidBody ref={rigidRef} type="kinematicPosition" colliders="cuboid" position={from}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#0a0a1a" metalness={0.9} roughness={0.15} emissive="#00ffff" emissiveIntensity={0.15} />
      </mesh>
      {/* Edge glow strips */}
      <mesh position={[0, size[1] / 2 + 0.01, 0]}>
        <boxGeometry args={[size[0], 0.02, size[2]]} />
        <meshStandardMaterial color="#000" emissive="#00ffff" emissiveIntensity={1} toneMapped={false} transparent opacity={0.4} />
      </mesh>
    </RigidBody>
  );
}

export default function Game() {
  const { score, level, killsThisLevel, totalKills, isPaused, isGameOver, setPaused, equippedWeapon, weaponLevels, hudSettings, playerHealth, playerMaxHealth, shieldHP, activeBuffs, tickBuffs, resetGame, gamePhase, startGame, setGamePhase, loadGame, hasSave, deleteSave, combo, tickCombo, damageDealt, gameStartedAt, enemies, selectedSaveSlot, setSelectedSaveSlot } = useStore();
  const levelTarget = level * 10;
  const levelProgress = Math.min(100, (killsThisLevel / levelTarget) * 100);
  const healthPercent = (playerHealth / playerMaxHealth) * 100;
  const [hasPointerLock, setHasPointerLock] = useState(false);
  const [reticlePulse, setReticlePulse] = useState(false);
  const [reticleBloom, setReticleBloom] = useState(0);
  const [hitMarker, setHitMarker] = useState<"hit" | "kill" | null>(null);
  const [incoming, setIncoming] = useState({ left: 0, right: 0, front: 0, back: 0 });
  const [damageFlash, setDamageFlash] = useState(0);
  const [chargeLevel, setChargeLevel] = useState(0);
  const [fps, setFps] = useState(0);
  const fpsFramesRef = useRef<number[]>([]);
  const [levelUpShow, setLevelUpShow] = useState<number | null>(null);
  const [comboDisplay, setComboDisplay] = useState<{ count: number; tier: string; multiplier: number } | null>(null);
  const [saveExists, setSaveExists] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [highScores, setHighScores] = useState<HighScoreEntry[]>([]);
  const playerPosRef = useRef<[number, number, number]>([0, 0, 0]);
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 0, 0]);
  // Global leaderboard
  const [globalScores, setGlobalScores] = useState<{ username: string; score: number; level: number; kills: number; max_combo: number; weapon: string; time_played: number; damage_dealt: number }[]>([]);
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nova_player_name') || '';
    }
    return '';
  });
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'local' | 'global'>('global');
  const [saveSlots, setSaveSlots] = useState<ReturnType<typeof getSaveSlots>>([null, null, null]);
  const [loadingTip, setLoadingTip] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const reticleLabel = (RETICLE_PROFILES[equippedWeapon as keyof typeof RETICLE_PROFILES] ?? RETICLE_PROFILES.plasma_caster).label;
  const reticleColor = (RETICLE_PROFILES[equippedWeapon as keyof typeof RETICLE_PROFILES] ?? RETICLE_PROFILES.plasma_caster).color;
  const showGameplayReticle = gamePhase === 'playing' && hasPointerLock;

  // Boss tracking — detect juggernaut/hive_queen enemies for boss health bar
  const bossEnemies = enemies.filter((e) => e.type === 'juggernaut' || e.type === 'hive_queen');
  const bossHP = bossEnemies.reduce((sum, e) => sum + e.health, 0);
  const bossMaxHP = bossEnemies.reduce((sum, e) => sum + e.maxHealth, 0);
  const bossName = bossEnemies.length > 1 ? 'BOSS WAVE' : bossEnemies.length === 1 ? (bossEnemies[0].type === 'hive_queen' ? 'HIVE QUEEN' : 'JUGGERNAUT') : '';
  const showBossBar = bossEnemies.length > 0 && gamePhase === 'playing';

  // Loading screen tips
  const LOADING_TIPS = useMemo(() => [
    'Use Q to open the Weapon Wheel and swap weapons mid-fight.',
    'Upgrade weapons in the Arsenal (Tab → pause) each costs credits from kills.',
    'Shielders absorb frontal damage — flank them or use explosive weapons.',
    'Phantoms teleport behind you. Listen for the warp sound cue.',
    'Bombers explode on death — keep your distance when finishing them.',
    'Each weapon class has a unique kill effect. Experiment!',
    'Hive Queens spawn swarmers — take them out fast or get overwhelmed.',
    'Juggernauts are slow but deadly. Kite them with mobile weapons.',
    'Stack combos for bonus score. Kill quickly to keep the chain going.',
    'Cryo Emitter slows enemies — great crowd control in a pinch.',
    'Loot drops from enemies give temporary buffs. Pick them up!',
    'Sprint with Shift for a speed boost during combat repositioning.',
    'Higher weapon levels increase damage and fire rate.',
    'The minimap shows enemy positions — check it often.',
    'Colorblind modes are available in Settings → Display.',
  ], []);

  // Loading phase controller
  const pendingNewGame = useRef(false);
  useEffect(() => {
    if (gamePhase !== 'loading') { setLoadingProgress(0); return; }
    setLoadingTip(LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)]);
    setLoadingProgress(0);
    // If level > 1 or score > 0 we're continuing a save, otherwise new game
    const isNewGame = useStore.getState().level <= 1 && useStore.getState().score === 0;
    pendingNewGame.current = isNewGame;
    let frame: number;
    const start = performance.now();
    const DURATION = 2800;
    const tick = () => {
      const elapsed = performance.now() - start;
      const pct = Math.min(1, elapsed / DURATION);
      setLoadingProgress(pct);
      if (pct < 1) { frame = requestAnimationFrame(tick); return; }
      if (pendingNewGame.current) startGame();
      else setGamePhase('playing');
      setTimeout(() => {
        const el = document.getElementById('game-root') ?? document.body;
        el.requestPointerLock().catch(() => {});
      }, 100);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [gamePhase, startGame, setGamePhase, LOADING_TIPS]);

  // Client-only flag — avoids hydration mismatch for random particles & localStorage
  useEffect(() => {
    setMounted(true);
    setSaveExists(hasSave(selectedSaveSlot));
    setSaveSlots(getSaveSlots());
  }, [hasSave, selectedSaveSlot]);

  useEffect(() => {
    setSaveExists(hasSave(selectedSaveSlot));
    setSaveSlots(getSaveSlots());
  }, [hasSave, gamePhase, selectedSaveSlot]);

  // Load high scores when game ends
  useEffect(() => {
    if (gamePhase === 'gameover') {
      setHighScores(getHighScores());
      setScoreSubmitted(false);
      setGlobalRank(null);
      // Fetch global leaderboard
      fetch('/api/scores')
        .then(r => r.json())
        .then(data => setGlobalScores(data.scores ?? []))
        .catch(() => setGlobalScores([]));
    }
  }, [gamePhase]);

  // Sync player position for minimap at low frequency
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const id = setInterval(() => {
      setPlayerPos([...playerPosRef.current] as [number, number, number]);
    }, 200);
    return () => clearInterval(id);
  }, [gamePhase]);

  // ─── Audio: start/stop/pause music based on game phase ──────────────────
  useEffect(() => {
    if (gamePhase === 'playing') {
      audioManager.start();
      audioManager.resume();
    } else if (gamePhase === 'paused') {
      audioManager.pause();
    } else if (gamePhase === 'gameover' || gamePhase === 'menu') {
      audioManager.stop();
    }
  }, [gamePhase]);

  // ─── Audio: dynamic intensity based on enemy count + boss presence ──────
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const hasBoss = enemies.some((e) => e.type === 'juggernaut' || e.type === 'hive_queen');
    if (hasBoss) {
      audioManager.setIntensity('boss');
    } else if (enemies.length >= 5) {
      audioManager.setIntensity('combat');
    } else {
      audioManager.setIntensity('calm');
    }
  }, [gamePhase, enemies]);

  // Generate particles only on client (Math.random is fine post-hydration)
  const homeParticles = useMemo(() => {
    if (!mounted) return [];
    return Array.from({ length: 30 }, (_, i) => ({
      w: 1 + Math.random() * 2.5, left: `${Math.random() * 100}%`,
      bg: Math.random() > 0.5 ? '#22d3ee' : '#a78bfa',
      opacity: 0.3 + Math.random() * 0.4,
      dur: 6 + Math.random() * 10, delay: Math.random() * 6,
    }));
  }, [mounted]);

  const gameoverParticles = useMemo(() => {
    if (!mounted) return [];
    return Array.from({ length: 20 }, (_, i) => ({
      w: 2 + Math.random() * 3, left: `${10 + Math.random() * 80}%`,
      bg: `hsl(${Math.random() * 40}, 100%, ${50 + Math.random() * 30}%)`,
      dur: 4 + Math.random() * 6, delay: Math.random() * 3,
    }));
  }, [mounted]);

  // Player damage flash
  useEffect(() => {
    const handlePlayerHit = () => {
      setDamageFlash(1);
    };
    window.addEventListener("nova:playerHit", handlePlayerHit);
    return () => window.removeEventListener("nova:playerHit", handlePlayerHit);
  }, []);

  // Charge bar
  useEffect(() => {
    const handleCharge = (e: Event) => {
      const charge = (e as CustomEvent).detail.charge as number;
      setChargeLevel(charge);
    };
    window.addEventListener('nova:charge', handleCharge as EventListener);
    return () => window.removeEventListener('nova:charge', handleCharge as EventListener);
  }, []);

  // FPS counter
  useEffect(() => {
    if (!hudSettings.showFps) return;
    let raf: number;
    const tick = () => {
      const now = performance.now();
      fpsFramesRef.current.push(now);
      // Keep only last 1 second of timestamps
      while (fpsFramesRef.current.length > 0 && fpsFramesRef.current[0] < now - 1000) {
        fpsFramesRef.current.shift();
      }
      setFps(fpsFramesRef.current.length);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hudSettings.showFps]);

  // Combo display
  useEffect(() => {
    const handleCombo = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setComboDisplay({ count: detail.count, tier: detail.tier, multiplier: detail.multiplier });
    };
    window.addEventListener("nova:combo", handleCombo as EventListener);
    return () => window.removeEventListener("nova:combo", handleCombo as EventListener);
  }, []);

  // Tick combo decay
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const interval = window.setInterval(() => {
      tickCombo();
      const c = useStore.getState().combo;
      if (c.count < 3) setComboDisplay(null);
    }, 200);
    return () => window.clearInterval(interval);
  }, [gamePhase, tickCombo]);

  // Level-up announcement
  useEffect(() => {
    const handleLevelUp = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setLevelUpShow(detail.level);
      setTimeout(() => setLevelUpShow(null), 2500);
    };
    window.addEventListener("nova:levelup", handleLevelUp as EventListener);
    return () => window.removeEventListener("nova:levelup", handleLevelUp as EventListener);
  }, []);

  // Decay damage flash
  useEffect(() => {
    if (damageFlash <= 0) return;
    const id = requestAnimationFrame(() => setDamageFlash((f) => Math.max(0, f - 0.04)));
    return () => cancelAnimationFrame(id);
  }, [damageFlash]);

  // Screen shake — applies CSS transform to game-root on explosions/kills
  useEffect(() => {
    let intensity = 0;
    let frame: number;
    const el = document.getElementById('game-root');
    const handleShake = (e: Event) => {
      intensity = Math.max(intensity, (e as CustomEvent).detail.intensity);
    };
    const tick = () => {
      if (el) {
        if (intensity > 0.01) {
          el.style.transform = `translate(${(Math.random() - 0.5) * intensity * 10}px, ${(Math.random() - 0.5) * intensity * 10}px)`;
          intensity *= 0.85;
        } else if (intensity > 0) {
          intensity = 0;
          el.style.transform = '';
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    window.addEventListener('nova:shake', handleShake as EventListener);
    return () => { window.removeEventListener('nova:shake', handleShake as EventListener); cancelAnimationFrame(frame); };
  }, []);

  // Floating damage numbers — creates DOM elements directly for zero React overhead
  useEffect(() => {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:150;overflow:hidden';
    document.body.appendChild(container);
    const handleDmg = (e: Event) => {
      const { x, y, damage: dmg, kill } = (e as CustomEvent).detail;
      const el = document.createElement('div');
      el.className = `dmg-num ${kill ? 'dmg-kill' : 'dmg-hit'}`;
      el.textContent = kill ? `${dmg} ✗` : `${dmg}`;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      container.appendChild(el);
      setTimeout(() => el.remove(), 900);
    };
    window.addEventListener('nova:damage', handleDmg as EventListener);
    return () => { window.removeEventListener('nova:damage', handleDmg as EventListener); container.remove(); };
  }, []);

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
        // Pointer lock acquired during menu/gameover/loading — force exit
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

    // Enemy death sounds
    const handleEnemyDeath = (e: Event) => {
      const { type } = (e as CustomEvent).detail;
      if (type) audioManager.playEnemyDeath(type);
    };
    window.addEventListener("nova:enemydeath", handleEnemyDeath as EventListener);

    return () => {
      window.removeEventListener("nova:hit", handleHit as EventListener);
      window.removeEventListener("nova:incoming", handleIncoming as EventListener);
      window.removeEventListener("nova:enemydeath", handleEnemyDeath as EventListener);
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
      tickBuffs();
    }, 40);

    return () => window.clearInterval(interval);
  }, []);

  const handleStartGame = useCallback(() => {
    setGamePhase('loading');
  }, [setGamePhase]);

  const handlePlayAgain = useCallback(() => {
    resetGame();
    setGamePhase('loading');
  }, [resetGame, setGamePhase]);

  const handleMainMenu = useCallback(() => {
    resetGame();
    if (document.pointerLockElement) document.exitPointerLock();
  }, [resetGame]);

  // Colorblind CSS filter
  const colorblindFilter = useMemo(() => {
    switch (hudSettings.colorblindMode) {
      case 'protanopia': return 'url(#cb-protanopia)';
      case 'deuteranopia': return 'url(#cb-deuteranopia)';
      case 'tritanopia': return 'url(#cb-tritanopia)';
      default: return 'none';
    }
  }, [hudSettings.colorblindMode]);

  return (
    <main id="game-root" className="w-screen h-screen relative bg-[#050510] font-sans selection:bg-cyan-900 overflow-hidden" style={{ filter: colorblindFilter }}>
      {/* SVG colorblind simulation filters */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="cb-protanopia">
            <feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0" />
          </filter>
          <filter id="cb-deuteranopia">
            <feColorMatrix type="matrix" values="0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0" />
          </filter>
          <filter id="cb-tritanopia">
            <feColorMatrix type="matrix" values="0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0" />
          </filter>
        </defs>
      </svg>
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
            <LootDrops />
            <EnemyProjectiles />

            <RigidBody type="fixed" position={[0, 4, -15]} colliders="cuboid">
              <mesh castShadow receiveShadow><boxGeometry args={[4, 10, 4]} /><meshStandardMaterial color="#000" roughness={0.1} metalness={0.9} /></mesh>
            </RigidBody>
            <RigidBody type="fixed" position={[12, 3, -5]} colliders="cuboid">
              <mesh castShadow receiveShadow><boxGeometry args={[3, 6, 3]} /><meshStandardMaterial color="#000" roughness={0.1} metalness={0.9} /></mesh>
            </RigidBody>

            {/* === RAISED PLATFORMS === */}
            {[
              { pos: [-20, 1.5, -25], size: [10, 3, 8] },
              { pos: [25, 2, -30], size: [8, 4, 6] },
              { pos: [-30, 1, 15], size: [12, 2, 10] },
              { pos: [35, 2.5, 20], size: [7, 5, 7] },
            ].map((p, i) => (
              <RigidBody key={`plat-${i}`} type="fixed" colliders="cuboid" position={p.pos as [number, number, number]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={p.size as [number, number, number]} />
                  <meshStandardMaterial color="#08081a" metalness={0.85} roughness={0.2} emissive="#0066ff" emissiveIntensity={0.05} />
                </mesh>
                {/* Top edge glow */}
                <mesh position={[0, p.size[1] / 2 + 0.01, 0]}>
                  <boxGeometry args={[p.size[0], 0.02, p.size[2]]} />
                  <meshStandardMaterial color="#000" emissive="#00ffff" emissiveIntensity={0.6} toneMapped={false} transparent opacity={0.25} />
                </mesh>
              </RigidBody>
            ))}

            {/* === COVER WALLS === */}
            {[
              { pos: [-10, 1.25, -8], size: [6, 2.5, 0.5] },
              { pos: [8, 1.25, -20], size: [0.5, 2.5, 6] },
              { pos: [-15, 1, 10], size: [4, 2, 0.5] },
              { pos: [20, 1, 8], size: [0.5, 2, 5] },
              { pos: [0, 1.25, 20], size: [8, 2.5, 0.5] },
              { pos: [-25, 1, -10], size: [0.5, 2, 4] },
            ].map((c, i) => (
              <RigidBody key={`cover-${i}`} type="fixed" colliders="cuboid" position={c.pos as [number, number, number]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={c.size as [number, number, number]} />
                  <meshStandardMaterial color="#0a0a12" metalness={0.8} roughness={0.3} emissive="#ff0044" emissiveIntensity={0.03} />
                </mesh>
              </RigidBody>
            ))}

            {/* === MOVING PLATFORMS === */}
            <MovingPlatform from={[-35, 3, 0]} to={[-35, 8, 0]} size={[6, 0.5, 6]} speed={0.6} />
            <MovingPlatform from={[15, 1, 30]} to={[30, 1, 30]} size={[5, 0.5, 5]} speed={0.8} />

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

        <EffectComposer enabled={hudSettings.graphicsQuality !== 'low'}>
          <Bloom luminanceThreshold={1} mipmapBlur intensity={hudSettings.graphicsQuality === 'high' ? 1.5 : 0.8} />
          <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(hudSettings.graphicsQuality === 'high' ? 0.002 : 0, hudSettings.graphicsQuality === 'high' ? 0.002 : 0)} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
          <Noise opacity={hudSettings.graphicsQuality === 'high' ? 0.03 : 0} />
        </EffectComposer>

        <MouseLook />
        <CameraFOV />
        <CameraTracker posRef={playerPosRef} />
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
            {/* Charge bar below reticle */}
            {chargeLevel > 0.05 && (
              <div style={{
                position: 'absolute',
                top: '130%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '60px',
                height: '4px',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '2px',
                overflow: 'hidden',
                border: `1px solid ${chargeLevel >= 1 ? '#facc15' : 'rgba(255,255,255,0.2)'}`,
              }}>
                <div style={{
                  width: `${chargeLevel * 100}%`,
                  height: '100%',
                  background: chargeLevel >= 1
                    ? 'linear-gradient(90deg, #facc15, #fde047)'
                    : chargeLevel > 0.5
                    ? 'linear-gradient(90deg, #f97316, #facc15)'
                    : `linear-gradient(90deg, ${reticleColor}, ${reticleColor})`,
                  transition: 'width 0.05s linear',
                  boxShadow: chargeLevel >= 1 ? '0 0 8px #facc15' : 'none',
                }} />
              </div>
            )}
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
              {shieldHP > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-blue-400/80 font-mono text-xs uppercase">Shield</span>
                    <span className="font-mono font-bold text-sm text-blue-300">{shieldHP}</span>
                  </div>
                  <div className="h-2 rounded-full bg-black/50 overflow-hidden border border-blue-400/20">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-300 transition-all duration-300"
                      style={{ width: `${Math.min(100, (shieldHP / 30) * 100)}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom-right weapon info */}
          <div className="absolute bottom-4 right-4">
            <div className="glass-panel p-3 text-right">
              <div className="text-cyan-400 font-mono text-xs tracking-widest uppercase">{equippedWeapon}</div>
              <div className="text-white font-black text-xl italic tracking-tighter">LVL {weaponLevels[equippedWeapon]}</div>
            </div>
          </div>

          {/* Top-right active buffs */}
          {activeBuffs.length > 0 && (
            <div className="absolute top-4 right-4 flex flex-col gap-1.5">
              {activeBuffs.map((buff) => {
                const remaining = Math.max(0, Math.ceil((buff.expiresAt - Date.now()) / 1000));
                const cfg = LOOT_CONFIG[buff.type as keyof typeof LOOT_CONFIG];
                return (
                  <div key={buff.type} className="glass-panel px-3 py-1.5 flex items-center gap-2 min-w-[140px]"
                    style={{ borderColor: cfg?.color ?? '#fff', boxShadow: `0 0 12px ${cfg?.color ?? '#fff'}40` }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: cfg?.color ?? '#fff' }} />
                    <span className="font-mono text-xs uppercase tracking-wider text-white/90">{cfg?.label ?? buff.type}</span>
                    <span className="ml-auto font-mono text-xs font-bold" style={{ color: cfg?.color ?? '#fff' }}>{remaining}s</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== WEAPON WHEEL ===== */}
      {gamePhase === 'playing' && <WeaponWheel />}

      {/* ===== MINIMAP ===== */}
      <Minimap playerPos={playerPos} />

      {/* ===== BOSS HEALTH BAR ===== */}
      {showBossBar && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[115] pointer-events-none w-[400px]">
          <div className="glass-panel p-3" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', boxShadow: '0 0 20px rgba(239, 68, 68, 0.15)' }}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-orbitron text-xs font-bold tracking-[0.2em] text-red-400 uppercase"
                style={{ textShadow: '0 0 10px rgba(239, 68, 68, 0.6)' }}>
                {bossName}
              </span>
              <span className="font-mono text-xs font-bold text-red-300">
                {bossHP}/{bossMaxHP}
              </span>
            </div>
            <div className="h-3 rounded-full bg-black/60 overflow-hidden border border-red-500/30">
              <div
                className="h-full transition-all duration-200 bg-gradient-to-r from-red-600 via-red-500 to-orange-400"
                style={{
                  width: `${bossMaxHP > 0 ? (bossHP / bossMaxHP) * 100 : 0}%`,
                  boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2), 0 0 8px rgba(239, 68, 68, 0.4)',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ===== COMBO HUD ===== */}
      {comboDisplay && gamePhase === 'playing' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[115] pointer-events-none text-center"
          style={{ animation: 'combo-pop 0.3s ease-out' }} key={comboDisplay.count}>
          <div className="font-orbitron text-5xl font-black tracking-tighter"
            style={{
              color: comboDisplay.multiplier >= 4 ? '#facc15' : comboDisplay.multiplier >= 2.5 ? '#f43f5e' : comboDisplay.multiplier >= 2 ? '#f97316' : '#22d3ee',
              textShadow: `0 0 30px currentColor, 0 0 60px currentColor`,
              animation: comboDisplay.multiplier >= 3 ? 'combo-shake 0.1s linear infinite' : 'none',
            }}>
            {comboDisplay.count}x
          </div>
          <div className="font-orbitron text-lg font-bold tracking-[0.3em] uppercase mt-1"
            style={{
              color: comboDisplay.multiplier >= 4 ? '#fde047' : comboDisplay.multiplier >= 2.5 ? '#fda4af' : comboDisplay.multiplier >= 2 ? '#fdba74' : '#67e8f9',
              textShadow: '0 0 10px currentColor',
            }}>
            {comboDisplay.tier}
          </div>
          <div className="font-mono text-xs text-white/60 mt-0.5">{comboDisplay.multiplier}x SCORE</div>
        </div>
      )}

      {/* ===== LEVEL UP OVERLAY ===== */}
      {levelUpShow !== null && (
        <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0" style={{ animation: 'levelup-flash 0.6s ease-out forwards', background: 'radial-gradient(circle, rgba(34,211,238,0.4), transparent 70%)' }} />
          <div className="absolute w-[600px] h-[600px] rounded-full border-2 border-cyan-400/60"
            style={{ animation: 'levelup-ring 2s ease-out forwards' }} />
          <div className="absolute w-[400px] h-[400px] rounded-full border border-cyan-300/30"
            style={{ animation: 'levelup-ring 2s ease-out 0.2s forwards' }} />
          <div className="text-center" style={{ animation: 'levelup-text 2.5s ease-out forwards' }}>
            <div className="font-orbitron text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-400"
              style={{ textShadow: '0 0 40px rgba(34,211,238,0.8), 0 0 80px rgba(34,211,238,0.4)', WebkitTextStroke: '1px rgba(34,211,238,0.3)' }}>
              LEVEL {levelUpShow}
            </div>
            <div className="font-orbitron text-xl font-bold tracking-[0.5em] text-cyan-300 mt-2"
              style={{ textShadow: '0 0 20px rgba(34,211,238,0.6)' }}>
              THREAT ESCALATION
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

      {/* ===== FPS COUNTER ===== */}
      {hudSettings.showFps && (
        <div className="fixed top-1 right-1 z-[300] pointer-events-none font-mono text-xs px-2 py-0.5 rounded bg-black/60 border border-cyan-500/20"
          style={{ color: fps >= 50 ? '#4ade80' : fps >= 30 ? '#facc15' : '#f87171' }}>
          {fps} FPS
        </div>
      )}

      {/* ===== HOME SCREEN ===== */}
      {gamePhase === 'menu' && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center cursor-default select-none"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}>

          {/* Deep space background */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(0,30,60,1) 0%, rgba(2,4,10,1) 60%, #000 100%)',
          }} />

          {/* Animated nebula blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute w-[600px] h-[600px] rounded-full top-[-10%] left-[-5%] opacity-[0.07]"
              style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.6), transparent 70%)', animation: 'home-hex-pulse 8s ease-in-out infinite' }} />
            <div className="absolute w-[500px] h-[500px] rounded-full bottom-[-5%] right-[-5%] opacity-[0.05]"
              style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.6), transparent 70%)', animation: 'home-hex-pulse 10s ease-in-out 2s infinite' }} />
            <div className="absolute w-[400px] h-[400px] rounded-full top-[40%] left-[60%] opacity-[0.04]"
              style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.5), transparent 70%)', animation: 'home-hex-pulse 12s ease-in-out 4s infinite' }} />
          </div>

          {/* Scanlines */}
          <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.15) 2px, rgba(0,255,255,0.15) 4px)',
            animation: 'scan 8s linear infinite',
          }} />

          {/* Hex grid pattern */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52'%3E%3Cpath d='M30 0L60 15v22L30 52 0 37V15z' fill='none' stroke='%2322d3ee' stroke-width='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 52px',
            animation: 'home-hex-pulse 6s ease-in-out infinite',
          }} />

          {/* Rising particles */}
          {homeParticles.map((p, i) => (
            <div key={i} className="absolute rounded-full pointer-events-none" style={{
              width: p.w,
              height: p.w,
              left: p.left,
              bottom: '-2%',
              background: p.bg,
              opacity: p.opacity,
              animation: `home-particle-rise ${p.dur}s linear ${p.delay}s infinite`,
            }} />
          ))}

          {/* Grid floor with perspective */}
          <div className="absolute bottom-0 left-0 right-0 h-[40%]" style={{
            backgroundImage: 'linear-gradient(rgba(0,255,255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.25) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            maskImage: 'linear-gradient(to bottom, transparent 10%, rgba(0,0,0,0.6) 50%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 10%, rgba(0,0,0,0.6) 50%, black 100%)',
            transform: 'perspective(400px) rotateX(45deg)',
            transformOrigin: 'bottom center',
            opacity: 0.15,
          }} />

          {/* Horizontal accent lines */}
          <div className="absolute top-[18%] left-0 right-0 h-px opacity-20 pointer-events-none" style={{
            background: 'linear-gradient(90deg, transparent 5%, rgba(34,211,238,0.4) 30%, rgba(34,211,238,0.6) 50%, rgba(34,211,238,0.4) 70%, transparent 95%)',
          }} />
          <div className="absolute bottom-[22%] left-0 right-0 h-px opacity-15 pointer-events-none" style={{
            background: 'linear-gradient(90deg, transparent 10%, rgba(168,85,247,0.3) 35%, rgba(168,85,247,0.5) 50%, rgba(168,85,247,0.3) 65%, transparent 90%)',
          }} />

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center text-center px-4" style={{ animation: 'home-float 6s ease-in-out infinite' }}>

            {/* System tag */}
            <p className="text-cyan-500/40 font-mono text-[10px] tracking-[0.8em] uppercase mb-6" style={{ animation: 'home-stat-count 1s ease-out 0.2s both' }}>
              SYSTEM v2.1 // COMBAT SIMULATION
            </p>

            {/* Title group */}
            <div className="relative px-6 py-3" style={{ animation: 'home-title-glow 4s ease-in-out infinite' }}>
              <h1 className="font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-500 font-black text-[7rem] md:text-[9rem] tracking-tight italic leading-[0.85]">
                NOVA
              </h1>
              {/* Glitch layers */}
              <h1 className="absolute inset-0 px-6 py-3 font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-red-500/40 to-cyan-500/40 font-black text-[7rem] md:text-[9rem] tracking-tight italic leading-[0.85] pointer-events-none"
                style={{ transform: 'translate(3px, -2px)', opacity: 0.3, animation: 'gameover-glitch 4s steps(1) infinite' }}>
                NOVA
              </h1>
              <h1 className="absolute inset-0 px-6 py-3 font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-500/30 to-purple-500/30 font-black text-[7rem] md:text-[9rem] tracking-tight italic leading-[0.85] pointer-events-none"
                style={{ transform: 'translate(-2px, 1px)', opacity: 0.2 }}>
                NOVA
              </h1>
            </div>

            {/* Subtitle with line decoration */}
            <div className="flex items-center gap-4 mt-3" style={{ animation: 'home-stat-count 1s ease-out 0.5s both' }}>
              <div className="w-16 h-px bg-gradient-to-r from-transparent to-cyan-400/50" />
              <p className="text-cyan-200/60 font-mono text-sm tracking-[0.6em] uppercase font-light">ARENA SHOOTER</p>
              <div className="w-16 h-px bg-gradient-to-l from-transparent to-cyan-400/50" />
            </div>

            {/* Animated divider */}
            <svg className="mt-6 mb-6" width="300" height="3" viewBox="0 0 300 3" style={{ animation: 'home-stat-count 1s ease-out 0.7s both' }}>
              <line x1="0" y1="1.5" x2="300" y2="1.5" stroke="url(#divGrad)" strokeWidth="1" strokeDasharray="100" style={{ animation: 'home-line-draw 2s ease-out forwards' }} />
              <defs><linearGradient id="divGrad"><stop offset="0%" stopColor="transparent"/><stop offset="50%" stopColor="rgba(34,211,238,0.6)"/><stop offset="100%" stopColor="transparent"/></linearGradient></defs>
              <circle cx="150" cy="1.5" r="1.5" fill="#22d3ee" opacity="0.8" />
            </svg>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 items-center" style={{ animation: 'home-stat-count 1s ease-out 0.9s both' }}>
              {/* Save slots */}
              {mounted && (
                <div className="flex gap-3 mb-2">
                  {saveSlots.map((slot, i) => (
                    <button key={i}
                      onClick={() => setSelectedSaveSlot(i)}
                      className={`relative rounded-lg px-5 py-3 font-mono text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer min-w-[140px] text-left ${
                        selectedSaveSlot === i
                          ? 'border border-cyan-400/60 bg-cyan-500/15 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                          : 'border border-cyan-500/20 bg-black/40 text-slate-400 hover:border-cyan-500/40 hover:bg-cyan-500/5'
                      }`}
                    >
                      <div className="font-bold text-[10px] tracking-widest mb-1">SLOT {i + 1}</div>
                      {slot ? (
                        <>
                          <div className="text-cyan-300 font-bold">LV {slot.level} &bull; {slot.score.toLocaleString()} pts</div>
                          <div className="text-slate-500 text-[9px] mt-0.5">{slot.totalKills} kills &bull; {new Date(slot.savedAt).toLocaleDateString()}</div>
                        </>
                      ) : (
                        <div className="text-slate-600">EMPTY</div>
                      )}
                      {slot && selectedSaveSlot === i && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSave(i); setSaveSlots(getSaveSlots()); setSaveExists(hasSave(selectedSaveSlot)); }}
                          className="absolute top-1.5 right-1.5 text-red-500/50 hover:text-red-400 text-[10px] font-bold cursor-pointer"
                          title="Delete save"
                        >✕</button>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-4">
                <button onClick={handleStartGame}
                  className="group relative px-16 py-5 rounded-lg text-white font-orbitron font-black tracking-[0.4em] text-base uppercase cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.03]"
                  style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.12), rgba(59,130,246,0.08))', border: '1px solid rgba(34,211,238,0.5)', boxShadow: '0 0 30px rgba(34,211,238,0.1), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                  <span className="relative z-10">NEW GAME</span>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(59,130,246,0.15))' }} />
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/15 to-cyan-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <div className="absolute bottom-0 left-[10%] right-[10%] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.6), transparent)', animation: 'home-border-sweep 3s linear infinite', backgroundSize: '200% 100%' }} />
                </button>
                {mounted && saveSlots[selectedSaveSlot] && (
                  <button onClick={() => { loadGame(selectedSaveSlot); setGamePhase('loading'); }}
                    className="group relative px-12 py-5 rounded-lg text-white font-orbitron font-black tracking-[0.3em] text-base uppercase cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.03]"
                    style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(34,211,238,0.08))', border: '1px solid rgba(16,185,129,0.5)', boxShadow: '0 0 30px rgba(16,185,129,0.1), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                    <span className="relative z-10">CONTINUE</span>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(34,211,238,0.15))' }} />
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/15 to-emerald-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <div className="absolute bottom-0 left-[10%] right-[10%] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.6), transparent)', animation: 'home-border-sweep 3s linear infinite', backgroundSize: '200% 100%' }} />
                  </button>
                )}
              </div>

              {/* Controls hint */}
              <div className="flex gap-5 text-cyan-500/30 font-mono text-[10px] tracking-widest uppercase mt-2">
                <span>WASD Move</span>
                <span className="text-cyan-500/15">&bull;</span>
                <span>Mouse Aim</span>
                <span className="text-cyan-500/15">&bull;</span>
                <span>Click Shoot</span>
                <span className="text-cyan-500/15">&bull;</span>
                <span>Q Weapon Wheel</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-12 flex gap-8 text-center">
              {[
                { label: 'WEAPONS', value: '18', sub: 'CLASSES', delay: '1.1s' },
                { label: 'ENEMIES', value: '8', sub: 'TYPES', delay: '1.3s' },
                { label: 'UPGRADES', value: '90', sub: 'TOTAL', delay: '1.5s' },
                { label: 'WAVES', value: '∞', sub: 'ENDLESS', delay: '1.7s' },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-1 min-w-[75px]" style={{ animation: `home-stat-count 0.8s ease-out ${s.delay} both` }}>
                  <span className="text-cyan-500/40 font-mono text-[9px] uppercase tracking-[0.3em]">{s.label}</span>
                  <span className="text-white font-orbitron font-black text-3xl" style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.3))' }}>{s.value}</span>
                  <span className="text-cyan-400/20 font-mono text-[8px] uppercase tracking-wider">{s.sub}</span>
                </div>
              ))}
            </div>

            {/* Version tag */}
            <p className="mt-10 text-cyan-800/40 font-mono text-[9px] tracking-[0.4em] uppercase" style={{ animation: 'home-stat-count 1s ease-out 2s both' }}>
              BUILD 2.1.0 // ALL SYSTEMS OPERATIONAL
            </p>
          </div>
        </div>
      )}

      {/* ===== LOADING SCREEN ===== */}
      {gamePhase === 'loading' && (
        <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black cursor-default select-none">
          {/* Animated grid background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
              animation: 'loading-grid-scroll 4s linear infinite',
            }} />
          </div>

          {/* Logo shimmer */}
          <div className="relative mb-12">
            <h1 className="font-orbitron font-black text-5xl tracking-[0.5em] text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg, #22d3ee 0%, #3b82f6 50%, #22d3ee 100%)', backgroundSize: '200% 100%', animation: 'loading-shimmer 2s ease-in-out infinite' }}>
              NOVA
            </h1>
            <div className="absolute -bottom-2 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
          </div>

          {/* Loading bar */}
          <div className="w-80 h-1 bg-slate-900/80 rounded-full overflow-hidden border border-cyan-900/30 mb-6">
            <div className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${loadingProgress * 100}%`,
                background: 'linear-gradient(90deg, #22d3ee, #3b82f6)',
                boxShadow: '0 0 12px rgba(34,211,238,0.5)',
              }} />
          </div>

          {/* Status text */}
          <div className="font-mono text-cyan-500/50 text-[10px] tracking-[0.5em] uppercase mb-10">
            {loadingProgress < 0.3 ? 'INITIALIZING SYSTEMS' : loadingProgress < 0.6 ? 'LOADING ARENA' : loadingProgress < 0.9 ? 'CALIBRATING WEAPONS' : 'READY'}
          </div>

          {/* Tip */}
          <div className="max-w-md text-center px-6">
            <span className="text-cyan-400/30 font-mono text-[9px] tracking-[0.3em] uppercase">TIP</span>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">{loadingTip}</p>
          </div>

          <style>{`
            @keyframes loading-grid-scroll {
              from { transform: translate(0, 0); }
              to { transform: translate(60px, 60px); }
            }
            @keyframes loading-shimmer {
              0%, 100% { background-position: 0% center; }
              50% { background-position: 200% center; }
            }
          `}</style>
        </div>
      )}

      {/* ===== GAME OVER SCREEN ===== */}
      {gamePhase === 'gameover' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center cursor-default"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}>

          {/* Darkened background with red vignette */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at center, transparent 20%, rgba(120,0,0,0.25) 60%, rgba(60,0,0,0.5) 100%)',
          }} />

          {/* Scanlines */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,60,60,0.2) 2px, rgba(255,60,60,0.2) 4px)',
          }} />

          {/* Floating ember particles */}
          {gameoverParticles.map((p, i) => (
            <div key={i} className="absolute rounded-full pointer-events-none" style={{
              width: p.w,
              height: p.w,
              left: p.left,
              bottom: '-5%',
              background: p.bg,
              animation: `gameover-particle ${p.dur}s linear ${p.delay}s infinite`,
              filter: 'blur(0.5px)',
            }} />
          ))}

          {/* Expanding shockwave ring */}
          <div className="absolute left-1/2 top-[38%] pointer-events-none" style={{
            width: 300, height: 300,
            border: '1px solid rgba(255,60,60,0.3)',
            borderRadius: '50%',
            animation: 'gameover-ring 4s ease-out infinite',
          }} />
          <div className="absolute left-1/2 top-[38%] pointer-events-none" style={{
            width: 300, height: 300,
            border: '1px solid rgba(255,120,0,0.2)',
            borderRadius: '50%',
            animation: 'gameover-ring 4s ease-out 1.5s infinite',
          }} />

          {/* Main card */}
          <div className="relative z-10 glass-panel p-0 text-center w-[min(92vw,520px)] border-red-500/40 shadow-[0_0_120px_rgba(255,30,30,0.2),0_0_60px_rgba(255,60,30,0.15)]"
            style={{ animation: 'gameover-fadein 0.6s ease-out forwards' }}>

            {/* Red accent line top */}
            <div className="h-[2px] rounded-t-[20px]" style={{
              background: 'linear-gradient(90deg, transparent, #ff3333, #ff6600, #ff3333, transparent)',
              animation: 'gameover-expand 0.8s ease-out forwards',
            }} />

            <div className="px-8 pt-8 pb-10">
              {/* Title with glitch */}
              <div className="relative inline-block pb-1">
                <h1 className="font-orbitron bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-orange-400 to-red-500 font-black text-5xl md:text-6xl tracking-tight italic leading-tight px-2"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(255,60,60,0.5))' }}>
                  TERMINATED
                </h1>
                {/* Glitch layer */}
                <h1 className="absolute inset-0 font-orbitron bg-clip-text text-transparent bg-gradient-to-r from-cyan-500/50 to-red-500/50 font-black text-5xl md:text-6xl tracking-tight italic leading-tight px-2 pointer-events-none"
                  style={{ animation: 'gameover-glitch 3s steps(1) infinite' }}>
                  TERMINATED
                </h1>
              </div>

              <p className="text-red-300/80 font-mono text-sm tracking-[0.4em] mt-2 uppercase font-bold"
                style={{ animation: 'gameover-fadein 0.8s ease-out 0.3s both' }}>
                Hull integrity compromised
              </p>

              {/* Divider */}
              <div className="mt-6 mb-6 h-px mx-auto w-3/4" style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,60,60,0.4), transparent)',
                animation: 'gameover-expand 1s ease-out 0.5s both',
              }} />

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3" style={{ animation: 'gameover-fadein 0.8s ease-out 0.5s both' }}>
                <div className="rounded-lg border border-red-500/25 bg-red-950/20 p-3">
                  <div className="text-red-300/60 font-mono text-[10px] uppercase tracking-widest font-bold">Score</div>
                  <div className="text-white font-mono font-black text-2xl mt-1">{score.toString().padStart(5, '0')}</div>
                </div>
                <div className="rounded-lg border border-red-500/25 bg-red-950/20 p-3">
                  <div className="text-red-300/60 font-mono text-[10px] uppercase tracking-widest font-bold">Level</div>
                  <div className="text-white font-mono font-black text-2xl mt-1">{level}</div>
                </div>
                <div className="rounded-lg border border-red-500/25 bg-red-950/20 p-3">
                  <div className="text-red-300/60 font-mono text-[10px] uppercase tracking-widest font-bold">Kills</div>
                  <div className="text-white font-mono font-black text-2xl mt-1">{totalKills}</div>
                </div>
              </div>

              {/* Submit Score */}
              <div className="mt-4" style={{ animation: 'gameover-fadein 0.8s ease-out 0.55s both' }}>
                {!scoreSubmitted ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ENTER NAME..."
                      maxLength={20}
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="flex-1 rounded-lg border border-red-500/30 bg-black/60 px-3 py-2.5 font-mono text-sm text-white uppercase tracking-wider placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/60 transition"
                    />
                    <button
                      onClick={async () => {
                        const name = playerName.trim() || 'ANON';
                        localStorage.setItem('nova_player_name', name);
                        setScoreSubmitted(true);
                        try {
                          const res = await fetch('/api/scores', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              username: name,
                              score,
                              level,
                              kills: totalKills,
                              maxCombo: combo.maxCombo,
                              weapon: equippedWeapon,
                              timePlayed: gameStartedAt ? Math.round((Date.now() - gameStartedAt) / 1000) : 0,
                              damageDealt,
                            }),
                          });
                          const data = await res.json();
                          if (data.rank) setGlobalRank(Number(data.rank));
                          // Refresh global scores
                          const lb = await fetch('/api/scores').then(r => r.json());
                          setGlobalScores(lb.scores ?? []);
                        } catch {
                          // Offline fallback — score still saved locally
                        }
                      }}
                      className="rounded-lg border border-cyan-400/60 bg-cyan-500/15 px-5 py-2.5 font-orbitron font-bold text-sm text-cyan-200 uppercase tracking-wider hover:bg-cyan-400/25 transition cursor-pointer"
                    >
                      SUBMIT
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="font-mono text-sm text-cyan-300">
                      SCORE UPLOADED{globalRank ? ` — RANK #${globalRank}` : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Leaderboard Tabs */}
              <div className="mt-4" style={{ animation: 'gameover-fadein 0.8s ease-out 0.6s both' }}>
                <div className="flex gap-1 mb-2">
                  <button
                    onClick={() => setLeaderboardTab('global')}
                    className={`flex-1 py-1.5 rounded font-mono text-[10px] uppercase tracking-widest font-bold transition ${leaderboardTab === 'global' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-500 border border-transparent hover:text-slate-300'}`}
                  >GLOBAL</button>
                  <button
                    onClick={() => setLeaderboardTab('local')}
                    className={`flex-1 py-1.5 rounded font-mono text-[10px] uppercase tracking-widest font-bold transition ${leaderboardTab === 'local' ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'text-slate-500 border border-transparent hover:text-slate-300'}`}
                  >LOCAL</button>
                </div>

                <div className="rounded-lg border border-red-500/20 bg-red-950/15 p-3">
                  <div className="space-y-1 max-h-[160px] overflow-y-auto">
                    {leaderboardTab === 'global' ? (
                      globalScores.length > 0 ? globalScores.slice(0, 10).map((gs, i) => (
                        <div key={i} className={`flex items-center font-mono text-xs px-2 py-1 rounded ${gs.username === (playerName.trim() || 'ANON') && gs.score === score ? 'bg-cyan-500/15 text-white' : 'text-slate-400'}`}>
                          <span className="text-cyan-300/50 w-5 shrink-0">{i + 1}.</span>
                          <span className="w-20 truncate font-bold text-white/80">{gs.username}</span>
                          <span className="flex-1 text-right font-bold">{gs.score.toLocaleString()}</span>
                          <span className="text-slate-500 ml-3 w-8 text-right">Lv{gs.level}</span>
                          <span className="text-slate-500 ml-2 w-8 text-right">{gs.kills}K</span>
                        </div>
                      )) : (
                        <p className="text-slate-500 font-mono text-xs text-center py-4">
                          {globalScores.length === 0 ? 'No scores yet — be the first!' : 'Loading...'}
                        </p>
                      )
                    ) : (
                      highScores.length > 0 ? highScores.slice(0, 5).map((hs, i) => (
                        <div key={i} className={`flex justify-between items-center font-mono text-xs px-2 py-1 rounded ${hs.score === score && hs.kills === totalKills ? 'bg-red-500/15 text-white' : 'text-slate-400'}`}>
                          <span className="text-red-300/50 w-5">{i + 1}.</span>
                          <span className="flex-1 font-bold">{hs.score.toLocaleString()}</span>
                          <span className="text-slate-500 ml-3">Lv{hs.level}</span>
                          <span className="text-slate-500 ml-3">{hs.kills}K</span>
                        </div>
                      )) : (
                        <p className="text-slate-500 font-mono text-xs text-center py-4">No local scores yet</p>
                      )
                    )}
                  </div>
                </div>
              </div>
            
              {/* Buttons */}
              <div className="mt-8 flex flex-col gap-3" style={{ animation: 'gameover-fadein 0.8s ease-out 0.7s both' }}>
                <button onClick={handlePlayAgain}
                  className="group relative w-full px-8 py-4 rounded-xl border border-cyan-400/60 bg-cyan-500/10 text-white font-orbitron font-black tracking-[0.3em] text-base hover:bg-cyan-400/25 hover:border-cyan-300 transition-all uppercase cursor-pointer overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.15)]"
                  style={{ animation: 'gameover-pulse 2s ease-in-out infinite' }}>
                  <span className="relative z-10">PLAY AGAIN</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/10 to-cyan-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </button>
                <button onClick={handleMainMenu}
                  className="w-full px-8 py-3 rounded-xl border border-slate-500/30 bg-slate-900/30 text-slate-400 font-orbitron font-bold tracking-[0.2em] text-sm hover:bg-slate-800/40 hover:text-slate-200 hover:border-slate-400/50 transition-all uppercase cursor-pointer">
                  MAIN MENU
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== PAUSE MENU ===== */}
      {gamePhase === 'paused' && <PauseMenu />}
    </main>
  );
}
