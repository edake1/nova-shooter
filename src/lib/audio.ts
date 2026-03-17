/**
 * Audio manager for Nova Shooter — handles background music, ambient sounds,
 * enemy SFX, and dynamic intensity crossfading.
 */

import { useStore } from "@/store";
import type { EnemyType } from "@/store";

// ─── Music tracks ───────────────────────────────────────────────────────────
export const MUSIC_THEMES = {
  synthwave: { label: "Synthwave", calm: "/idoberg-synthwave-loop-v1-254569.mp3" },
  cyberpunk: { label: "Cyberpunk Beat", calm: "/freesound_community-cyberpunk-beat-64649.mp3" },
  retro: { label: "Retro Loop", calm: "/xtremefreddy-game-music-loop-6-144641.mp3" },
} as const;
export type MusicTheme = keyof typeof MUSIC_THEMES;

const MUSIC_COMBAT = "/xtremefreddy-game-music-loop-7-145285.mp3";

// ─── Enemy SFX (reuse existing files for spawn/attack/death per enemy tier) ─
const ENEMY_SPAWN_SFX: Record<string, string> = {
  swarmer:    "/rescopicsound-sci-fi-weapon-projectile-flyby-pulse-03-233855.mp3",
  spitter:    "/rescopicsound-sci-fi-weapon-projectile-flyby-plasma-03-233857.mp3",
  charger:    "/rescopicsound-sci-fi-weapon-projectile-flyby-pulse-03-233855.mp3",
  shielder:   "/rescopicsound-sci-fi-weapon-projectile-flyby-plasma-03-233857.mp3",
  bomber:     "/rescopicsound-sci-fi-weapon-projectile-flyby-pulse-03-233855.mp3",
  juggernaut: "/freesound_community-blaster-2-81267.mp3",
  phantom:    "/rescopicsound-sci-fi-weapon-projectile-flyby-plasma-03-233857.mp3",
  hive_queen: "/freesound_community-blaster-2-81267.mp3",
};

const ENEMY_ATTACK_SFX: Record<string, string> = {
  spitter:    "/freesound_community-blaster-103340.mp3",
  shielder:   "/freesound_community-blaster-2-81267.mp3",
  phantom:    "/freesound_community-blaster-103340.mp3",
};

const ENEMY_DEATH_SFX: Record<string, string> = {
  swarmer:    "/rescopicsound-sci-fi-weapon-projectile-flyby-pulse-03-233855.mp3",
  spitter:    "/rescopicsound-sci-fi-weapon-projectile-flyby-plasma-03-233857.mp3",
  charger:    "/daviddumaisaudio-steampunk-weapon-single-shot-188051.mp3",
  shielder:   "/daviddumaisaudio-steampunk-weapon-single-shot-188051.mp3",
  bomber:     "/do_what_you_want-bomb-explosion-469038.mp3",
  juggernaut: "/do_what_you_want-bomb-explosion-469038.mp3",
  phantom:    "/rescopicsound-sci-fi-weapon-projectile-flyby-plasma-03-233857.mp3",
  hive_queen: "/do_what_you_want-bomb-explosion-469038.mp3",
};

const ENEMY_SPAWN_VOL: Record<string, number> = {
  swarmer: 0.08, spitter: 0.10, charger: 0.10, shielder: 0.10,
  bomber: 0.08, juggernaut: 0.20, phantom: 0.12, hive_queen: 0.25,
};

const ENEMY_ATTACK_VOL: Record<string, number> = {
  spitter: 0.15, shielder: 0.12, phantom: 0.18,
};

const ENEMY_DEATH_VOL: Record<string, number> = {
  swarmer: 0.10, spitter: 0.12, charger: 0.15, shielder: 0.15,
  bomber: 0.20, juggernaut: 0.25, phantom: 0.12, hive_queen: 0.30,
};

// ─── Ambient ────────────────────────────────────────────────────────────────
const AMBIENT_SRC = "/rescopicsound-sci-fi-weapon-projectile-flyby-pulse-03-233855.mp3";

// ─── Intensity tiers ────────────────────────────────────────────────────────
export type MusicIntensity = "calm" | "combat" | "boss";

// ─── Singleton audio manager ────────────────────────────────────────────────
class AudioManager {
  private calmTrack: HTMLAudioElement | null = null;
  private combatTrack: HTMLAudioElement | null = null;
  private ambientTrack: HTMLAudioElement | null = null;
  private intensity: MusicIntensity = "calm";
  private crossfadeRaf = 0;
  private started = false;
  private currentTheme: MusicTheme = "synthwave";

  // Enemy SFX pools (small per enemy type)
  private enemyPools: Map<string, HTMLAudioElement[]> = new Map();
  private enemyPoolIdx: Map<string, number> = new Map();

  private getMusicVol(): number {
    return useStore.getState().hudSettings.musicVolume;
  }

  private getSfxVol(): number {
    return useStore.getState().hudSettings.sfxVolume;
  }

  /** Create or return a looping Audio element */
  private makeLoop(src: string, vol: number): HTMLAudioElement {
    const a = new Audio(src);
    a.loop = true;
    a.volume = vol;
    return a;
  }

  /** Start the music system. Must be called from a user gesture context. */
  start() {
    if (this.started) return;
    if (typeof window === "undefined") return;
    this.started = true;

    const mv = this.getMusicVol();
    const calmSrc = MUSIC_THEMES[this.currentTheme].calm;
    this.calmTrack = this.makeLoop(calmSrc, mv * 0.5);
    this.combatTrack = this.makeLoop(MUSIC_COMBAT, 0);
    this.ambientTrack = this.makeLoop(AMBIENT_SRC, this.getSfxVol() * 0.06);

    this.calmTrack.play().catch(() => {});
    this.combatTrack.play().catch(() => {});
    this.ambientTrack.play().catch(() => {});

    this.intensity = "calm";
    this.runCrossfade();
  }

  /** Stop everything */
  stop() {
    this.started = false;
    cancelAnimationFrame(this.crossfadeRaf);
    [this.calmTrack, this.combatTrack, this.ambientTrack].forEach((t) => {
      if (t) { t.pause(); t.currentTime = 0; }
    });
    this.calmTrack = null;
    this.combatTrack = null;
    this.ambientTrack = null;
  }

  /** Pause music (e.g. game paused) */
  pause() {
    this.calmTrack?.pause();
    this.combatTrack?.pause();
    this.ambientTrack?.pause();
  }

  /** Resume music */
  resume() {
    if (!this.started) return;
    this.calmTrack?.play().catch(() => {});
    this.combatTrack?.play().catch(() => {});
    this.ambientTrack?.play().catch(() => {});
  }

  /** Update intensity based on game state */
  setIntensity(intensity: MusicIntensity) {
    this.intensity = intensity;
  }

  /** Smooth crossfade loop — adjusts volumes toward target over time */
  private runCrossfade() {
    const FADE_SPEED = 0.008; // per-frame step (~60fps → ~0.5s full crossfade)

    const step = () => {
      if (!this.started) return;

      const mv = this.getMusicVol();
      const sv = this.getSfxVol();

      // Target volumes based on intensity
      let calmTarget = 0;
      let combatTarget = 0;

      switch (this.intensity) {
        case "calm":
          calmTarget = mv * 0.5;
          combatTarget = 0;
          break;
        case "combat":
          calmTarget = mv * 0.15;
          combatTarget = mv * 0.55;
          break;
        case "boss":
          calmTarget = 0;
          combatTarget = mv * 0.7;
          break;
      }

      // Lerp volumes
      if (this.calmTrack) {
        this.calmTrack.volume = this.lerp(this.calmTrack.volume, calmTarget, FADE_SPEED);
      }
      if (this.combatTrack) {
        this.combatTrack.volume = this.lerp(this.combatTrack.volume, combatTarget, FADE_SPEED);
      }
      if (this.ambientTrack) {
        this.ambientTrack.volume = sv * 0.06;
      }

      this.crossfadeRaf = requestAnimationFrame(step);
    };

    this.crossfadeRaf = requestAnimationFrame(step);
  }

  private lerp(current: number, target: number, speed: number): number {
    const diff = target - current;
    if (Math.abs(diff) < 0.001) return target;
    return current + diff * speed * 3;
  }

  // ─── Enemy SFX ──────────────────────────────────────────────────────────

  private getPool(key: string, src: string, size = 3): HTMLAudioElement[] {
    if (!this.enemyPools.has(key)) {
      if (typeof window === "undefined") return [];
      const pool = Array.from({ length: size }, () => new Audio(src));
      this.enemyPools.set(key, pool);
      this.enemyPoolIdx.set(key, 0);
    }
    return this.enemyPools.get(key)!;
  }

  private playFromPool(key: string, src: string, vol: number) {
    const sv = this.getSfxVol();
    if (sv === 0) return;
    const pool = this.getPool(key, src);
    if (pool.length === 0) return;
    const idx = (this.enemyPoolIdx.get(key) ?? 0) % pool.length;
    this.enemyPoolIdx.set(key, idx + 1);
    const a = pool[idx];
    a.volume = Math.min(1, vol * sv);
    a.currentTime = 0;
    a.play().catch(() => {});
  }

  playEnemySpawn(type: EnemyType) {
    const src = ENEMY_SPAWN_SFX[type];
    const vol = ENEMY_SPAWN_VOL[type] ?? 0.1;
    if (src) this.playFromPool(`spawn_${type}`, src, vol);
  }

  playEnemyAttack(type: EnemyType) {
    const src = ENEMY_ATTACK_SFX[type];
    const vol = ENEMY_ATTACK_VOL[type] ?? 0.15;
    if (src) this.playFromPool(`attack_${type}`, src, vol);
  }

  playEnemyDeath(type: EnemyType) {
    const src = ENEMY_DEATH_SFX[type];
    const vol = ENEMY_DEATH_VOL[type] ?? 0.15;
    if (src) this.playFromPool(`death_${type}`, src, vol);
  }

  /** Switch the calm music theme */
  setTheme(theme: MusicTheme) {
    this.currentTheme = theme;
    if (this.started && this.calmTrack) {
      const calmSrc = MUSIC_THEMES[theme].calm;
      const currentTime = this.calmTrack.currentTime;
      const currentVol = this.calmTrack.volume;
      this.calmTrack.pause();
      this.calmTrack = this.makeLoop(calmSrc, currentVol);
      this.calmTrack.currentTime = 0;
      this.calmTrack.play().catch(() => {});
    }
  }

  getTheme(): MusicTheme {
    return this.currentTheme;
  }

  /** Update volume levels when settings change (called from settings UI) */
  updateVolumes() {
    // Crossfade loop handles music volume automatically.
    // Ambient is updated in the loop too.
  }
}

/** Singleton instance */
export const audioManager = new AudioManager();
