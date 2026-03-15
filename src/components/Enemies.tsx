import { useRef, useEffect, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import { useStore, EnemyData } from "@/store";
import * as THREE from "three";

// === ENEMY TRAIT CONFIG ===
interface EnemyTraits {
  speed: number;
  baseScale: number;
  rotSpeed: number;
  contactDamage: number;
  contactRange: number;
  emissive: string;
  core: string;
  ranged: boolean;
  fireInterval: number; // ms between shots (0 = melee only)
  projectileSpeed: number;
  projectileDamage: number;
  preferredRange: number; // distance they try to maintain from player
  wireframe: boolean;
}

const ENEMY_TRAITS: Record<string, EnemyTraits> = {
  swarmer: {
    speed: 3.5, baseScale: 0.5, rotSpeed: 0.02,
    contactDamage: 5, contactRange: 1.5,
    emissive: '#ff0044', core: '#ff0040',
    ranged: false, fireInterval: 0, projectileSpeed: 0, projectileDamage: 0,
    preferredRange: 0, wireframe: true,
  },
  spitter: {
    speed: 2.5, baseScale: 0.6, rotSpeed: 0.01,
    contactDamage: 3, contactRange: 1.5,
    emissive: '#aa00ff', core: '#cc44ff',
    ranged: true, fireInterval: 2000, projectileSpeed: 18, projectileDamage: 10,
    preferredRange: 18, wireframe: false,
  },
  charger: {
    speed: 2.0, baseScale: 0.7, rotSpeed: 0.03,
    contactDamage: 15, contactRange: 2.0,
    emissive: '#ff6600', core: '#ff8800',
    ranged: false, fireInterval: 0, projectileSpeed: 0, projectileDamage: 0,
    preferredRange: 0, wireframe: true,
  },
  shielder: {
    speed: 2.0, baseScale: 0.8, rotSpeed: 0.008,
    contactDamage: 5, contactRange: 2.0,
    emissive: '#0066ff', core: '#00aaff',
    ranged: true, fireInterval: 4000, projectileSpeed: 14, projectileDamage: 15,
    preferredRange: 14, wireframe: false,
  },
  bomber: {
    speed: 4.0, baseScale: 0.9, rotSpeed: 0.05,
    contactDamage: 15, contactRange: 2.0,
    emissive: '#ffaa00', core: '#ff4400',
    ranged: false, fireInterval: 0, projectileSpeed: 0, projectileDamage: 0,
    preferredRange: 0, wireframe: false,
  },
  juggernaut: {
    speed: 2.5, baseScale: 1.8, rotSpeed: 0.005,
    contactDamage: 10, contactRange: 3.0,
    emissive: '#0088ff', core: '#00ccff',
    ranged: false, fireInterval: 0, projectileSpeed: 0, projectileDamage: 0,
    preferredRange: 0, wireframe: true,
  },
  phantom: {
    speed: 5.0, baseScale: 0.65, rotSpeed: 0.04,
    contactDamage: 12, contactRange: 1.8,
    emissive: '#00ff88', core: '#00ffaa',
    ranged: true, fireInterval: 3000, projectileSpeed: 22, projectileDamage: 20,
    preferredRange: 12, wireframe: true,
  },
};

export function Enemies() {
  const enemies = useStore((state) => state.enemies);
  const spawnEnemies = useStore((state) => state.spawnEnemies);
  const cameraRef = useRef(new THREE.Vector3());

  // Track camera position every frame
  useFrame((state) => {
    cameraRef.current.copy(state.camera.position);
  });

  // Adaptive endless spawning — relative to player position
  useEffect(() => {
    const interval = setInterval(() => {
      const s = useStore.getState();
      if (s.gamePhase === 'playing') {
        const p = cameraRef.current;
        spawnEnemies([p.x, p.y, p.z]);
      }
    }, 4000); // New enemy every 4 seconds
    return () => clearInterval(interval);
  }, [spawnEnemies]);

  return (
    <>
      {enemies.map((enemy) => (
        <Enemy key={enemy.id} enemy={enemy} />
      ))}
    </>
  );
}

function Enemy({ enemy }: { enemy: EnemyData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const lastThreatAtRef = useRef(0);
  const lastDamageAtRef = useRef(0);
  const lastFireAtRef = useRef(0);
  const chargeStateRef = useRef<'idle' | 'winding' | 'charging'>('idle');
  const chargeTimerRef = useRef(0);
  const teleportTimerRef = useRef(performance.now() + 3000 + Math.random() * 2000);
  
  const traits = ENEMY_TRAITS[enemy.type] ?? ENEMY_TRAITS.swarmer;
  
  // Pre-allocate vectors ONCE — reused every frame (zero GC pressure)
  const vecs = useMemo(() => ({
    dir: new THREE.Vector3(),
    currentPos: new THREE.Vector3(),
    toEnemy: new THREE.Vector3(),
    cameraForward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
  }), []);
  
  // Visual reactions to damage
  const healthRatio = enemy.health / enemy.maxHealth;
  const currentScale = enemy.type === 'juggernaut' ? traits.baseScale * (0.5 + 0.5 * healthRatio) : traits.baseScale;
  
  const intensityMultiplier = enemy.type === 'juggernaut' ? healthRatio : 1;
  const wireframeIntensity = 4 * intensityMultiplier;
  const coreIntensity = 8 * intensityMultiplier;
  // Phantom flickers when about to teleport
  const phantomOpacity = enemy.type === 'phantom' ? (0.4 + 0.6 * Math.abs(Math.sin(Date.now() * 0.005))) : 1;

  useFrame((state) => {
    if (useStore.getState().gamePhase !== 'playing') return;

    if (meshRef.current && rigidBodyRef.current) {
      // Rotate the enemy
      meshRef.current.rotation.x += traits.rotSpeed;
      meshRef.current.rotation.y += traits.rotSpeed * 2;

      const playerPos = state.camera.position;
      const t = rigidBodyRef.current.translation();
      vecs.currentPos.set(t.x, t.y, t.z);
      
      vecs.dir.subVectors(playerPos, vecs.currentPos);
      const distanceToPlayer = vecs.dir.length();

      // --- Threat indicator ---
      if (distanceToPlayer < 13 && performance.now() - lastThreatAtRef.current > 700) {
        vecs.toEnemy.subVectors(vecs.currentPos, playerPos).normalize();
        state.camera.getWorldDirection(vecs.cameraForward);
        vecs.right.crossVectors(vecs.cameraForward, vecs.up).normalize();
        const side = vecs.right.dot(vecs.toEnemy);
        const front = vecs.cameraForward.dot(vecs.toEnemy);
        const intensity = Math.min(1, 1 - distanceToPlayer / 13 + 0.2);
        window.dispatchEvent(new CustomEvent("nova:incoming", { detail: { side, front, intensity } }));
        lastThreatAtRef.current = performance.now();
      }

      // --- Contact damage ---
      const now = performance.now();
      if (distanceToPlayer < traits.contactRange && now - lastDamageAtRef.current > 2000) {
        lastDamageAtRef.current = now;
        useStore.getState().damagePlayer(traits.contactDamage);
        window.dispatchEvent(new CustomEvent("nova:playerHit", { detail: { damage: traits.contactDamage } }));
      }
        
      if (vecs.dir.lengthSq() > 0.001) {
        vecs.dir.normalize();
      } else {
        vecs.dir.set(0, 0, 1);
      }

      // === TYPE-SPECIFIC AI ===
      let moveDir = vecs.dir.clone();
      moveDir.y = 0;
      let speed = traits.speed;

      if (enemy.type === 'charger') {
        // CHARGER: wind up, then burst toward player
        if (chargeStateRef.current === 'idle' && distanceToPlayer < 25) {
          chargeStateRef.current = 'winding';
          chargeTimerRef.current = now;
        }
        if (chargeStateRef.current === 'winding') {
          speed = 0; // pause to wind up
          meshRef.current.position.set(
            (Math.random() - 0.5) * 0.15,
            (Math.random() - 0.5) * 0.15,
            (Math.random() - 0.5) * 0.15
          );
          if (now - chargeTimerRef.current > 1200) {
            chargeStateRef.current = 'charging';
            chargeTimerRef.current = now;
          }
        } else if (chargeStateRef.current === 'charging') {
          speed = traits.speed * 3; // burst forward
          if (now - chargeTimerRef.current > 800 || distanceToPlayer < 2) {
            chargeStateRef.current = 'idle';
          }
        } else {
          speed = traits.speed * 0.5; // slow approach
        }
      } else if (enemy.type === 'bomber' && distanceToPlayer < 8) {
        // BOMBER: stop and vibrate when close
        moveDir.set(0, 0, 0);
        meshRef.current.position.set(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        );
      } else if (enemy.type === 'phantom') {
        // PHANTOM: teleport every ~3s, appear behind player
        if (now > teleportTimerRef.current) {
          teleportTimerRef.current = now + 3000 + Math.random() * 2000;
          // Teleport behind the player at 8-12 unit distance
          const behind = new THREE.Vector3();
          state.camera.getWorldDirection(behind);
          behind.multiplyScalar(-1).normalize();
          const offset = 8 + Math.random() * 4;
          const nx = playerPos.x + behind.x * offset + (Math.random() - 0.5) * 4;
          const nz = playerPos.z + behind.z * offset + (Math.random() - 0.5) * 4;
          rigidBodyRef.current.setTranslation({ x: nx, y: playerPos.y + 1, z: nz }, true);
          rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
          // Fire on teleport
          if (traits.ranged) {
            const fireDir = new THREE.Vector3().subVectors(playerPos, new THREE.Vector3(nx, playerPos.y + 1, nz)).normalize();
            useStore.getState().spawnEnemyProjectile(
              [nx, playerPos.y + 1, nz],
              [fireDir.x * traits.projectileSpeed, fireDir.y * traits.projectileSpeed, fireDir.z * traits.projectileSpeed],
              traits.projectileDamage, traits.emissive
            );
            lastFireAtRef.current = now;
          }
          return;
        }
      } else if (traits.ranged && traits.preferredRange > 0) {
        // RANGED AI: maintain preferred distance
        if (distanceToPlayer < traits.preferredRange * 0.6) {
          moveDir.multiplyScalar(-1); // back away
        } else if (distanceToPlayer > traits.preferredRange * 1.3) {
          // approach (moveDir is already toward player)
        } else {
          // strafe — orbit the player
          const strafe = new THREE.Vector3(-moveDir.z, 0, moveDir.x);
          moveDir.copy(strafe);
          speed = traits.speed * 0.7;
        }
      } else {
        meshRef.current.position.set(0, 0, 0);
      }

      // --- Ranged firing ---
      if (traits.ranged && enemy.type !== 'phantom' && traits.fireInterval > 0 && now - lastFireAtRef.current > traits.fireInterval && distanceToPlayer < 35) {
        lastFireAtRef.current = now;
        const fireDir = new THREE.Vector3().subVectors(playerPos, vecs.currentPos).normalize();
        // Slight inaccuracy so player can dodge
        fireDir.x += (Math.random() - 0.5) * 0.1;
        fireDir.z += (Math.random() - 0.5) * 0.1;
        fireDir.normalize();
        useStore.getState().spawnEnemyProjectile(
          [t.x, t.y, t.z],
          [fireDir.x * traits.projectileSpeed, fireDir.y * traits.projectileSpeed, fireDir.z * traits.projectileSpeed],
          traits.projectileDamage, traits.emissive
        );
      }

      rigidBodyRef.current.setLinvel({
        x: moveDir.x * speed,
        y: t.y < 3 * currentScale ? traits.speed : -0.5,
        z: moveDir.z * speed
      }, true);
    }
  });

  // Core size proportional to body (no oversized sphere)
  const coreRadius = useMemo(() => {
    switch (enemy.type) {
      case 'juggernaut': return 0.5;
      case 'bomber': return 0.4;
      case 'spitter': return 0.3;
      case 'charger': return 0.35;
      case 'shielder': return 0.35;
      case 'phantom': return 0.25;
      default: return 0.35; // swarmer
    }
  }, [enemy.type]);

  return (
    <RigidBody ref={rigidBodyRef} position={enemy.position} type="dynamic" colliders="ball" mass={enemy.type === 'juggernaut' ? 10 : 1} linearDamping={2}>
      <group scale={[currentScale, currentScale, currentScale]}>
        <mesh ref={meshRef} userData={{ isEnemy: true, id: enemy.id }} castShadow receiveShadow>
          {/* Type-specific geometry */}
          {enemy.type === 'swarmer' && <icosahedronGeometry args={[1.2, 0]} />}
          {enemy.type === 'juggernaut' && <octahedronGeometry args={[1.5, 1]} />}
          {enemy.type === 'bomber' && <dodecahedronGeometry args={[1.3, 0]} />}
          {enemy.type === 'spitter' && <torusKnotGeometry args={[0.7, 0.25, 64, 8, 2, 3]} />}
          {enemy.type === 'charger' && <boxGeometry args={[1.6, 0.8, 2.4]} />}
          {enemy.type === 'shielder' && <icosahedronGeometry args={[1.2, 1]} />}
          {enemy.type === 'phantom' && <octahedronGeometry args={[1.1, 0]} />}
          <meshStandardMaterial
            color="#0a0a0a"
            emissive={traits.emissive}
            emissiveIntensity={wireframeIntensity}
            roughness={0.15}
            metalness={0.9}
            wireframe={traits.wireframe}
            transparent={enemy.type === 'phantom'}
            opacity={phantomOpacity}
          />
        </mesh>

        {/* Inner glowing core — proportional */}
        <mesh>
           <sphereGeometry args={[coreRadius, 10, 10]} />
           <meshStandardMaterial 
             color="#000" 
             emissive={traits.core} 
             emissiveIntensity={coreIntensity}
             toneMapped={false}
             transparent={enemy.type === 'phantom'}
             opacity={enemy.type === 'phantom' ? phantomOpacity * 0.8 : 1}
           />
        </mesh>

        {/* Spitter: orbiting energy rings */}
        {enemy.type === 'spitter' && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.1, 0.04, 8, 32]} />
            <meshStandardMaterial color="#000" emissive={traits.emissive} emissiveIntensity={6} toneMapped={false} />
          </mesh>
        )}

        {/* Charger: forward-facing ram spikes */}
        {enemy.type === 'charger' && (
          <>
            <mesh position={[0, 0, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.3, 0.8, 4]} />
              <meshStandardMaterial color="#111" emissive={traits.emissive} emissiveIntensity={5} toneMapped={false} />
            </mesh>
            <mesh position={[0.5, 0, 1.1]} rotation={[Math.PI / 2, 0, 0.3]}>
              <coneGeometry args={[0.15, 0.5, 4]} />
              <meshStandardMaterial color="#111" emissive={traits.emissive} emissiveIntensity={5} toneMapped={false} />
            </mesh>
            <mesh position={[-0.5, 0, 1.1]} rotation={[Math.PI / 2, 0, -0.3]}>
              <coneGeometry args={[0.15, 0.5, 4]} />
              <meshStandardMaterial color="#111" emissive={traits.emissive} emissiveIntensity={5} toneMapped={false} />
            </mesh>
          </>
        )}

        {/* Shielder: hexagonal shield plates */}
        {enemy.type === 'shielder' && (
          <>
            <mesh>
              <icosahedronGeometry args={[1.9, 1]} />
              <meshStandardMaterial color="#001a33" emissive="#0066ff" emissiveIntensity={1.5} transparent opacity={0.08} wireframe />
            </mesh>
            <mesh>
              <icosahedronGeometry args={[2.1, 0]} />
              <meshStandardMaterial color="#003366" emissive="#0088ff" emissiveIntensity={3} transparent opacity={0.12} wireframe />
            </mesh>
          </>
        )}

        {/* Phantom: ghostly outer shell */}
        {enemy.type === 'phantom' && (
          <mesh>
            <octahedronGeometry args={[1.6, 0]} />
            <meshStandardMaterial color="#000" emissive={traits.emissive} emissiveIntensity={2} transparent opacity={phantomOpacity * 0.15} wireframe />
          </mesh>
        )}

        {/* Juggernaut: armored plates */}
        {enemy.type === 'juggernaut' && (
          <mesh>
            <octahedronGeometry args={[1.7, 0]} />
            <meshStandardMaterial color="#0a0a0a" emissive={traits.emissive} emissiveIntensity={1.5} transparent opacity={0.2} wireframe />
          </mesh>
        )}
      </group>
    </RigidBody>
  );
}