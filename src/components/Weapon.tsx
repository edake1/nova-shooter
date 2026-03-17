import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useMemo, useCallback } from "react";
import * as THREE from "three";
import { useStore, WeaponType, ExplosionType, WEAPON_CLASS } from "@/store";

// Helper to get current SFX volume
function getSfxVol(): number {
  return useStore.getState().hudSettings.sfxVolume;
}

const WEAPON_PROFILE: Record<WeaponType, { baseDamage: number; explosion: ExplosionType; fireRate: number }> = {
  pulse_pistol:     { baseDamage: 3,  explosion: "kinetic",     fireRate: 0.15 },
  plasma_caster:    { baseDamage: 6,  explosion: "energy",      fireRate: 0.30 },
  frag_launcher:    { baseDamage: 12, explosion: "explosive",   fireRate: 0.80 },
  shrapnel_blaster: { baseDamage: 3,  explosion: "spread",      fireRate: 0.35 },
  cryo_emitter:     { baseDamage: 3,  explosion: "tech",        fireRate: 0.20 },
  void_reaper:      { baseDamage: 10, explosion: "forbidden",   fireRate: 0.40 },
  lightning_coil:   { baseDamage: 5,  explosion: "arc",         fireRate: 0.35 },
  blade_wave:       { baseDamage: 8,  explosion: "force",       fireRate: 0.55 },
  railgun:          { baseDamage: 18, explosion: "kinetic",     fireRate: 1.20 },
  gravity_well:     { baseDamage: 15, explosion: "singularity", fireRate: 1.50 },
  swarm_missiles:   { baseDamage: 3,  explosion: "swarm",       fireRate: 0.60 },
  beam_laser:       { baseDamage: 5,  explosion: "beam",        fireRate: 0.10 },
  ricochet_cannon:  { baseDamage: 5,  explosion: "kinetic",     fireRate: 0.45 },
  sonic_boom:       { baseDamage: 8,  explosion: "sonic",       fireRate: 0.70 },
  nano_swarm:       { baseDamage: 4,  explosion: "nano",        fireRate: 1.00 },
  photon_burst:     { baseDamage: 12, explosion: "photon",      fireRate: 0.90 },
  plasma_whip:      { baseDamage: 6,  explosion: "whip",        fireRate: 0.40 },
  warp_lance:       { baseDamage: 25, explosion: "warp",        fireRate: 2.00 },
};

// Damage scales with weapon level: +40% per level
function getWeaponDamage(weapon: WeaponType, level: number): number {
  const base = WEAPON_PROFILE[weapon].baseDamage;
  return Math.max(1, Math.round(base * (1 + (Math.max(level, 1) - 1) * 0.4)));
}

// Per-weapon fire sound mapping (reuse existing SFX files)
const WEAPON_FIRE_SFX: Record<WeaponType, string> = {
  pulse_pistol:     "/rescopicsound-sci-fi-weapon-shoot-firing-plasma-pp-02-233830.mp3",
  plasma_caster:    "/rescopicsound-sci-fi-weapon-shoot-firing-pulse-tm-01-233821.mp3",
  frag_launcher:    "/do_what_you_want-bomb-explosion-469038.mp3",
  shrapnel_blaster: "/rescopicsound-sci-fi-weapon-shoot-firing-pulse-tm-04-233827.mp3",
  cryo_emitter:     "/rescopicsound-sci-fi-weapon-shoot-firing-pulse-tm-01-233821.mp3",
  void_reaper:      "/do_what_you_want-bomb-explosion-469038.mp3",
  lightning_coil:   "/rescopicsound-sci-fi-weapon-shoot-firing-pulse-tm-04-233827.mp3",
  blade_wave:       "/rescopicsound-sci-fi-weapon-shoot-firing-plasma-pp-02-233830.mp3",
  railgun:          "/do_what_you_want-bomb-explosion-469038.mp3",
  gravity_well:     "/do_what_you_want-bomb-explosion-469038.mp3",
  swarm_missiles:   "/rescopicsound-sci-fi-weapon-shoot-firing-pulse-tm-04-233827.mp3",
  beam_laser:       "/rescopicsound-sci-fi-weapon-shoot-firing-pulse-tm-01-233821.mp3",
  ricochet_cannon:  "/rescopicsound-sci-fi-weapon-shoot-firing-plasma-pp-02-233830.mp3",
  sonic_boom:       "/do_what_you_want-bomb-explosion-469038.mp3",
  nano_swarm:       "/rescopicsound-sci-fi-weapon-shoot-firing-pulse-tm-01-233821.mp3",
  photon_burst:     "/do_what_you_want-bomb-explosion-469038.mp3",
  plasma_whip:      "/rescopicsound-sci-fi-weapon-shoot-firing-pulse-tm-04-233827.mp3",
  warp_lance:       "/rescopicsound-sci-fi-weapon-shoot-firing-plasma-pp-02-233830.mp3",
};

const WEAPON_FIRE_VOL: Record<WeaponType, number> = {
  pulse_pistol: 0.3, plasma_caster: 0.3, frag_launcher: 0.06, shrapnel_blaster: 0.35, cryo_emitter: 0.25, void_reaper: 0.35,
  lightning_coil: 0.3, blade_wave: 0.3, railgun: 0.2, gravity_well: 0.15, swarm_missiles: 0.3, beam_laser: 0.25,
  ricochet_cannon: 0.3, sonic_boom: 0.2, nano_swarm: 0.25, photon_burst: 0.2, plasma_whip: 0.3, warp_lance: 0.2,
};

// Per-weapon barrel glow colors
const WEAPON_COLORS: Record<WeaponType, { barrel: string; emissive: string; flash: string }> = {
  pulse_pistol:     { barrel: "#aaa",    emissive: "#ffffff", flash: "#ffffff" },
  plasma_caster:    { barrel: "#0ff",    emissive: "#00ffff", flash: "#00ffff" },
  frag_launcher:    { barrel: "#ff6600", emissive: "#ff4400", flash: "#ff8800" },
  shrapnel_blaster: { barrel: "#f59e0b", emissive: "#ff8800", flash: "#ffaa00" },
  cryo_emitter:     { barrel: "#60a5fa", emissive: "#3b82f6", flash: "#93c5fd" },
  void_reaper:      { barrel: "#a855f7", emissive: "#7c3aed", flash: "#c084fc" },
  lightning_coil:   { barrel: "#facc15", emissive: "#eab308", flash: "#fde047" },
  blade_wave:       { barrel: "#fb7185", emissive: "#f43f5e", flash: "#fda4af" },
  railgun:          { barrel: "#34d399", emissive: "#10b981", flash: "#6ee7b7" },
  gravity_well:     { barrel: "#a78bfa", emissive: "#8b5cf6", flash: "#c4b5fd" },
  swarm_missiles:   { barrel: "#f87171", emissive: "#ef4444", flash: "#fca5a5" },
  beam_laser:       { barrel: "#a3e635", emissive: "#84cc16", flash: "#bef264" },
  ricochet_cannon:  { barrel: "#2dd4bf", emissive: "#14b8a6", flash: "#5eead4" },
  sonic_boom:       { barrel: "#38bdf8", emissive: "#0ea5e9", flash: "#7dd3fc" },
  nano_swarm:       { barrel: "#4ade80", emissive: "#22c55e", flash: "#86efac" },
  photon_burst:     { barrel: "#facc15", emissive: "#eab308", flash: "#fde047" },
  plasma_whip:      { barrel: "#f472b6", emissive: "#ec4899", flash: "#f9a8d4" },
  warp_lance:       { barrel: "#818cf8", emissive: "#6366f1", flash: "#a5b4fc" },
};

// Audio pool — reuse a small set of Audio elements instead of creating new ones per shot
const POOL_SIZE = 6;
function createAudioPool(src: string, volume: number): HTMLAudioElement[] {
  if (typeof window === "undefined") return [];
  return Array.from({ length: POOL_SIZE }, () => {
    const a = new Audio(src);
    a.volume = volume;
    return a;
  });
}

let killPool: HTMLAudioElement[] | null = null;
let hitPool: HTMLAudioElement[] | null = null;
const firePoolCache: Partial<Record<WeaponType, HTMLAudioElement[]>> = {};
const firePoolIdx: Partial<Record<WeaponType, number>> = {};
let killIdx = 0;
let hitIdx = 0;

function playFireSound(weapon: WeaponType) {
  if (!firePoolCache[weapon]) {
    firePoolCache[weapon] = createAudioPool(WEAPON_FIRE_SFX[weapon], WEAPON_FIRE_VOL[weapon]);
    firePoolIdx[weapon] = 0;
  }
  const pool = firePoolCache[weapon]!;
  const idx = firePoolIdx[weapon]! % POOL_SIZE;
  firePoolIdx[weapon] = idx + 1;
  pool[idx].volume = WEAPON_FIRE_VOL[weapon] * getSfxVol();
  pool[idx].currentTime = 0;
  pool[idx].play().catch(() => {});
}

function playKillSound() {
  if (!killPool) killPool = createAudioPool("/foxboytails-game-start-317318.mp3", 0.5);
  const a = killPool[killIdx % POOL_SIZE];
  killIdx++;
  a.volume = 0.5 * getSfxVol();
  a.currentTime = 0;
  a.play().catch(() => {});
}

function playHitSound() {
  if (!hitPool) hitPool = createAudioPool("/cyberwave-orchestra-fantasy-game-sword-cut-sound-effect-get-more-on-my-patreon-339824.mp3", 0.2);
  const a = hitPool[hitIdx % POOL_SIZE];
  hitIdx++;
  a.volume = 0.2 * getSfxVol();
  a.currentTime = 0;
  a.play().catch(() => {});
}

export function Weapon() {
  const { camera, scene } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const weaponMeshRef = useRef<THREE.Mesh>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  
  // Performance: use refs for animation state to avoid React re-renders in useFrame
  const recoilRef = useRef(0);
  const flashTimerRef = useRef(0);
  const lastFireRef = useRef(0);
  
  // Charged shots state
  const chargeStartRef = useRef(0); // timestamp when mouse went down (0 = not charging)
  const chargeWeaponRef = useRef<WeaponType | null>(null);
  const CHARGE_DURATION = 2.0; // seconds to full charge
  
  // Reuse a single raycaster and vector — zero allocations per shot
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const screenCenter = useMemo(() => new THREE.Vector2(0, 0), []);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const spreadDir = useMemo(() => new THREE.Vector3(), []);
  const aoePos = useMemo(() => new THREE.Vector3(), []);
  const enemyPos = useMemo(() => new THREE.Vector3(), []);
  const projVec = useMemo(() => new THREE.Vector3(), []);

  // Helper: damage or kill a single enemy, returns true if killed
  const hitEnemy = useCallback((state: ReturnType<typeof useStore.getState>, enemyId: number, damage: number, explosion: ExplosionType, hitObj?: THREE.Object3D) => {
    const enemy = state.enemies.find(e => e.id === enemyId);
    if (!enemy) return false;
    if (enemy.health <= damage) {
      state.removeEnemy(enemyId);
      const scoreMod = enemy.type === "juggernaut" ? 500 : enemy.type === "bomber" ? 200 : 100;
      const comboMult = useStore.getState().combo.multiplier;
      useStore.getState().incScore(Math.round(scoreMod * comboMult));
      if (hitObj) {
        hitObj.getWorldPosition(worldPos);
        const expColor = enemy.type === "juggernaut" ? "#0088ff" : enemy.type === "bomber" ? "#ffaa00" : "#ff0040";
        useStore.getState().addExplosion([worldPos.x, worldPos.y, worldPos.z], expColor, explosion);
        useStore.getState().spawnLootDrop(enemy.type, [worldPos.x, worldPos.y, worldPos.z]);
      }
      // Floating damage number (kill)
      projVec.set(
        hitObj ? worldPos.x : enemy.position[0],
        hitObj ? worldPos.y : enemy.position[1],
        hitObj ? worldPos.z : enemy.position[2],
      ).project(camera);
      if (projVec.z < 1) {
        window.dispatchEvent(new CustomEvent('nova:damage', { detail: { x: (projVec.x * 0.5 + 0.5) * window.innerWidth, y: (-projVec.y * 0.5 + 0.5) * window.innerHeight, damage, kill: true } }));
      }
      // Screen shake on kill
      window.dispatchEvent(new CustomEvent('nova:shake', { detail: { intensity: enemy.type === 'bomber' ? 0.8 : enemy.type === 'juggernaut' ? 0.6 : 0.3 } }));
      // Bomber death AOE — blast damages player
      if (enemy.type === 'bomber') {
        const bx = hitObj ? worldPos.x : enemy.position[0];
        const by = hitObj ? worldPos.y : enemy.position[1];
        const bz = hitObj ? worldPos.z : enemy.position[2];
        const dx = bx - camera.position.x, dy = by - camera.position.y, dz = bz - camera.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const BLAST_R = 8, BLAST_DMG = 25;
        if (dist < BLAST_R) {
          const aoeDmg = Math.round(BLAST_DMG * (1 - dist / BLAST_R));
          if (aoeDmg > 0) {
            useStore.getState().damagePlayer(aoeDmg);
            window.dispatchEvent(new CustomEvent('nova:playerHit', { detail: { damage: aoeDmg } }));
          }
        }
        useStore.getState().addExplosion(
          [bx, by, bz], '#ff6600', 'explosive'
        );
      }
      return true;
    }
    useStore.getState().damageEnemy(enemyId, damage);
    // Floating damage number (hit)
    if (hitObj) hitObj.getWorldPosition(worldPos);
    projVec.set(
      hitObj ? worldPos.x : enemy.position[0],
      hitObj ? worldPos.y : enemy.position[1],
      hitObj ? worldPos.z : enemy.position[2],
    ).project(camera);
    if (projVec.z < 1) {
      window.dispatchEvent(new CustomEvent('nova:damage', { detail: { x: (projVec.x * 0.5 + 0.5) * window.innerWidth, y: (-projVec.y * 0.5 + 0.5) * window.innerHeight, damage, kill: false } }));
    }
    return false;
  }, [worldPos, camera, projVec]);

  // Find first enemy hit along a ray direction
  const raycastEnemy = useCallback((origin: THREE.Vector3, dir: THREE.Vector3): { obj: THREE.Object3D; id: number } | null => {
    raycaster.set(origin, dir);
    raycaster.far = 200;
    const intersects = raycaster.intersectObjects(scene.children, true);
    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData?.isEnemy) return { obj, id: obj.userData.id };
        obj = obj.parent;
      }
    }
    return null;
  }, [raycaster, scene]);

  useEffect(() => {
    // ===== FIRE FUNCTION (called on release with charge multiplier) =====
    const fireWeapon = (chargeMultiplier: number) => {
      const now = performance.now() / 1000;
      const state = useStore.getState();
      const weapon = state.equippedWeapon;
      const weaponLevel = state.weaponLevels[weapon];
      const profile = WEAPON_PROFILE[weapon];
      const fireRateMult = 1 + (Math.max(weaponLevel, 1) - 1) * 0.1;
      const ammoSurgeBuff = state.activeBuffs.find(b => b.type === 'ammo_surge');
      const ammoSurgeMult = ammoSurgeBuff ? ammoSurgeBuff.value : 1;
      const effectiveRate = profile.fireRate / (fireRateMult * ammoSurgeMult);
      if (now - lastFireRef.current < effectiveRate) return;
      lastFireRef.current = now;

      const damageBuff = state.activeBuffs.find(b => b.type === 'damage_boost');
      const damageMultiplier = damageBuff ? damageBuff.value : 1;
      const damage = Math.round(getWeaponDamage(weapon, weaponLevel) * damageMultiplier * chargeMultiplier);

      recoilRef.current = 1;
      flashTimerRef.current = 0.05;
      playFireSound(weapon);

      // Base raycast from screen center
      raycaster.setFromCamera(screenCenter, camera);
      const baseOrigin = raycaster.ray.origin.clone();
      const baseDir = raycaster.ray.direction.clone();
      const UP = new THREE.Vector3(0, 1, 0);

      // Destroy any enemy projectiles along the firing ray
      {
        raycaster.set(baseOrigin, baseDir);
        raycaster.far = 200;
        const projHits = raycaster.intersectObjects(scene.children, true);
        for (const hit of projHits) {
          let obj: THREE.Object3D | null = hit.object;
          while (obj) {
            if (obj.userData?.isEnemyProjectile) {
              useStore.getState().destroyEnemyProjectile(obj.userData.id);
              break;
            }
            obj = obj.parent;
          }
        }
      }

      if (weapon === "shrapnel_blaster") {
        // SHRAPNEL: cone spread pellets
        const PELLETS = 5 + Math.floor(weaponLevel / 2);
        const SPREAD = 0.06;
        const hitIds = new Set<number>();
        let anyKill = false;
        for (let i = 0; i < PELLETS; i++) {
          spreadDir.copy(baseDir);
          if (i > 0) { spreadDir.x += (Math.random() - 0.5) * SPREAD * 2; spreadDir.y += (Math.random() - 0.5) * SPREAD * 2; spreadDir.normalize(); }
          const result = raycastEnemy(baseOrigin, spreadDir);
          if (result && !hitIds.has(result.id)) {
            hitIds.add(result.id);
            if (hitEnemy(state, result.id, damage, profile.explosion, result.obj)) anyKill = true;
          }
        }
        if (anyKill) { playKillSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); }
        else if (hitIds.size > 0) { playHitSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "hit" } })); }

      } else if (weapon === "frag_launcher") {
        // FRAG LAUNCHER: AOE blast at impact
        const AOE_RADIUS = 12 + weaponLevel;
        const intersects = raycaster.intersectObjects(scene.children, true);
        let impactPoint: THREE.Vector3 | null = null;
        if (intersects.length > 0) {
          impactPoint = intersects[0].point;
          let obj: THREE.Object3D | null = intersects[0].object;
          while (obj) { if (obj.userData?.isEnemy) { hitEnemy(state, obj.userData.id, damage, profile.explosion, obj); break; } obj = obj.parent; }
        }
        if (impactPoint) {
          aoePos.copy(impactPoint);
          state.addExplosion([aoePos.x, aoePos.y, aoePos.z], "#ff8800", profile.explosion);
          let killCount = 0;
          for (const enemy of state.enemies) {
            enemyPos.set(enemy.position[0], enemy.position[1], enemy.position[2]);
            const dist = enemyPos.distanceTo(aoePos);
            if (dist < AOE_RADIUS) { const killed = hitEnemy(useStore.getState(), enemy.id, Math.max(1, Math.floor(damage * (1 - dist / AOE_RADIUS))), profile.explosion); if (killed) killCount++; }
          }
          if (killCount > 0) { playKillSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); }
          else { playHitSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "hit" } })); }
        }

      } else if (weapon === "void_reaper") {
        // VOID REAPER: hit + chain to nearby
        const CHAIN_RANGE = 10 + weaponLevel * 2;
        const CHAIN_DMG = Math.max(1, Math.floor(damage * 0.6));
        const result = raycastEnemy(baseOrigin, baseDir);
        if (result) {
          const killed = hitEnemy(state, result.id, damage, profile.explosion, result.obj);
          if (killed) { playKillSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); }
          else { playHitSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "hit" } })); }
          result.obj.getWorldPosition(worldPos);
          for (const enemy of state.enemies) {
            if (enemy.id === result.id) continue;
            enemyPos.set(enemy.position[0], enemy.position[1], enemy.position[2]);
            if (enemyPos.distanceTo(worldPos) < CHAIN_RANGE) hitEnemy(useStore.getState(), enemy.id, CHAIN_DMG, profile.explosion);
          }
        }

      } else if (weapon === "lightning_coil") {
        // CHAIN LIGHTNING: hit first, chain to 2+level nearby enemies with decay
        const MAX_CHAINS = 2 + weaponLevel;
        const CHAIN_RANGE = 12 + weaponLevel * 2;
        const result = raycastEnemy(baseOrigin, baseDir);
        if (result) {
          let currentDmg = damage;
          const killed = hitEnemy(state, result.id, currentDmg, profile.explosion, result.obj);
          if (killed) { playKillSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); }
          else { playHitSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "hit" } })); }
          result.obj.getWorldPosition(worldPos);
          const chainedIds = new Set([result.id]);
          const lastPos = worldPos.clone();
          for (let c = 0; c < MAX_CHAINS; c++) {
            currentDmg = Math.max(1, Math.floor(currentDmg * 0.7));
            let nearest: { id: number; dist: number } | null = null;
            const cur = useStore.getState();
            for (const enemy of cur.enemies) {
              if (chainedIds.has(enemy.id)) continue;
              enemyPos.set(enemy.position[0], enemy.position[1], enemy.position[2]);
              const d = enemyPos.distanceTo(lastPos);
              if (d < CHAIN_RANGE && (!nearest || d < nearest.dist)) nearest = { id: enemy.id, dist: d };
            }
            if (!nearest) break;
            chainedIds.add(nearest.id);
            const e = cur.enemies.find(en => en.id === nearest!.id);
            if (e) { lastPos.set(e.position[0], e.position[1], e.position[2]); hitEnemy(useStore.getState(), nearest.id, currentDmg, profile.explosion); }
          }
        }

      } else if (weapon === "blade_wave") {
        // FORCE WAVE: wide arc sweep, pierce all enemies in cone
        const RAYS = 9 + weaponLevel * 2;
        const HALF_ARC = Math.PI / 6;
        const hitIds = new Set<number>();
        let anyKill = false;
        for (let i = 0; i < RAYS; i++) {
          const angle = -HALF_ARC + (HALF_ARC * 2 * i) / (RAYS - 1);
          spreadDir.copy(baseDir).applyAxisAngle(UP, angle).normalize();
          raycaster.set(baseOrigin, spreadDir);
          raycaster.far = 30 + weaponLevel * 3;
          const intersects = raycaster.intersectObjects(scene.children, true);
          for (const hit of intersects) {
            let obj: THREE.Object3D | null = hit.object;
            while (obj) {
              if (obj.userData?.isEnemy && !hitIds.has(obj.userData.id)) {
                hitIds.add(obj.userData.id);
                if (hitEnemy(useStore.getState(), obj.userData.id, damage, profile.explosion, obj)) anyKill = true;
              }
              obj = obj.parent;
            }
          }
        }
        if (anyKill) { playKillSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); }
        else if (hitIds.size > 0) { playHitSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "hit" } })); }

      } else if (weapon === "railgun") {
        // RAILGUN: single penetrating ray, hits ALL enemies along line
        raycaster.set(baseOrigin, baseDir);
        raycaster.far = 300;
        const intersects = raycaster.intersectObjects(scene.children, true);
        const hitIds = new Set<number>();
        let currentDmg = damage;
        let anyKill = false;
        for (const hit of intersects) {
          let obj: THREE.Object3D | null = hit.object;
          while (obj) {
            if (obj.userData?.isEnemy && !hitIds.has(obj.userData.id)) {
              hitIds.add(obj.userData.id);
              if (hitEnemy(useStore.getState(), obj.userData.id, currentDmg, profile.explosion, obj)) anyKill = true;
              currentDmg = Math.max(1, Math.floor(currentDmg * 0.8));
            }
            obj = obj.parent;
          }
        }
        if (anyKill) { playKillSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); }
        else if (hitIds.size > 0) { playHitSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "hit" } })); }

      } else if (weapon === "gravity_well") {
        // SINGULARITY: massive AOE at impact
        const AOE_RADIUS = 18 + weaponLevel * 3;
        raycaster.set(baseOrigin, baseDir);
        raycaster.far = 200;
        const intersects = raycaster.intersectObjects(scene.children, true);
        const impactPoint = intersects.length > 0 ? intersects[0].point : baseOrigin.clone().add(baseDir.clone().multiplyScalar(50));
        aoePos.copy(impactPoint);
        state.addExplosion([aoePos.x, aoePos.y, aoePos.z], "#8b5cf6", profile.explosion);
        let killCount = 0;
        for (const enemy of useStore.getState().enemies) {
          enemyPos.set(enemy.position[0], enemy.position[1], enemy.position[2]);
          const dist = enemyPos.distanceTo(aoePos);
          if (dist < AOE_RADIUS) {
            if (hitEnemy(useStore.getState(), enemy.id, Math.max(1, Math.floor(damage * (1 - dist / AOE_RADIUS * 0.5))), profile.explosion)) killCount++;
          }
        }
        if (killCount > 0) { playKillSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); }

      } else if (weapon === "swarm_missiles") {
        // SWARM: auto-target N closest enemies
        const TARGETS = 3 + Math.floor(weaponLevel / 2);
        const cur = useStore.getState();
        const playerP = camera.position;
        const sorted = [...cur.enemies]
          .map(e => ({ id: e.id, dist: Math.sqrt((e.position[0] - playerP.x) ** 2 + (e.position[1] - playerP.y) ** 2 + (e.position[2] - playerP.z) ** 2) }))
          .sort((a, b) => a.dist - b.dist)
          .slice(0, TARGETS);
        let anyKill = false;
        for (const t of sorted) { if (hitEnemy(useStore.getState(), t.id, damage, profile.explosion)) anyKill = true; }
        if (anyKill) { playKillSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); }
        else if (sorted.length > 0) { playHitSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "hit" } })); }

      } else if (weapon === "beam_laser") {
        // PRECISION BEAM: extended range, pierce at level 3+
        raycaster.set(baseOrigin, baseDir);
        raycaster.far = 400;
        const intersects = raycaster.intersectObjects(scene.children, true);
        const hitIds = new Set<number>();
        const maxPierce = weaponLevel >= 3 ? Math.floor(weaponLevel / 2) : 1;
        let anyKill = false;
        for (const hit of intersects) {
          if (hitIds.size >= maxPierce) break;
          let obj: THREE.Object3D | null = hit.object;
          while (obj) {
            if (obj.userData?.isEnemy && !hitIds.has(obj.userData.id)) {
              hitIds.add(obj.userData.id);
              if (hitEnemy(useStore.getState(), obj.userData.id, damage, profile.explosion, obj)) anyKill = true;
              break;
            }
            obj = obj.parent;
          }
        }
        if (anyKill) { playKillSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); }
        else if (hitIds.size > 0) { playHitSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "hit" } })); }

      } else if (weapon === "ricochet_cannon") {
        // RICOCHET: bounces between enemies
        const MAX_BOUNCES = 2 + weaponLevel;
        const BOUNCE_RANGE = 15;
        const result = raycastEnemy(baseOrigin, baseDir);
        if (result) {
          let anyKill = hitEnemy(state, result.id, damage, profile.explosion, result.obj);
          result.obj.getWorldPosition(worldPos);
          const bouncedIds = new Set([result.id]);
          const lastPos = worldPos.clone();
          for (let b = 0; b < MAX_BOUNCES; b++) {
            let nearest: { id: number; dist: number } | null = null;
            const cur = useStore.getState();
            for (const enemy of cur.enemies) {
              if (bouncedIds.has(enemy.id)) continue;
              enemyPos.set(enemy.position[0], enemy.position[1], enemy.position[2]);
              const d = enemyPos.distanceTo(lastPos);
              if (d < BOUNCE_RANGE && (!nearest || d < nearest.dist)) nearest = { id: enemy.id, dist: d };
            }
            if (!nearest) break;
            bouncedIds.add(nearest.id);
            const e = cur.enemies.find(en => en.id === nearest!.id);
            if (e) { lastPos.set(e.position[0], e.position[1], e.position[2]); if (hitEnemy(useStore.getState(), nearest.id, damage, profile.explosion)) anyKill = true; }
          }
          if (anyKill) { playKillSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); }
          else { playHitSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "hit" } })); }
        }

      } else if (weapon === "sonic_boom") {
        // SONIC: very wide cone, high damage per pellet
        const PELLETS = 3 + weaponLevel;
        const SPREAD = 0.2;
        const hitIds = new Set<number>();
        let anyKill = false;
        for (let i = 0; i < PELLETS; i++) {
          spreadDir.copy(baseDir);
          spreadDir.x += (Math.random() - 0.5) * SPREAD * 2;
          spreadDir.y += (Math.random() - 0.5) * SPREAD * 2;
          spreadDir.normalize();
          const result = raycastEnemy(baseOrigin, spreadDir);
          if (result && !hitIds.has(result.id)) {
            hitIds.add(result.id);
            if (hitEnemy(useStore.getState(), result.id, damage, profile.explosion, result.obj)) anyKill = true;
          }
        }
        if (anyKill) { playKillSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); }
        else if (hitIds.size > 0) { playHitSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "hit" } })); }

      } else if (weapon === "nano_swarm") {
        // NANO CLOUD: massive AOE radius
        const AOE_RADIUS = 20 + weaponLevel * 3;
        raycaster.set(baseOrigin, baseDir);
        raycaster.far = 200;
        const intersects = raycaster.intersectObjects(scene.children, true);
        const impactPoint = intersects.length > 0 ? intersects[0].point : baseOrigin.clone().add(baseDir.clone().multiplyScalar(50));
        aoePos.copy(impactPoint);
        state.addExplosion([aoePos.x, aoePos.y, aoePos.z], "#22c55e", profile.explosion);
        let killCount = 0;
        for (const enemy of useStore.getState().enemies) {
          enemyPos.set(enemy.position[0], enemy.position[1], enemy.position[2]);
          const dist = enemyPos.distanceTo(aoePos);
          if (dist < AOE_RADIUS) {
            if (hitEnemy(useStore.getState(), enemy.id, Math.max(1, Math.floor(damage * (1 - dist / AOE_RADIUS))), profile.explosion)) killCount++;
          }
        }
        if (killCount > 0) { playKillSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); }

      } else if (weapon === "photon_burst") {
        // 360 NOVA: damage all enemies within radius regardless of aim
        const NOVA_RADIUS = 15 + weaponLevel * 2;
        const playerP = camera.position;
        state.addExplosion([playerP.x, playerP.y, playerP.z], "#eab308", profile.explosion);
        let killCount = 0;
        for (const enemy of useStore.getState().enemies) {
          enemyPos.set(enemy.position[0], enemy.position[1], enemy.position[2]);
          const dist = enemyPos.distanceTo(playerP);
          if (dist < NOVA_RADIUS) {
            if (hitEnemy(useStore.getState(), enemy.id, Math.max(1, Math.floor(damage * (1 - dist / NOVA_RADIUS * 0.5))), profile.explosion)) killCount++;
          }
        }
        if (killCount > 0) { playKillSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); }

      } else if (weapon === "plasma_whip") {
        // ARC SWEEP: horizontal arc, hits all in sweep
        const RAYS = 6 + weaponLevel;
        const HALF_ARC = Math.PI / 4;
        const hitIds = new Set<number>();
        let anyKill = false;
        for (let i = 0; i < RAYS; i++) {
          const angle = -HALF_ARC + (HALF_ARC * 2 * i) / (RAYS - 1);
          spreadDir.copy(baseDir).applyAxisAngle(UP, angle).normalize();
          raycaster.set(baseOrigin, spreadDir);
          raycaster.far = 25 + weaponLevel * 2;
          const intersects = raycaster.intersectObjects(scene.children, true);
          for (const hit of intersects) {
            let obj: THREE.Object3D | null = hit.object;
            while (obj) {
              if (obj.userData?.isEnemy && !hitIds.has(obj.userData.id)) {
                hitIds.add(obj.userData.id);
                if (hitEnemy(useStore.getState(), obj.userData.id, damage, profile.explosion, obj)) anyKill = true;
              }
              obj = obj.parent;
            }
          }
        }
        if (anyKill) { playKillSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); }
        else if (hitIds.size > 0) { playHitSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "hit" } })); }

      } else if (weapon === "warp_lance") {
        // WARP LANCE: penetrate all, distance bonus damage
        raycaster.set(baseOrigin, baseDir);
        raycaster.far = 400;
        const intersects = raycaster.intersectObjects(scene.children, true);
        const hitIds = new Set<number>();
        let anyKill = false;
        for (const hit of intersects) {
          let obj: THREE.Object3D | null = hit.object;
          while (obj) {
            if (obj.userData?.isEnemy && !hitIds.has(obj.userData.id)) {
              hitIds.add(obj.userData.id);
              const distBonus = 1 + Math.min(1, hit.distance / 100);
              if (hitEnemy(useStore.getState(), obj.userData.id, Math.max(1, Math.floor(damage * distBonus)), profile.explosion, obj)) anyKill = true;
            }
            obj = obj.parent;
          }
        }
        if (anyKill) { playKillSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); }
        else if (hitIds.size > 0) { playHitSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "hit" } })); }

      } else {
        // DEFAULT (pulse_pistol, plasma_caster, cryo_emitter): single/burst + penetration at level 3+
        const burstCount = weapon === "plasma_caster" ? 3 : 1;
        const burstSpread = weapon === "plasma_caster" ? 0.02 : 0;
        const maxPierce = weaponLevel >= 3 ? Math.floor(weaponLevel / 2) : 1;

        for (let b = 0; b < burstCount; b++) {
          const dir = baseDir.clone();
          if (b > 0) { dir.x += (Math.random() - 0.5) * burstSpread * 2; dir.y += (Math.random() - 0.5) * burstSpread * 2; dir.normalize(); }
          raycaster.set(baseOrigin, dir);
          raycaster.far = 200;
          const intersects = raycaster.intersectObjects(scene.children, true);
          const hitIds = new Set<number>();
          let anyKill = false;
          for (const hit of intersects) {
            if (hitIds.size >= maxPierce) break;
            let obj: THREE.Object3D | null = hit.object;
            while (obj) {
              if (obj.userData?.isEnemy && !hitIds.has(obj.userData.id)) {
                hitIds.add(obj.userData.id);
                if (hitEnemy(useStore.getState(), obj.userData.id, damage, profile.explosion, obj)) anyKill = true;
                break;
              }
              obj = obj.parent;
            }
          }
          if (anyKill) { playKillSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); }
          else if (hitIds.size > 0) { playHitSound(); window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "hit" } })); }
        }
      }
    };

    // ===== CHARGE SYSTEM: pointerdown starts charge, pointerup fires =====
    const handlePointerDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (useStore.getState().isPaused) return;
      if (!document.pointerLockElement) return;
      chargeStartRef.current = performance.now();
      chargeWeaponRef.current = useStore.getState().equippedWeapon;
    };

    const handlePointerUp = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (!chargeStartRef.current) return;
      const heldMs = performance.now() - chargeStartRef.current;
      chargeStartRef.current = 0;
      chargeWeaponRef.current = null;
      // Dispatch charge cleared to HUD
      window.dispatchEvent(new CustomEvent('nova:charge', { detail: { charge: 0 } }));
      
      if (useStore.getState().isPaused) return;
      if (!document.pointerLockElement) return;

      // Charge multiplier: tap (<150ms) = 1x, full hold (2s) = 3x
      const chargePercent = Math.min(1, Math.max(0, heldMs / 1000 / CHARGE_DURATION));
      const chargeMultiplier = 1 + chargePercent * 2; // 1x to 3x
      fireWeapon(chargeMultiplier);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [camera, scene, raycaster, screenCenter, worldPos, spreadDir, aoePos, enemyPos, hitEnemy, raycastEnemy]);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    // Dispatch charge progress to HUD
    if (chargeStartRef.current > 0 && document.pointerLockElement && !useStore.getState().isPaused) {
      const heldMs = performance.now() - chargeStartRef.current;
      const charge = Math.min(1, heldMs / 1000 / CHARGE_DURATION);
      window.dispatchEvent(new CustomEvent('nova:charge', { detail: { charge } }));
    }

    // Attach weapon to camera
    groupRef.current.position.copy(camera.position);
    groupRef.current.rotation.copy(camera.rotation);

    // Decay recoil (ref-based, no React re-render)
    if (recoilRef.current > 0) {
      recoilRef.current = Math.max(0, recoilRef.current - delta * 5);
    }

    // Decay flash timer
    if (flashTimerRef.current > 0) {
      flashTimerRef.current = Math.max(0, flashTimerRef.current - delta);
    }
    
    // Update flash mesh visibility directly
    if (flashRef.current) {
      flashRef.current.visible = flashTimerRef.current > 0;
    }

    if (weaponMeshRef.current) {
      weaponMeshRef.current.position.z = THREE.MathUtils.lerp(
        weaponMeshRef.current.position.z,
        recoilRef.current > 0 ? -0.25 : -0.4,
        delta * 15
      );
      weaponMeshRef.current.rotation.x = THREE.MathUtils.lerp(
        weaponMeshRef.current.rotation.x,
        recoilRef.current > 0 ? 0.1 : 0,
        delta * 15
      );
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={weaponMeshRef} position={[0.3, -0.3, -0.4]} castShadow>
        <WeaponModel />

        {/* Laser trail — toggled via ref, not conditional render */}
        <mesh ref={flashRef} visible={false} position={[0, 0, -50]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 100]} />
          <WeaponFlashMaterial />
        </mesh>
      </mesh>
    </group>
  );
}

/** Reactive weapon model that scales visually with weapon level */
function WeaponModel() {
  const weapon = useStore((s) => s.equippedWeapon);
  const level = useStore((s) => s.weaponLevels[s.equippedWeapon]);
  const colors = WEAPON_COLORS[weapon];
  const effectiveLevel = Math.max(level, 1);

  // Lv4+: barrel gets wider/longer
  const barrelWidth = 0.08 + (effectiveLevel >= 4 ? 0.02 : 0);
  const barrelLength = 0.6 + (effectiveLevel >= 4 ? 0.1 : 0);
  // Glow intensity increases with level
  const glowIntensity = 1.5 + (effectiveLevel - 1) * 1.0;
  const isMastered = effectiveLevel >= 5;

  return (
    <>
      {/* Main barrel body */}
      <boxGeometry args={[barrelWidth, 0.15, barrelLength]} />
      <meshStandardMaterial
        color={isMastered ? '#1a1a2e' : '#111'}
        metalness={0.9}
        roughness={0.1}
        emissive={isMastered ? colors.emissive : '#000000'}
        emissiveIntensity={isMastered ? 0.3 : 0}
      />

      {/* Primary barrel strip — always visible */}
      <mesh position={[0, 0.08, 0.1]}>
        <boxGeometry args={[0.02, 0.05, barrelLength * 0.65]} />
        <meshStandardMaterial color={colors.barrel} emissive={colors.emissive} emissiveIntensity={glowIntensity} toneMapped={false} />
      </mesh>

      {/* Lv2+: Second glowing barrel strip (bottom) */}
      {effectiveLevel >= 2 && (
        <mesh position={[0, -0.08, 0.1]}>
          <boxGeometry args={[0.02, 0.03, barrelLength * 0.5]} />
          <meshStandardMaterial color={colors.barrel} emissive={colors.emissive} emissiveIntensity={glowIntensity * 0.7} toneMapped={false} />
        </mesh>
      )}

      {/* Lv3+: Side strips */}
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

      {/* Lv4+: Muzzle tip ring */}
      {effectiveLevel >= 4 && (
        <mesh position={[0, 0, -barrelLength / 2 - 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.06, 0.01, 8, 16]} />
          <meshStandardMaterial color="#000" emissive={colors.emissive} emissiveIntensity={glowIntensity} toneMapped={false} />
        </mesh>
      )}

      {/* Lv5 MASTERED: outer glow aura */}
      {isMastered && (
        <mesh position={[0, 0, -0.05]}>
          <boxGeometry args={[barrelWidth + 0.04, 0.2, barrelLength + 0.06]} />
          <meshStandardMaterial
            color="#000"
            emissive={colors.emissive}
            emissiveIntensity={2}
            transparent
            opacity={0.08}
            toneMapped={false}
          />
        </mesh>
      )}
    </>
  );
}

/** Reactive flash material */
function WeaponFlashMaterial() {
  const weapon = useStore((s) => s.equippedWeapon);
  const colors = WEAPON_COLORS[weapon];
  return <meshBasicMaterial color={colors.flash} />;
}