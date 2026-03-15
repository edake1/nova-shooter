"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore, WEAPON_PROFILES, MAX_WEAPON_LEVEL, getUpgradeCost } from "@/store";
import type { WeaponType } from "@/store";

type Tab = "arsenal" | "telemetry" | "settings";

const UI_SFX = {
  hover: "/ribhavagrawal-achievement-video-game-type-1-230515.mp3",
  equip: "/dragon-studio-game-show-correct-tick-sound-416167.mp3",
  success: "/universfield-game-bonus-144751.mp3",
  denied: "/freesound_community-080047_lose_funny_retro_video-game-80925.mp3",
};

function playUiSound(src: string, vol = 0.35) {
  const a = new Audio(src);
  a.volume = vol;
  a.play().catch(() => {});
}

function getWeaponStats(id: WeaponType, level: number) {
  const l = Math.max(level, 1);
  const dmgMult = 1 + (l - 1) * 0.2;
  const rateMult = 1 + (l - 1) * 0.1;
  switch (id) {
    case 'pulse_pistol':     return { damage: Math.round(25 * dmgMult), rate: Math.round(80 * rateMult), range: 70, special: 15 + l * 3 };
    case 'plasma_caster':    return { damage: Math.round(35 * dmgMult), rate: Math.round(55 * rateMult), range: 60, special: 20 + l * 5 };
    case 'frag_launcher':    return { damage: Math.round(60 * dmgMult), rate: Math.round(30 * rateMult), range: 45, special: 40 + l * 8 };
    case 'shrapnel_blaster': return { damage: Math.round(20 * dmgMult), rate: Math.round(50 * rateMult), range: 30, special: 65 + l * 5 };
    case 'cryo_emitter':     return { damage: Math.round(10 * dmgMult), rate: Math.round(70 * rateMult), range: 20, special: 55 + l * 7 };
    case 'void_reaper':      return { damage: Math.round(80 * dmgMult), rate: Math.round(35 * rateMult), range: 50, special: 85 + l * 3 };
    default:                 return { damage: 25, rate: 60, range: 50, special: 20 };
  }
}

const STAT_LABELS: Record<string, string> = {
  damage: 'DMG', rate: 'RATE', range: 'RNG', special: 'SPL'
};

const TAB_LABELS: { id: Tab; label: string; hotkey: string }[] = [
  { id: "arsenal", label: "ARSENAL", hotkey: "F1" },
  { id: "telemetry", label: "TELEMETRY", hotkey: "F2" },
  { id: "settings", label: "SETTINGS", hotkey: "F3" },
];

function accentClasses(accent: string) {
  if (accent === "cyan") return "border-cyan-400/40 text-cyan-300 bg-cyan-500/10";
  if (accent === "amber") return "border-amber-400/40 text-amber-300 bg-amber-500/10";
  if (accent === "orange") return "border-orange-400/40 text-orange-300 bg-orange-500/10";
  if (accent === "blue") return "border-blue-400/40 text-blue-300 bg-blue-500/10";
  if (accent === "purple") return "border-purple-400/40 text-purple-300 bg-purple-500/10";
  if (accent === "slate") return "border-slate-400/40 text-slate-300 bg-slate-500/10";
  return "border-cyan-400/40 text-cyan-300 bg-cyan-500/10";
}

export function PauseMenu() {
  const {
    gamePhase, score, level, killsThisLevel, totalKills,
    equippedWeapon, weaponLevels, hudSettings,
    buyWeaponUpgrade, equipWeapon,
    cycleReticleScale, toggleHighContrastReticle, toggleReducedMotion,
  } = useStore();

  const [activeTab, setActiveTab] = useState<Tab>("arsenal");
  const [statusLine, setStatusLine] = useState("SYSTEMS NOMINAL");

  const levelTarget = level * 10;
  const levelProgress = Math.min(100, (killsThisLevel / levelTarget) * 100);

  const cards = useMemo(() => WEAPON_PROFILES.map((w) => {
    const wl = weaponLevels[w.id];
    const unlocked = wl > 0;
    const maxed = wl >= MAX_WEAPON_LEVEL;
    const upgCost = getUpgradeCost(w.baseUpgradeCost, wl);
    return { ...w, weaponLevel: wl, unlocked, maxed, equipped: unlocked && equippedWeapon === w.id, upgradeCost: upgCost, canUnlock: score >= w.unlockCost, canUpgrade: !maxed && score >= upgCost };
  }), [equippedWeapon, score, weaponLevels]);

  useEffect(() => {
    if (gamePhase !== 'paused') return;
    const handle = (e: KeyboardEvent) => {
      if (e.code === "F1") { e.preventDefault(); setActiveTab("arsenal"); playUiSound(UI_SFX.equip, 0.2); return; }
      if (e.code === "F2") { e.preventDefault(); setActiveTab("telemetry"); playUiSound(UI_SFX.equip, 0.2); return; }
      if (e.code === "F3") { e.preventDefault(); setActiveTab("settings"); playUiSound(UI_SFX.equip, 0.2); return; }
      if (e.code === "Enter") { (document.getElementById("game-root") ?? document.body).requestPointerLock(); return; }

      if (e.code.startsWith("Digit")) {
        const idx = Number(e.code.replace("Digit", "")) - 1;
        const card = cards[idx];
        if (!card) return;
        if (!card.unlocked) {
          if (buyWeaponUpgrade(card.id, card.unlockCost)) { playUiSound(UI_SFX.success, 0.4); setStatusLine("UNLOCKED " + card.label.toUpperCase()); }
          else { playUiSound(UI_SFX.denied, 0.25); setStatusLine("INSUFFICIENT INTEL"); }
        } else {
          equipWeapon(card.id); playUiSound(UI_SFX.equip, 0.35); setStatusLine("EQUIPPED " + card.label.toUpperCase());
        }
        return;
      }

      if (e.code === "KeyU") {
        const ac = cards.find(c => c.id === equippedWeapon);
        if (!ac || !ac.unlocked) return;
        if (buyWeaponUpgrade(ac.id, ac.upgradeCost)) { playUiSound(UI_SFX.success, 0.4); setStatusLine("UPGRADED " + ac.label.toUpperCase()); }
        else { playUiSound(UI_SFX.denied, 0.25); setStatusLine("INSUFFICIENT INTEL"); }
        return;
      }

      if (e.code === "KeyR") { cycleReticleScale(); playUiSound(UI_SFX.equip, 0.25); setStatusLine("RETICLE SIZE CYCLED"); }
      if (e.code === "KeyC") { toggleHighContrastReticle(); playUiSound(UI_SFX.equip, 0.25); setStatusLine("CONTRAST TOGGLED"); }
      if (e.code === "KeyM") { toggleReducedMotion(); playUiSound(UI_SFX.equip, 0.25); setStatusLine("MOTION MODE TOGGLED"); }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [gamePhase, cards, equippedWeapon, buyWeaponUpgrade, equipWeapon, cycleReticleScale, toggleHighContrastReticle, toggleReducedMotion]);

  if (gamePhase !== 'paused') return null;

  return (
    <div
      className="absolute inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_40%),radial-gradient(circle_at_78%_18%,rgba(244,114,182,0.18),transparent_36%),radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.16),transparent_45%),rgba(3,6,18,0.84)] backdrop-blur-md cursor-default"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >

      <div className="glass-panel tactical-shell tactical-stars tactical-scan w-[min(96vw,1320px)] max-h-[90vh] overflow-y-auto p-6 md:p-8 flex flex-col gap-5 border-cyan-300/40 shadow-[0_0_40px_rgba(34,211,238,0.14),0_40px_80px_rgba(0,0,0,0.55)]">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white font-black text-4xl tracking-tighter italic glass-text">NOVA COMMAND</h1>
            <p className="text-sm font-bold tracking-[0.4em] text-cyan-500 mt-1 uppercase">Control Deck — System Paused</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-lg border border-cyan-500/30 bg-black/35 px-4 py-2 text-center">
              <div className="text-cyan-400/70 font-mono text-[10px] uppercase tracking-widest">Intel</div>
              <div className="text-cyan-300 font-mono font-black text-2xl">{score.toString().padStart(5, "0")}</div>
            </div>
            <div className="rounded-lg border border-cyan-500/30 bg-black/35 px-4 py-2 text-center">
              <div className="text-cyan-400/70 font-mono text-[10px] uppercase tracking-widest">Level</div>
              <div className="text-cyan-300 font-mono font-black text-2xl">{level.toString().padStart(2, "0")}</div>
            </div>
            <div className="rounded-lg border border-cyan-500/30 bg-black/35 px-4 py-2 text-center">
              <div className="text-cyan-400/70 font-mono text-[10px] uppercase tracking-widest">Kills</div>
              <div className="text-cyan-300 font-mono font-black text-2xl">{totalKills}</div>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 border-b border-cyan-500/25 pb-0">
          {TAB_LABELS.map((tab) => (
            <button key={tab.id} type="button"
              onClick={() => { setActiveTab(tab.id); playUiSound(UI_SFX.equip, 0.2); }}
              onMouseEnter={() => playUiSound(UI_SFX.hover, 0.12)}
              className={`px-5 py-2.5 font-orbitron text-sm tracking-widest transition-all border-b-2 -mb-[1px] ${activeTab === tab.id ? "text-cyan-300 border-cyan-400 bg-cyan-500/10" : "text-slate-400 border-transparent hover:text-cyan-400 hover:border-cyan-500/40"}`}
            >{tab.label} <span className="text-[10px] text-cyan-400 ml-1">[{tab.hotkey}]</span></button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[380px]">

          {activeTab === "arsenal" && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card, idx) => {
                const stateLabel = card.maxed ? "MASTERED" : card.equipped ? "EQUIPPED" : card.unlocked ? `LV ${card.weaponLevel}` : "LOCKED";
                const stats = getWeaponStats(card.id, Math.max(card.weaponLevel, 1));
                return (
                  <article key={card.id}
                    className={`relative overflow-hidden rounded-lg border bg-[linear-gradient(150deg,rgba(15,23,42,0.9),rgba(2,6,23,0.8))] p-3 transition-all duration-200 hover:shadow-[0_0_16px_rgba(34,211,238,0.15)] ${card.equipped ? "border-cyan-400/60 ring-1 ring-cyan-400/20" : "border-cyan-300/20 hover:border-cyan-300/40"}`}
                    onMouseEnter={() => playUiSound(UI_SFX.hover, 0.12)}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-orbitron text-white text-sm font-bold truncate">{card.label}</h3>
                        <p className="text-[10px] text-cyan-400/60 font-mono uppercase tracking-wider">{card.weaponClass} class</p>
                      </div>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] tracking-wide border ${accentClasses(card.accent)}`}>{stateLabel}</span>
                    </div>

                    {/* Compact stat bars */}
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                      {Object.entries(stats).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono text-slate-400 w-7 uppercase">{STAT_LABELS[key] || key}</span>
                          <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all duration-300" style={{ width: `${Math.min(100, val)}%` }} />
                          </div>
                          <span className="text-[9px] font-mono text-slate-300 w-5 text-right">{Math.min(100, val)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Level dots */}
                    {card.unlocked && (
                      <div className="mt-2 flex items-center gap-1">
                        {Array.from({ length: MAX_WEAPON_LEVEL }, (_, i) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < card.weaponLevel ? 'bg-cyan-400' : 'bg-slate-700'}`} />
                        ))}
                        <span className="ml-1 text-[9px] font-mono text-cyan-400/60">Lv{card.weaponLevel}/{MAX_WEAPON_LEVEL}</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-2 flex items-center gap-1.5">
                      {!card.unlocked && (
                        <button type="button" disabled={!card.canUnlock}
                          onClick={() => { if (buyWeaponUpgrade(card.id, card.unlockCost)) { playUiSound(UI_SFX.success, 0.4); setStatusLine("UNLOCKED " + card.label.toUpperCase()); } else { playUiSound(UI_SFX.denied, 0.25); setStatusLine("INSUFFICIENT INTEL"); } }}
                          className="rounded border border-cyan-500/50 bg-cyan-500/10 px-2 py-1 text-[11px] font-bold tracking-wide text-cyan-300 transition hover:bg-cyan-400/25 disabled:opacity-35 disabled:cursor-not-allowed"
                        >UNLOCK {card.unlockCost.toLocaleString()}</button>
                      )}
                      {card.unlocked && !card.equipped && (
                        <button type="button"
                          onClick={() => { equipWeapon(card.id); playUiSound(UI_SFX.equip, 0.3); setStatusLine("EQUIPPED " + card.label.toUpperCase()); }}
                          className="rounded border border-white/30 bg-white/8 px-2 py-1 text-[11px] font-bold tracking-wide text-white transition hover:bg-white/15"
                        >EQUIP</button>
                      )}
                      {card.unlocked && !card.maxed && (
                        <button type="button" disabled={!card.canUpgrade}
                          onClick={() => { if (buyWeaponUpgrade(card.id, card.upgradeCost)) { playUiSound(UI_SFX.success, 0.4); setStatusLine("UPGRADED " + card.label.toUpperCase()); } else { playUiSound(UI_SFX.denied, 0.25); setStatusLine("INSUFFICIENT INTEL"); } }}
                          className="rounded border border-cyan-400/50 bg-cyan-500/8 px-2 py-1 text-[11px] font-bold tracking-wide text-cyan-200 transition hover:bg-cyan-400/20 disabled:opacity-35 disabled:cursor-not-allowed"
                        >UPGRADE {card.upgradeCost === Infinity ? 'MAX' : card.upgradeCost.toLocaleString()}</button>
                      )}
                      {card.equipped && <span className="ml-auto text-[10px] font-mono text-cyan-400">★ PRIMARY</span>}
                      {card.maxed && <span className="ml-auto text-[10px] font-mono text-amber-400">✦ MASTERED</span>}
                    </div>

                    {/* Hotkey hint */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                      <span className="text-[8px] font-mono text-cyan-500/50">[{idx + 1}]</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {activeTab === "telemetry" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-cyan-500/25 bg-black/40 p-5">
                <h3 className="font-orbitron text-cyan-300 text-sm tracking-widest mb-3">CURRENT OBJECTIVE</h3>
                <p className="text-white font-semibold text-lg">Eliminate {levelTarget} hostiles</p>
                <div className="mt-3 h-2.5 rounded-full bg-slate-900 overflow-hidden border border-cyan-500/20">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-300 transition-all duration-500" style={{ width: `${levelProgress}%` }} />
                </div>
                <p className="mt-1.5 font-mono text-xs text-cyan-300">{killsThisLevel} / {levelTarget} confirmed</p>
              </div>
              <div className="rounded-xl border border-cyan-400/30 bg-black/60 p-5">
                <h3 className="font-orbitron text-cyan-200 text-sm tracking-widest mb-3 font-bold">COMBAT STATS</h3>
                <div className="space-y-2.5 font-mono text-sm">
                  <div className="flex justify-between"><span className="text-slate-300">Total Kills</span><span className="text-white font-bold">{totalKills}</span></div>
                  <div className="flex justify-between"><span className="text-slate-300">Score</span><span className="text-white font-bold">{score.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-300">Level</span><span className="text-white font-bold">{level} / 10</span></div>
                  <div className="flex justify-between"><span className="text-slate-300">Active Weapon</span><span className="text-cyan-200 font-bold uppercase">{equippedWeapon}</span></div>
                </div>
              </div>
              <div className="rounded-xl border border-cyan-500/25 bg-black/40 p-5">
                <h3 className="font-orbitron text-cyan-300 text-sm tracking-widest mb-3">ARSENAL SUMMARY</h3>
                <div className="space-y-2">
                  {cards.map(c => (
                    <div key={c.id} className="flex items-center justify-between font-mono text-sm">
                      <span className={c.unlocked ? "text-white" : "text-slate-500"}>{c.label}</span>
                      <span className={c.unlocked ? "text-cyan-300" : "text-slate-600"}>{c.unlocked ? "Lv " + c.weaponLevel : "LOCKED"}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-cyan-400/30 bg-black/60 p-5">
                <h3 className="font-orbitron text-cyan-200 text-sm tracking-widest mb-3 font-bold">CONTROL MAP</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-sm">
                  <span className="text-cyan-200 font-bold">WASD</span><span className="text-white">Move</span>
                  <span className="text-cyan-200 font-bold">Shift</span><span className="text-white">Sprint</span>
                  <span className="text-cyan-200 font-bold">Space</span><span className="text-white">Jump</span>
                  <span className="text-cyan-200 font-bold">Mouse 1</span><span className="text-white">Fire</span>
                  <span className="text-cyan-200 font-bold">ESC / Tab</span><span className="text-white">Pause</span>
                  <span className="text-cyan-200 font-bold">1-4</span><span className="text-white">Quick equip</span>
                  <span className="text-cyan-200 font-bold">U</span><span className="text-white">Upgrade weapon</span>
                  <span className="text-cyan-200 font-bold">Enter</span><span className="text-white">Resume</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="max-w-lg space-y-4">
              <div className="rounded-xl border border-cyan-500/25 bg-black/40 p-5">
                <h3 className="font-orbitron text-cyan-300 text-sm tracking-widest mb-4">DISPLAY</h3>
                <div className="space-y-3">
                  <button type="button"
                    onClick={() => { cycleReticleScale(); playUiSound(UI_SFX.equip, 0.25); setStatusLine("RETICLE SIZE CYCLED"); }}
                    className="w-full rounded border border-cyan-500/50 bg-cyan-500/10 px-4 py-2.5 text-left font-mono text-sm uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/20 transition flex justify-between items-center"
                  ><span>[R] Reticle Size</span><span className="text-cyan-300 font-bold">x{hudSettings.reticleScale.toFixed(2)}</span></button>
                  <button type="button"
                    onClick={() => { toggleHighContrastReticle(); playUiSound(UI_SFX.equip, 0.25); setStatusLine("CONTRAST TOGGLED"); }}
                    className="w-full rounded border border-cyan-500/50 bg-cyan-500/10 px-4 py-2.5 text-left font-mono text-sm uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/20 transition flex justify-between items-center"
                  ><span>[C] High Contrast</span><span className={`font-bold ${hudSettings.highContrastReticle ? "text-emerald-400" : "text-slate-500"}`}>{hudSettings.highContrastReticle ? "ON" : "OFF"}</span></button>
                  <button type="button"
                    onClick={() => { toggleReducedMotion(); playUiSound(UI_SFX.equip, 0.25); setStatusLine("MOTION MODE TOGGLED"); }}
                    className="w-full rounded border border-cyan-500/50 bg-cyan-500/10 px-4 py-2.5 text-left font-mono text-sm uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/20 transition flex justify-between items-center"
                  ><span>[M] Reduced Motion</span><span className={`font-bold ${hudSettings.reducedMotion ? "text-emerald-400" : "text-slate-500"}`}>{hudSettings.reducedMotion ? "ON" : "OFF"}</span></button>
                </div>
              </div>
              <div className="rounded-xl border border-cyan-500/25 bg-black/40 p-5">
                <h3 className="font-orbitron text-cyan-300 text-sm tracking-widest mb-3">MENU HOTKEYS</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-xs">
                  <span className="text-cyan-300">F1 / F2 / F3</span><span className="text-slate-300">Switch tabs</span>
                  <span className="text-cyan-300">1-4</span><span className="text-slate-300">Equip / unlock weapon</span>
                  <span className="text-cyan-300">U</span><span className="text-slate-300">Upgrade equipped weapon</span>
                  <span className="text-cyan-300">R / C / M</span><span className="text-slate-300">Display settings</span>
                  <span className="text-cyan-300">Enter</span><span className="text-slate-300">Resume simulation</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-3 border-t border-cyan-500/30 pt-4">
          <p className="text-cyan-200 font-mono text-xs tracking-[0.24em] uppercase font-bold">STATUS: {statusLine}</p>
          <button
            type="button"
            onClick={() => {
              const target = document.getElementById("game-root") ?? document.body;
              target.requestPointerLock();
            }}
            className="px-8 py-3 rounded-lg border-2 border-cyan-400 bg-cyan-500/20 text-white font-orbitron font-bold tracking-[0.3em] text-sm hover:bg-cyan-400/40 hover:border-cyan-300 transition-all uppercase cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.3)]"
          >
            RESUME
          </button>
          <p className="text-cyan-400/50 font-mono text-xs tracking-widest uppercase">or press ESC to toggle</p>
        </div>
      </div>
    </div>
  );
}
