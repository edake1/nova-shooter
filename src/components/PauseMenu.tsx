"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store";
import type { WeaponType } from "@/store";

type Tab = "arsenal" | "telemetry" | "settings";

type WeaponCard = {
  id: WeaponType;
  label: string;
  blurb: string;
  unlockCost: number;
  baseUpgrade: number;
  accent: string;
};

const WEAPONS: WeaponCard[] = [
  { id: "plasmacaster", label: "Plasmacaster", blurb: "Precision raycast. Stable burst timing, clean single-target deletion.", unlockCost: 0, baseUpgrade: 2500, accent: "cyan" },
  { id: "shrapnel", label: "Shrapnel Cannon", blurb: "Close-range cone spread. Melts swarm packs, punishes flanks.", unlockCost: 5000, baseUpgrade: 4500, accent: "amber" },
  { id: "bio", label: "Bio-Infection", blurb: "Corrosive payload. Chained damage-over-time propagation.", unlockCost: 12000, baseUpgrade: 8000, accent: "emerald" },
  { id: "nuke", label: "Apocalyptic Core", blurb: "High-yield detonation. Screen-clearing catastrophic bursts.", unlockCost: 50000, baseUpgrade: 30000, accent: "rose" },
];

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
  if (id === "plasmacaster") return { damage: 30 + level * 8, spread: 8, cadence: 72 + level * 3, aoe: 12 + level * 2 };
  if (id === "shrapnel") return { damage: 22 + level * 6, spread: 70, cadence: 58 + level * 2, aoe: 34 + level * 4 };
  if (id === "bio") return { damage: 16 + level * 4, spread: 20, cadence: 46 + level * 3, aoe: 45 + level * 5 };
  return { damage: 80 + level * 10, spread: 15, cadence: 22 + level * 2, aoe: 95 };
}

const TAB_LABELS: { id: Tab; label: string; hotkey: string }[] = [
  { id: "arsenal", label: "ARSENAL", hotkey: "F1" },
  { id: "telemetry", label: "TELEMETRY", hotkey: "F2" },
  { id: "settings", label: "SETTINGS", hotkey: "F3" },
];

function accentClasses(accent: string) {
  if (accent === "cyan") return "border-cyan-400/40 text-cyan-300 bg-cyan-500/10";
  if (accent === "amber") return "border-amber-400/40 text-amber-300 bg-amber-500/10";
  if (accent === "emerald") return "border-emerald-400/40 text-emerald-300 bg-emerald-500/10";
  return "border-rose-400/40 text-rose-300 bg-rose-500/10";
}

export function PauseMenu() {
  const {
    isPaused, score, level, killsThisLevel, totalKills,
    equippedWeapon, weaponLevels, hudSettings,
    buyWeaponUpgrade, equipWeapon,
    cycleReticleScale, toggleHighContrastReticle, toggleReducedMotion,
  } = useStore();

  const [activeTab, setActiveTab] = useState<Tab>("arsenal");
  const [statusLine, setStatusLine] = useState("SYSTEMS NOMINAL");
  const [cursor, setCursor] = useState({ x: -100, y: -100 });

  const levelTarget = level * 10;
  const levelProgress = Math.min(100, (killsThisLevel / levelTarget) * 100);

  const cards = useMemo(() => WEAPONS.map((w) => {
    const wl = weaponLevels[w.id];
    const unlocked = wl > 0;
    const upgCost = Math.floor(w.baseUpgrade * (1 + Math.max(wl - 1, 0) * 0.5));
    return { ...w, weaponLevel: wl, unlocked, equipped: unlocked && equippedWeapon === w.id, upgradeCost: upgCost, canUnlock: score >= w.unlockCost, canUpgrade: score >= upgCost };
  }), [equippedWeapon, score, weaponLevels]);

  useEffect(() => {
    if (!isPaused) return;
    const handle = (e: KeyboardEvent) => {
      if (e.code === "F1") { e.preventDefault(); setActiveTab("arsenal"); playUiSound(UI_SFX.equip, 0.2); return; }
      if (e.code === "F2") { e.preventDefault(); setActiveTab("telemetry"); playUiSound(UI_SFX.equip, 0.2); return; }
      if (e.code === "F3") { e.preventDefault(); setActiveTab("settings"); playUiSound(UI_SFX.equip, 0.2); return; }
      if (e.code === "Enter") { (document.getElementById("game-root") ?? document.body).requestPointerLock(); return; }

      if (e.code.startsWith("Digit")) {
        const idx = Number(e.code.replace("Digit", "")) - 1;
        const weps = ["plasmacaster", "shrapnel", "bio", "nuke"] as const;
        const w = weps[idx];
        if (!w) return;
        const card = cards.find(c => c.id === w);
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
  }, [isPaused, cards, equippedWeapon, buyWeaponUpgrade, equipWeapon, cycleReticleScale, toggleHighContrastReticle, toggleReducedMotion]);

  if (!isPaused) return null;

  return (
    <div
      className="absolute inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_40%),radial-gradient(circle_at_78%_18%,rgba(244,114,182,0.18),transparent_36%),radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.16),transparent_45%),rgba(3,6,18,0.84)] backdrop-blur-md cursor-none"
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      onClick={() => { if (!document.pointerLockElement) { (document.getElementById("game-root") ?? document.body).requestPointerLock(); } }}
    >
      <div className="menu-cursor" style={{ left: cursor.x, top: cursor.y }}><span className="menu-cursor-dot" /></div>

      <div className="glass-panel tactical-shell tactical-stars tactical-scan w-[min(96vw,1320px)] max-h-[90vh] overflow-y-auto p-6 md:p-8 flex flex-col gap-5 animate-in fade-in zoom-in duration-300 border-cyan-300/40 shadow-[0_0_40px_rgba(34,211,238,0.14),0_40px_80px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white font-black text-4xl tracking-tighter italic glass-text">NOVA // COMMAND</h1>
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
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {cards.map((card) => {
                const stateLabel = card.equipped ? "EQUIPPED" : card.unlocked ? "UNLOCKED" : "LOCKED";
                return (
                  <article key={card.id}
                    className={`relative overflow-hidden rounded-xl border bg-[linear-gradient(150deg,rgba(15,23,42,0.86),rgba(2,6,23,0.76))] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.45),inset_0_0_24px_rgba(34,211,238,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(0,0,0,0.5),0_0_22px_rgba(34,211,238,0.22)] ${card.equipped ? "border-cyan-400/60 ring-1 ring-cyan-400/20" : "border-cyan-300/25 hover:border-cyan-300/50"}`}
                    onMouseEnter={() => playUiSound(UI_SFX.hover, 0.18)}
                  >
                    <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />
                    <div className="absolute right-3 top-3">
                      <span className={`rounded px-2 py-1 font-mono text-[10px] tracking-wide border ${accentClasses(card.accent)}`}>{stateLabel}</span>
                    </div>
                    <h3 className="font-orbitron text-white text-xl font-bold">{card.label} <span className="text-cyan-400/80 text-base">[Lv {card.weaponLevel}]</span></h3>
                    <p className="mt-1.5 text-sm text-slate-100/90 leading-relaxed">{card.blurb}</p>
                    <div className="mt-3 space-y-1.5">
                      {Object.entries(getWeaponStats(card.id, Math.max(card.weaponLevel, 1))).map(([key, val]) => (
                        <div key={key}>
                          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.18em] text-slate-200"><span>{key}</span><span className="text-white font-bold">{Math.min(100, val)}</span></div>
                          <div className="h-1.5 overflow-hidden rounded-full border border-cyan-300/20 bg-slate-900/85">
                            <div className="h-full bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 transition-all duration-500 shadow-[0_0_10px_rgba(103,232,249,0.6)]" style={{ width: `${Math.min(100, val)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {!card.unlocked && (
                        <button type="button" disabled={!card.canUnlock}
                          onClick={() => { if (buyWeaponUpgrade(card.id, card.unlockCost)) { playUiSound(UI_SFX.success, 0.4); setStatusLine("UNLOCKED " + card.label.toUpperCase()); } else { playUiSound(UI_SFX.denied, 0.25); setStatusLine("INSUFFICIENT INTEL"); } }}
                          className="rounded border border-cyan-500/60 bg-cyan-500/15 px-3 py-1.5 text-sm font-bold tracking-wide text-cyan-300 transition hover:bg-cyan-400/30 disabled:opacity-40 disabled:cursor-not-allowed"
                        >UNLOCK {card.unlockCost.toLocaleString()}</button>
                      )}
                      {card.unlocked && !card.equipped && (
                        <button type="button"
                          onClick={() => { equipWeapon(card.id); playUiSound(UI_SFX.equip, 0.35); setStatusLine("EQUIPPED " + card.label.toUpperCase()); }}
                          className="rounded border border-white/40 bg-white/10 px-3 py-1.5 text-sm font-bold tracking-wide text-white transition hover:bg-white/20"
                        >EQUIP</button>
                      )}
                      {card.unlocked && (
                        <button type="button" disabled={!card.canUpgrade}
                          onClick={() => { if (buyWeaponUpgrade(card.id, card.upgradeCost)) { playUiSound(UI_SFX.success, 0.4); setStatusLine("UPGRADED " + card.label.toUpperCase()); } else { playUiSound(UI_SFX.denied, 0.25); setStatusLine("INSUFFICIENT INTEL"); } }}
                          className="rounded border border-cyan-400/60 bg-cyan-500/10 px-3 py-1.5 text-sm font-bold tracking-wide text-cyan-200 transition hover:bg-cyan-400/25 disabled:opacity-40 disabled:cursor-not-allowed"
                        >UPGRADE {card.upgradeCost.toLocaleString()}</button>
                      )}
                      {card.equipped && <span className="rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs tracking-wider text-cyan-300">★ PRIMARY</span>}
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
        <div className="text-center border-t border-cyan-500/30 pt-3">
          <p className="text-cyan-200 font-mono text-xs tracking-[0.24em] uppercase mb-1 font-bold">Status // {statusLine}</p>
          <p className="text-cyan-300/70 font-mono text-sm tracking-widest uppercase">Click anywhere or press Enter to resume</p>
        </div>
      </div>
    </div>
  );
}
