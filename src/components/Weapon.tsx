import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useMemo, useCallback } from "react";
import * as THREE from "three";
import { useStore, WeaponType, ExplosionType, WEAPON_CLASS } from "@/store";

const WEAPON_PROFILE: Record<WeaponType, { baseDamage: number; explosion: ExplosionType; fireRate: number }> = {
  pulse_pistol:     { baseDamage: 1, explosion: "kinetic",   fireRate: 0.15 },
  plasma_caster:    { baseDamage: 2, explosion: "energy",    fireRate: 0.30 },
  frag_launcher:    { baseDamage: 4, explosion: "explosive", fireRate: 0.80 },
  shrapnel_blaster: { baseDamage: 1, explosion: "spread",    fireRate: 0.35 },
  cryo_emitter:     { baseDamage: 1, explosion: "tech",      fireRate: 0.20 },
  void_reaper:      { baseDamage: 3, explosion: "forbidden", fireRate: 0.40 },
};

// Damage scales with weapon level: +20% per level
function getWeaponDamage(weapon: WeaponType, level: number): number {
  const base = WEAPON_PROFILE[weapon].baseDamage;
  return Math.max(1, Math.round(base * (1 + (Math.max(level, 1) - 1) * 0.2)));
}

// Per-weapon fire sound mapping (reuse existing SFX files)
const WEAPON_FIRE_SFX: Record<WeaponType, string> = {
  pulse_pistol:     "/rescopicsound-sci-fi-weapon-shoot-firing-plasma-pp-02-233830.mp3",
  plasma_caster:    "/rescopicsound-sci-fi-weapon-shoot-firing-pulse-tm-01-233821.mp3",
  frag_launcher:    "/do_what_you_want-bomb-explosion-469038.mp3",
  shrapnel_blaster: "/rescopicsound-sci-fi-weapon-shoot-firing-pulse-tm-04-233827.mp3",
  cryo_emitter:     "/rescopicsound-sci-fi-weapon-shoot-firing-pulse-tm-01-233821.mp3",
  void_reaper:      "/do_what_you_want-bomb-explosion-469038.mp3",
};

const WEAPON_FIRE_VOL: Record<WeaponType, number> = {
  pulse_pistol: 0.3, plasma_caster: 0.3, frag_launcher: 0.15, shrapnel_blaster: 0.35, cryo_emitter: 0.25, void_reaper: 0.35,
};

// Per-weapon barrel glow colors
const WEAPON_COLORS: Record<WeaponType, { barrel: string; emissive: string; flash: string }> = {
  pulse_pistol:     { barrel: "#aaa",    emissive: "#ffffff", flash: "#ffffff" },
  plasma_caster:    { barrel: "#0ff",    emissive: "#00ffff", flash: "#00ffff" },
  frag_launcher:    { barrel: "#ff6600", emissive: "#ff4400", flash: "#ff8800" },
  shrapnel_blaster: { barrel: "#f59e0b", emissive: "#ff8800", flash: "#ffaa00" },
  cryo_emitter:     { barrel: "#60a5fa", emissive: "#3b82f6", flash: "#93c5fd" },
  void_reaper:      { barrel: "#a855f7", emissive: "#7c3aed", flash: "#c084fc" },
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
  pool[idx].currentTime = 0;
  pool[idx].play().catch(() => {});
}

function playKillSound() {
  if (!killPool) killPool = createAudioPool("/foxboytails-game-start-317318.mp3", 0.5);
  const a = killPool[killIdx % POOL_SIZE];
  killIdx++;
  a.currentTime = 0;
  a.play().catch(() => {});
}

function playHitSound() {
  if (!hitPool) hitPool = createAudioPool("/cyberwave-orchestra-fantasy-game-sword-cut-sound-effect-get-more-on-my-patreon-339824.mp3", 0.2);
  const a = hitPool[hitIdx % POOL_SIZE];
  hitIdx++;
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
  
  // Reuse a single raycaster and vector — zero allocations per shot
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const screenCenter = useMemo(() => new THREE.Vector2(0, 0), []);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const spreadDir = useMemo(() => new THREE.Vector3(), []);
  const aoePos = useMemo(() => new THREE.Vector3(), []);
  const enemyPos = useMemo(() => new THREE.Vector3(), []);

  // Helper: damage or kill a single enemy, returns true if killed
  const hitEnemy = useCallback((state: ReturnType<typeof useStore.getState>, enemyId: number, damage: number, explosion: ExplosionType, hitObj?: THREE.Object3D) => {
    const enemy = state.enemies.find(e => e.id === enemyId);
    if (!enemy) return false;
    if (enemy.health <= damage) {
      state.removeEnemy(enemyId);
      const scoreMod = enemy.type === "juggernaut" ? 500 : enemy.type === "bomber" ? 200 : 100;
      state.incScore(scoreMod);
      if (hitObj) {
        hitObj.getWorldPosition(worldPos);
        const expColor = enemy.type === "juggernaut" ? "#0088ff" : enemy.type === "bomber" ? "#ffaa00" : "#ff0040";
        state.addExplosion([worldPos.x, worldPos.y, worldPos.z], expColor, explosion);
      }
      return true;
    }
    state.damageEnemy(enemyId, damage);
    return false;
  }, [worldPos]);

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
    const handlePointerDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (useStore.getState().isPaused) return;
      if (!document.pointerLockElement) return;

      const now = performance.now() / 1000;
      const state = useStore.getState();
      const weapon = state.equippedWeapon;
      const weaponLevel = state.weaponLevels[weapon];
      const profile = WEAPON_PROFILE[weapon];
      const fireRateMult = 1 + (Math.max(weaponLevel, 1) - 1) * 0.1;
      const effectiveRate = profile.fireRate / fireRateMult;
      if (now - lastFireRef.current < effectiveRate) return;
      lastFireRef.current = now;

      const damage = getWeaponDamage(weapon, weaponLevel);

      recoilRef.current = 1;
      flashTimerRef.current = 0.05;
      playFireSound(weapon);

      // Base raycast from screen center
      raycaster.setFromCamera(screenCenter, camera);
      const baseOrigin = raycaster.ray.origin.clone();
      const baseDir = raycaster.ray.direction.clone();

      if (weapon === "shrapnel_blaster") {
        // SHRAPNEL: 5 rays in a cone spread
        const PELLETS = 5 + Math.floor(weaponLevel / 2); // more pellets at higher levels
        const SPREAD = 0.06;
        let anyHit = false;
        let anyKill = false;
        const hitIds = new Set<number>();

        for (let i = 0; i < PELLETS; i++) {
          spreadDir.copy(baseDir);
          if (i > 0) {
            spreadDir.x += (Math.random() - 0.5) * SPREAD * 2;
            spreadDir.y += (Math.random() - 0.5) * SPREAD * 2;
            spreadDir.normalize();
          }
          const result = raycastEnemy(baseOrigin, spreadDir);
          if (result && !hitIds.has(result.id)) {
            hitIds.add(result.id);
            const killed = hitEnemy(state, result.id, damage, profile.explosion, result.obj);
            if (killed) { anyKill = true; playKillSound(); }
            anyHit = true;
          }
        }
        if (anyKill) window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } }));
        else if (anyHit) { window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "hit" } })); playHitSound(); }

      } else if (weapon === "frag_launcher") {
        // FRAG LAUNCHER: single ray, AOE blast at impact point
        const AOE_RADIUS = 12 + weaponLevel;
        const intersects = raycaster.intersectObjects(scene.children, true);
        let impactPoint: THREE.Vector3 | null = null;

        // Find first hit (enemy or scenery) to get impact point
        if (intersects.length > 0) {
          impactPoint = intersects[0].point;
          // Direct hit enemy
          let obj: THREE.Object3D | null = intersects[0].object;
          while (obj) {
            if (obj.userData?.isEnemy) {
              hitEnemy(state, obj.userData.id, damage, profile.explosion, obj);
              break;
            }
            obj = obj.parent;
          }
        }

        if (impactPoint) {
          aoePos.copy(impactPoint);
          state.addExplosion([aoePos.x, aoePos.y, aoePos.z], "#ff8800", profile.explosion);

          // Damage all enemies within AOE_RADIUS
          let killCount = 0;
          for (const enemy of state.enemies) {
            enemyPos.set(enemy.position[0], enemy.position[1], enemy.position[2]);
            const dist = enemyPos.distanceTo(aoePos);
            if (dist < AOE_RADIUS) {
              const falloff = 1 - (dist / AOE_RADIUS);
              const aoeDmg = Math.max(1, Math.floor(damage * falloff));
              const killed = hitEnemy(useStore.getState(), enemy.id, aoeDmg, profile.explosion);
              if (killed) killCount++;
            }
          }
          if (killCount > 0) { window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); playKillSound(); }
          else { window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "hit" } })); playHitSound(); }
        }

      } else if (weapon === "void_reaper") {
        // VOID REAPER: single ray hit, then chain to nearby enemies
        const CHAIN_RANGE = 10 + weaponLevel * 2;
        const CHAIN_DMG = Math.max(1, Math.floor(damage * 0.6));
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
          let obj: THREE.Object3D | null = intersects[0].object;
          while (obj) {
            if (obj.userData?.isEnemy) {
              const targetId = obj.userData.id;
              const killed = hitEnemy(state, targetId, damage, profile.explosion, obj);
              if (killed) { window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); playKillSound(); }
              else { window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "hit" } })); playHitSound(); }

              // Chain: damage nearby enemies
              obj.getWorldPosition(worldPos);
              for (const enemy of state.enemies) {
                if (enemy.id === targetId) continue;
                enemyPos.set(enemy.position[0], enemy.position[1], enemy.position[2]);
                if (enemyPos.distanceTo(worldPos) < CHAIN_RANGE) {
                  hitEnemy(useStore.getState(), enemy.id, CHAIN_DMG, profile.explosion);
                }
              }
              break;
            }
            obj = obj.parent;
          }
        }

      } else {
        // DEFAULT (pulse_pistol, plasma_caster, cryo_emitter): single/burst raycast
        const burstCount = weapon === "plasma_caster" ? 3 : 1;
        const burstSpread = weapon === "plasma_caster" ? 0.02 : 0;
        
        for (let b = 0; b < burstCount; b++) {
          const dir = baseDir.clone();
          if (b > 0) {
            dir.x += (Math.random() - 0.5) * burstSpread * 2;
            dir.y += (Math.random() - 0.5) * burstSpread * 2;
            dir.normalize();
          }
          raycaster.set(baseOrigin, dir);
          raycaster.far = 200;
          const intersects = raycaster.intersectObjects(scene.children, true);
          if (intersects.length > 0) {
            let obj: THREE.Object3D | null = intersects[0].object;
            while (obj) {
              if (obj.userData?.isEnemy) {
                const killed = hitEnemy(state, obj.userData.id, damage, profile.explosion, obj);
                if (killed) { window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } })); playKillSound(); }
                else { window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "hit" } })); playHitSound(); }
                break;
              }
              obj = obj.parent;
            }
          }
        }
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [camera, scene, raycaster, screenCenter, worldPos, spreadDir, aoePos, enemyPos, hitEnemy, raycastEnemy]);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;

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
        recoilRef.current > 0 ? -0.1 : -0.4,
        delta * 15
      );
      weaponMeshRef.current.rotation.x = THREE.MathUtils.lerp(
        weaponMeshRef.current.rotation.x,
        recoilRef.current > 0 ? 0.3 : 0,
        delta * 15
      );
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={weaponMeshRef} position={[0.3, -0.3, -0.4]} castShadow>
        <boxGeometry args={[0.08, 0.15, 0.6]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
        
        {/* Glowing barrel strip — color changes per weapon */}
        <mesh position={[0, 0.08, 0.1]}>
           <boxGeometry args={[0.02, 0.05, 0.4]} />
           <WeaponBarrelMaterial />
        </mesh>

        {/* Laser trail — toggled via ref, not conditional render */}
        <mesh ref={flashRef} visible={false} position={[0, 0, -50]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 100]} />
          <WeaponFlashMaterial />
        </mesh>
      </mesh>
    </group>
  );
}

/** Reactive barrel strip material that reads equippedWeapon from store */
function WeaponBarrelMaterial() {
  const weapon = useStore((s) => s.equippedWeapon);
  const colors = WEAPON_COLORS[weapon];
  return <meshStandardMaterial color={colors.barrel} emissive={colors.emissive} emissiveIntensity={2} />;
}

/** Reactive flash material */
function WeaponFlashMaterial() {
  const weapon = useStore((s) => s.equippedWeapon);
  const colors = WEAPON_COLORS[weapon];
  return <meshBasicMaterial color={colors.flash} />;
}