import { useRef, useEffect, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import { useStore, EnemyData } from "@/store";
import * as THREE from "three";

export function Enemies() {
  const enemies = useStore((state) => state.enemies);
  const spawnEnemies = useStore((state) => state.spawnEnemies);

  // Adaptive endless spawning
  useEffect(() => {
    const interval = setInterval(() => {
      if (!useStore.getState().isPaused) {
        spawnEnemies();
      }
    }, 3000); // New enemy every 3 seconds
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
  
  // Pre-allocate vectors ONCE — reused every frame (zero GC pressure)
  const vecs = useMemo(() => ({
    dir: new THREE.Vector3(),
    currentPos: new THREE.Vector3(),
    toEnemy: new THREE.Vector3(),
    cameraForward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
  }), []);
  
  // Contact damage per enemy type
  const contactDamage = enemy.type === 'juggernaut' ? 15 : enemy.type === 'bomber' ? 25 : 8;
  const contactRange = enemy.type === 'juggernaut' ? 3.5 : enemy.type === 'bomber' ? 2.5 : 2.0;
  
  // Set distinct traits based on enemy type
  const [traits] = useState(() => {
    switch (enemy.type) {
      case 'juggernaut': return { speed: 3.5, baseScale: 1.8, rotSpeed: 0.005 };
      case 'bomber': return { speed: 6.5, baseScale: 0.9, rotSpeed: 0.05 };
      case 'swarmer': default: return { speed: 5.5 + Math.random() * 2, baseScale: 0.5, rotSpeed: 0.02 };
    }
  });
  
  // Visual reactions to damage
  const healthRatio = enemy.health / enemy.maxHealth;
  const currentScale = enemy.type === 'juggernaut' ? traits.baseScale * (0.5 + 0.5 * healthRatio) : traits.baseScale;
  
  const emissiveColor = enemy.type === 'swarmer' ? '#ff0044' : enemy.type === 'juggernaut' ? '#0088ff' : '#ffaa00';
  const coreColor = enemy.type === 'swarmer' ? '#ff0040' : enemy.type === 'juggernaut' ? '#00ccff' : '#ff4400';
  const intensityMultiplier = enemy.type === 'juggernaut' ? healthRatio : 1;
  const wireframeIntensity = 4 * intensityMultiplier;
  const coreIntensity = 8 * intensityMultiplier;

  useFrame((state) => {
    if (useStore.getState().isPaused) return;

    if (meshRef.current && rigidBodyRef.current) {
      // Rotate the enemy
      meshRef.current.rotation.x += traits.rotSpeed;
      meshRef.current.rotation.y += traits.rotSpeed * 2;

      // Swarm AI: Move towards the player's camera position dynamically
      const playerPos = state.camera.position;
      const t = rigidBodyRef.current.translation();
      vecs.currentPos.set(t.x, t.y, t.z);
      
      vecs.dir.subVectors(playerPos, vecs.currentPos);
      const distanceToPlayer = vecs.dir.length();

      if (distanceToPlayer < 13 && performance.now() - lastThreatAtRef.current > 700) {
        vecs.toEnemy.subVectors(vecs.currentPos, playerPos).normalize();
        state.camera.getWorldDirection(vecs.cameraForward);
        vecs.right.crossVectors(vecs.cameraForward, vecs.up).normalize();

        const side = vecs.right.dot(vecs.toEnemy);
        const front = vecs.cameraForward.dot(vecs.toEnemy);
        const intensity = Math.min(1, 1 - distanceToPlayer / 13 + 0.2);

        window.dispatchEvent(new CustomEvent("nova:incoming", {
          detail: { side, front, intensity }
        }));

        lastThreatAtRef.current = performance.now();
      }

      // Contact damage — hurt player when in melee range (throttled to 1 hit/sec)
      const now = performance.now();
      if (distanceToPlayer < contactRange && now - lastDamageAtRef.current > 1000) {
        lastDamageAtRef.current = now;
        useStore.getState().damagePlayer(contactDamage);
        window.dispatchEvent(new CustomEvent("nova:playerHit", { detail: { damage: contactDamage } }));
      }
        
      if (vecs.dir.lengthSq() > 0.001) {
        vecs.dir.normalize();
      } else {
        vecs.dir.set(0, 0, 1);
      }
      
      // Bombers stop at a certain distance to "charge"
      if (enemy.type === 'bomber' && distanceToPlayer < 8) {
         vecs.dir.set(0, 0, 0); 
         meshRef.current.position.set(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
         );
      } else {
         meshRef.current.position.set(0, 0, 0);
      }
      
      vecs.dir.y = 0;

      rigidBodyRef.current.setLinvel({
        x: vecs.dir.x * traits.speed,
        y: t.y < 3 * currentScale ? traits.speed : -0.5,
        z: vecs.dir.z * traits.speed
      }, true);
    }
  });

  return (
    <RigidBody ref={rigidBodyRef} position={enemy.position} type="dynamic" colliders="ball" mass={enemy.type === 'juggernaut' ? 10 : 1} linearDamping={2}>
      <group scale={[currentScale, currentScale, currentScale]}>
        <mesh ref={meshRef} userData={{ isEnemy: true, id: enemy.id }} castShadow receiveShadow>
          {enemy.type === 'juggernaut' ? <octahedronGeometry args={[1.5, 0]} /> :
           enemy.type === 'bomber' ? <dodecahedronGeometry args={[1.5, 0]} /> :
           <icosahedronGeometry args={[1.5, 0]} />}
          
          <meshStandardMaterial 
            color="#111" 
            emissive={emissiveColor} 
            emissiveIntensity={wireframeIntensity} 
            roughness={0.2} 
            metalness={1.0} 
            wireframe={enemy.type !== 'bomber'}
          />
        </mesh>
        
        {/* Inner glowing core */}
        <mesh>
           <sphereGeometry args={[0.8, 8, 8]} />
           <meshStandardMaterial color="#000" emissive={coreColor} emissiveIntensity={coreIntensity} />
        </mesh>
      </group>
    </RigidBody>
  );
}