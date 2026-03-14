"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store";
import type { WeaponType } from "@/store";

type WeaponCard = {
  id: WeaponType;
  label: string;
  blurb: string;
  unlockCost: number;
  baseUpgrade: number;
  accent: string;
};

const WEAPONS: WeaponCard[] = [
  {
    id: "plasmacaster",
    label: "Plasmacaster",
    blurb: "Precision raycast platform with stable burst timing and clean single-target deletion.",
    unlockCost: 0,
    baseUpgrade: 2500,
    accent: "cyan",
  },
  {
    id: "shrapnel",
    label: "Shrapnel Cannon",
    blurb: "Close-range cone spread that melts swarm packs and punishes flank pressure.",
    unlockCost: 5000,
    baseUpgrade: 4500,
    accent: "amber",
  },
  {
    id: "bio",
    label: "Bio-Infection",
    blurb: "Corrosive impact payload designed for chained damage-over-time propagation.",
    unlockCost: 12000,
    baseUpgrade: 8000,
    accent: "emerald",
  },
  {
    id: "nuke",
    label: "Apocalyptic Core",
    blurb: "High-yield detonation architecture for screen-clearing catastrophic bursts.",
    unlockCost: 50000,
    baseUpgrade: 30000,
    accent: "rose",
  },
];

const UI_SFX = {
  hover: "/ribhavagrawal-achievement-video-game-type-1-230515.mp3",
  equip: "/dragon-studio-game-show-correct-tick-sound-416167.mp3",
  success: "/universfield-game-bonus-144751.mp3",
  denied: "/freesound_community-080047_lose_funny_retro_video-game-80925.mp3",
};

function playUiSound(src: string, volume = 0.35) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.play().catch(() => {
    // Ignore browser autoplay restrictions.
  });
}

function getWeaponStats(id: WeaponType, level: number) {
  if (id === "plasmacaster") {
    return { damage: 30 + level * 8, spread: 8, cadence: 72 + level * 3, aoe: 12 + level * 2 };
  }
  if (id === "shrapnel") {
    return { damage: 22 + level * 6, spread: 70, cadence: 58 + level * 2, aoe: 34 + level * 4 };
  }
  if (id === "bio") {
    return { damage: 16 + level * 4, spread: 20, cadence: 46 + level * 3, aoe: 45 + level * 5 };
  }
  return { damage: 80 + level * 10, spread: 15, cadence: 22 + level * 2, aoe: 95 };
}

function pulseClick() {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(12);
  }
}

export function PauseMenu() {
  const {
    isPaused,
    score,
    level,
    killsThisLevel,
    equippedWeapon,
    weaponLevels,
    hudSettings,
    buyWeaponUpgrade,
    equipWeapon,
    cycleReticleScale,
    toggleHighContrastReticle,
    toggleReducedMotion,
  } = useStore();
  const [statusLine, setStatusLine] = useState("READY");
  const [cursor, setCursor] = useState({ x: -100, y: -100 });

  const levelTarget = level * 10;
  const levelProgress = Math.min(100, (killsThisLevel / levelTarget) * 100);

  const cards = useMemo(() => {
    return WEAPONS.map((weapon) => {
      const weaponLevel = weaponLevels[weapon.id];
      const unlocked = weaponLevel > 0;
      const equipped = unlocked && equippedWeapon === weapon.id;
      const unlockCost = weapon.unlockCost;
      const upgradeCost = Math.floor(weapon.baseUpgrade * (1 + Math.max(weaponLevel - 1, 0) * 0.5));
      return {
        ...weapon,
        weaponLevel,
        unlocked,
        equipped,
        unlockCost,
        upgradeCost,
        canUnlock: score >= unlockCost,
        canUpgrade: score >= upgradeCost,
      };
    });
  }, [equippedWeapon, score, weaponLevels]);

  useEffect(() => {
    if (!isPaused) return;

    const hotkeys = ["plasmacaster", "shrapnel", "bio", "nuke"] as const;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Enter") {
        if (document.pointerLockElement !== document.body) {
          document.body.requestPointerLock();
        }
        return;
      }

      if (e.code === "KeyR") {
        cycleReticleScale();
        playUiSound(UI_SFX.equip, 0.25);
        setStatusLine("RETICLE SIZE CYCLED");
        return;
      }

      if (e.code === "KeyC") {
        toggleHighContrastReticle();
        playUiSound(UI_SFX.equip, 0.25);
        setStatusLine("RETICLE CONTRAST TOGGLED");
        return;
      }

      if (e.code === "KeyM") {
        toggleReducedMotion();
        playUiSound(UI_SFX.equip, 0.25);
        setStatusLine("MOTION MODE TOGGLED");
        return;
      }

      if (e.code === "KeyU") {
        const activeCard = cards.find((card) => card.id === equippedWeapon);
        if (!activeCard || !activeCard.unlocked) return;

        if (buyWeaponUpgrade(activeCard.id, activeCard.upgradeCost)) {
          playUiSound(UI_SFX.success, 0.4);
          setStatusLine(`UPGRADED ${activeCard.label.toUpperCase()}`);
        } else {
          playUiSound(UI_SFX.denied, 0.25);
          setStatusLine("INSUFFICIENT INTEL");
        }
        return;
      }

      if (!e.code.startsWith("Digit")) return;
      const index = Number(e.code.replace("Digit", "")) - 1;
      const weapon = hotkeys[index];
      if (!weapon) return;

      const selected = cards.find((card) => card.id === weapon);
      if (!selected) return;

      if (!selected.unlocked) {
        if (buyWeaponUpgrade(selected.id, selected.unlockCost)) {
          playUiSound(UI_SFX.success, 0.4);
          setStatusLine(`UNLOCKED ${selected.label.toUpperCase()}`);
        } else {
          playUiSound(UI_SFX.denied, 0.25);
          setStatusLine("INSUFFICIENT INTEL");
        }
        return;
      }

      equipWeapon(selected.id);
      playUiSound(UI_SFX.equip, 0.35);
      setStatusLine(`EQUIPPED ${selected.label.toUpperCase()}`);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    buyWeaponUpgrade,
    cards,
    cycleReticleScale,
    equipWeapon,
    equippedWeapon,
    isPaused,
    toggleHighContrastReticle,
    toggleReducedMotion,
  ]);

  if (!isPaused) return null;

  return (
    <div
      className="absolute inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_40%),radial-gradient(circle_at_78%_18%,rgba(244,114,182,0.18),transparent_36%),radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.16),transparent_45%),rgba(3,6,18,0.84)] backdrop-blur-md cursor-none"
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      onClick={() => {
        if (!document.pointerLockElement) {
          const target = document.getElementById("game-root") ?? document.body;
          target.requestPointerLock();
        }
      }}
    >
      <div className="menu-cursor" style={{ left: cursor.x, top: cursor.y }}>
        <span className="menu-cursor-dot" />
      </div>

      <div
        className="glass-panel tactical-shell tactical-stars tactical-scan w-[min(96vw,1320px)] p-6 md:p-8 flex flex-col gap-6 animate-in fade-in zoom-in duration-300 border-cyan-300/40 shadow-[0_0_40px_rgba(34,211,238,0.14),0_40px_80px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="flex flex-col gap-4 border-b border-cyan-500/30 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white font-black text-4xl tracking-tighter italic glass-text">
              NOVA // COMMAND
            </h1>
            <h2 className="text-sm font-bold tracking-[0.4em] text-cyan-500 mt-1 uppercase">
              System Paused - Control Deck
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:text-right">
            <div className="rounded-lg border border-cyan-500/30 bg-black/35 px-3 py-2">
              <div className="text-cyan-400/70 font-mono text-[10px] uppercase tracking-widest">Intel</div>
              <div className="text-cyan-300 font-mono font-black text-2xl">{score.toString().padStart(5, "0")}</div>
            </div>
            <div className="rounded-lg border border-cyan-500/30 bg-black/35 px-3 py-2">
              <div className="text-cyan-400/70 font-mono text-[10px] uppercase tracking-widest">Level</div>
              <div className="text-cyan-300 font-mono font-black text-2xl">{level.toString().padStart(2, "0")}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[2.4fr_1fr]">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {cards.map((card) => {
              const stateLabel = card.equipped ? "EQUIPPED" : card.unlocked ? "UNLOCKED" : "LOCKED";
              const chipClass =
                card.accent === "cyan"
                  ? "border-cyan-400/40 text-cyan-300 bg-cyan-500/10"
                  : card.accent === "amber"
                  ? "border-amber-400/40 text-amber-300 bg-amber-500/10"
                  : card.accent === "emerald"
                  ? "border-emerald-400/40 text-emerald-300 bg-emerald-500/10"
                  : "border-rose-400/40 text-rose-300 bg-rose-500/10";

              return (
                <article
                  key={card.id}
                  className="relative overflow-hidden rounded-xl border border-cyan-300/25 bg-[linear-gradient(150deg,rgba(15,23,42,0.86),rgba(2,6,23,0.76))] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.45),inset_0_0_24px_rgba(34,211,238,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/50 hover:shadow-[0_18px_44px_rgba(0,0,0,0.5),0_0_22px_rgba(34,211,238,0.22)]"
                  onMouseEnter={() => playUiSound(UI_SFX.hover, 0.18)}
                >
                  <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />
                  <div className="absolute right-3 top-3">
                    <span className={`rounded px-2 py-1 font-mono text-[10px] tracking-wide border ${chipClass}`}>
                      {stateLabel}
                    </span>
                  </div>

                  <h3 className="font-orbitron text-white text-xl font-bold">
                    {card.label} <span className="text-cyan-400/80">[Lv {card.weaponLevel}]</span>
                  </h3>
                  <p className="mt-2 text-sm text-slate-200/75 leading-relaxed">{card.blurb}</p>

                  <div className="mt-3 space-y-2">
                    {Object.entries(getWeaponStats(card.id, Math.max(card.weaponLevel, 1))).map(([key, val]) => (
                      <div key={key}>
                        <div className="mb-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em] text-slate-300/80">
                          <span>{key}</span>
                          <span>{Math.min(100, val)}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full border border-cyan-300/20 bg-slate-900/85">
                          <div className="h-full bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 transition-all duration-500 shadow-[0_0_10px_rgba(103,232,249,0.6)]" style={{ width: `${Math.min(100, val)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {!card.unlocked && (
                      <button
                        type="button"
                        onClick={() => {
                          pulseClick();
                          if (buyWeaponUpgrade(card.id, card.unlockCost)) {
                            playUiSound(UI_SFX.success, 0.4);
                            setStatusLine(`UNLOCKED ${card.label.toUpperCase()}`);
                          } else {
                            playUiSound(UI_SFX.denied, 0.25);
                            setStatusLine("INSUFFICIENT INTEL");
                          }
                        }}
                        disabled={!card.canUnlock}
                        className="rounded border border-cyan-500/60 bg-cyan-500/15 px-3 py-1.5 text-sm font-bold tracking-wide text-cyan-300 transition hover:bg-cyan-400/30 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        UNLOCK {card.unlockCost.toLocaleString()}
                      </button>
                    )}

                    {card.unlocked && !card.equipped && (
                      <button
                        type="button"
                        onClick={() => {
                          pulseClick();
                          equipWeapon(card.id);
                          playUiSound(UI_SFX.equip, 0.35);
                          setStatusLine(`EQUIPPED ${card.label.toUpperCase()}`);
                        }}
                        className="rounded border border-white/40 bg-white/10 px-3 py-1.5 text-sm font-bold tracking-wide text-white transition hover:bg-white/20"
                      >
                        EQUIP
                      </button>
                    )}

                    {card.unlocked && (
                      <button
                        type="button"
                        onClick={() => {
                          pulseClick();
                          if (buyWeaponUpgrade(card.id, card.upgradeCost)) {
                            playUiSound(UI_SFX.success, 0.4);
                            setStatusLine(`UPGRADED ${card.label.toUpperCase()}`);
                          } else {
                            playUiSound(UI_SFX.denied, 0.25);
                            setStatusLine("INSUFFICIENT INTEL");
                          }
                        }}
                        disabled={!card.canUpgrade}
                        className="rounded border border-cyan-400/60 bg-cyan-500/10 px-3 py-1.5 text-sm font-bold tracking-wide text-cyan-200 transition hover:bg-cyan-400/25 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        UPGRADE {card.upgradeCost.toLocaleString()}
                      </button>
                    )}

                    {card.equipped && (
                      <span className="rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs tracking-wider text-cyan-300">
                        PRIMARY WEAPON
                      </span>
                    )}
                  </div>

                  <div className="mt-3 text-[11px] font-mono tracking-wider text-slate-300/70 uppercase">
                    {card.unlocked
                      ? `Next upgrade cost ${card.upgradeCost.toLocaleString()} intel`
                      : `Unlock cost ${card.unlockCost.toLocaleString()} intel`}
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="rounded-xl border border-cyan-400/30 bg-[linear-gradient(160deg,rgba(2,6,23,0.82),rgba(15,23,42,0.56))] p-4 shadow-[inset_0_0_20px_rgba(34,211,238,0.08)]">
            <h3 className="font-orbitron text-cyan-300 text-lg">Mission Telemetry</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-200/85">
              <div className="rounded-lg border border-cyan-500/20 bg-black/45 p-3">
                <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-cyan-400/70">Current Objective</div>
                <div className="mt-1 text-white font-semibold">Eliminate {levelTarget} hostiles</div>
                <div className="mt-2 h-2 rounded-full bg-slate-900 overflow-hidden border border-cyan-500/20">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-300 transition-all duration-500" style={{ width: `${levelProgress}%` }} />
                </div>
                <div className="mt-1 font-mono text-xs text-cyan-300">{killsThisLevel}/{levelTarget} confirmed</div>
              </div>

              <div className="rounded-lg border border-cyan-500/20 bg-black/45 p-3">
                <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-cyan-400/70">Control Map</div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs">
                  <span className="text-cyan-300">WASD</span>
                  <span>Move</span>
                  <span className="text-cyan-300">Space</span>
                  <span>Boost jump</span>
                  <span className="text-cyan-300">Mouse 1</span>
                  <span>Fire</span>
                  <span className="text-cyan-300">ESC / Tab</span>
                  <span>Pause</span>
                  <span className="text-cyan-300">1-4</span>
                  <span>Quick equip/unlock</span>
                  <span className="text-cyan-300">U</span>
                  <span>Upgrade active weapon</span>
                  <span className="text-cyan-300">Enter</span>
                  <span>Resume sim</span>
                </div>
              </div>

              <div className="rounded-lg border border-cyan-500/20 bg-black/45 p-3">
                <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-cyan-400/70">Accessibility</div>
                <div className="mt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      cycleReticleScale();
                      playUiSound(UI_SFX.equip, 0.25);
                      setStatusLine("RETICLE SIZE CYCLED");
                    }}
                    className="w-full rounded border border-cyan-500/50 bg-cyan-500/10 px-2 py-1.5 text-left font-mono text-xs uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/20"
                  >
                    [R] Reticle Size: x{hudSettings.reticleScale.toFixed(2)}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleHighContrastReticle();
                      playUiSound(UI_SFX.equip, 0.25);
                      setStatusLine("RETICLE CONTRAST TOGGLED");
                    }}
                    className="w-full rounded border border-cyan-500/50 bg-cyan-500/10 px-2 py-1.5 text-left font-mono text-xs uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/20"
                  >
                    [C] High Contrast: {hudSettings.highContrastReticle ? "ON" : "OFF"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toggleReducedMotion();
                      playUiSound(UI_SFX.equip, 0.25);
                      setStatusLine("MOTION MODE TOGGLED");
                    }}
                    className="w-full rounded border border-cyan-500/50 bg-cyan-500/10 px-2 py-1.5 text-left font-mono text-xs uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/20"
                  >
                    [M] Reduced Motion: {hudSettings.reducedMotion ? "ON" : "OFF"}
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-cyan-500/20 bg-black/45 p-3">
                <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-cyan-400/70">Active Weapon</div>
                <div className="mt-1 text-xl font-orbitron text-white uppercase">{equippedWeapon}</div>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-4 text-center">
          <p className="text-cyan-300/70 font-mono text-[11px] tracking-[0.24em] uppercase mb-2">Status // {statusLine}</p>
          <p className="text-cyan-400/50 font-mono text-xs tracking-widest uppercase">
            Click anywhere to resume simulation
          </p>
        </div>
      </div>
    </div>
  );
}