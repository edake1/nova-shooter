import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { useStore, WeaponType } from "@/store";

const WEAPON_PROFILE: Record<WeaponType, { damage: number; explosion: "plasma" | "shrapnel" | "bio" | "nuke"; fireRate: number }> = {
  plasmacaster: { damage: 1, explosion: "plasma", fireRate: 0.15 },
  shrapnel:     { damage: 2, explosion: "shrapnel", fireRate: 0.35 },
  bio:          { damage: 1, explosion: "bio", fireRate: 0.25 },
  nuke:         { damage: 4, explosion: "nuke", fireRate: 0.8 },
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
let killIdx = 0;
let hitIdx = 0;

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

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (useStore.getState().isPaused) return;
      if (!document.pointerLockElement) return;

      // Fire rate cooldown
      const now = performance.now() / 1000;
      const state = useStore.getState();
      const profile = WEAPON_PROFILE[state.equippedWeapon];
      if (now - lastFireRef.current < profile.fireRate) return;
      lastFireRef.current = now;

      // Trigger recoil & flash (ref-based, no setState)
      recoilRef.current = 1;
      flashTimerRef.current = 0.05;

      // Raycast from screen center
      raycaster.setFromCamera(screenCenter, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj) {
          if (obj.userData?.isEnemy) {
            const targetId = obj.userData.id;
            const enemy = state.enemies.find(e => e.id === targetId);

            if (enemy) {
              if (enemy.health <= profile.damage) {
                state.removeEnemy(targetId);
                const scoreMod = enemy.type === "juggernaut" ? 500 : enemy.type === "bomber" ? 200 : 100;
                state.incScore(scoreMod);
                
                obj.getWorldPosition(worldPos);
                const expColor = enemy.type === "juggernaut" ? "#0088ff" : enemy.type === "bomber" ? "#ffaa00" : "#ff0040";
                state.addExplosion([worldPos.x, worldPos.y, worldPos.z], expColor, profile.explosion);
                window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "kill" } }));
                playKillSound();
              } else {
                state.damageEnemy(targetId, profile.damage);
                window.dispatchEvent(new CustomEvent("nova:hit", { detail: { kind: "hit" } }));
                playHitSound();
              }
            }
            break;
          }
          obj = obj.parent;
        }
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [camera, scene, raycaster, screenCenter, worldPos]);

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
        
        {/* Glowing barrel strip */}
        <mesh position={[0, 0.08, 0.1]}>
           <boxGeometry args={[0.02, 0.05, 0.4]} />
           <meshStandardMaterial color="#0ff" emissive="#00ffff" emissiveIntensity={2} />
        </mesh>

        {/* Laser trail — toggled via ref, not conditional render */}
        <mesh ref={flashRef} visible={false} position={[0, 0, -50]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 100]} />
          <meshBasicMaterial color="#00ffff" />
        </mesh>
      </mesh>
    </group>
  );
}