import { useRef, useEffect, useState } from "react";
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
      spawnEnemies();
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
  
  // Set distinct traits based on enemy type
  const [traits] = useState(() => {
    switch (enemy.type) {
      case 'juggernaut': return { speed: 1.5, baseScale: 3, rotSpeed: 0.005 };
      case 'bomber': return { speed: 4, baseScale: 1.5, rotSpeed: 0.05 };
      case 'swarmer': default: return { speed: 3.5 + Math.random() * 2, baseScale: 1, rotSpeed: 0.02 };
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
    if (meshRef.current && rigidBodyRef.current) {
      // Rotate the enemy
      meshRef.current.rotation.x += traits.rotSpeed;
      meshRef.current.rotation.y += traits.rotSpeed * 2;

      // Swarm AI: Move towards the player's camera position dynamically
      const playerPos = state.camera.position;
      const currentPos = rigidBodyRef.current.translation();
      
      const dir = new THREE.Vector3()
        .subVectors(playerPos, new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z));
      
      const distanceToPlayer = dir.length();
        
      if (dir.lengthSq() > 0.001) {
        dir.normalize();
      } else {
        dir.set(0, 0, 1);
      }
      
      // Bombers stop at a certain distance to "charge" (we'll add detonation later)
      if (enemy.type === 'bomber' && distanceToPlayer < 8) {
         dir.set(0, 0, 0); 
         // Shake bomber furiously as if charging
         meshRef.current.position.set(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
         );
      } else {
         meshRef.current.position.set(0,0,0);
      }
      
      // Preserve Y to let physics gravity handle bounding
      dir.y = 0;

      // Apply linear velocity towards player
      rigidBodyRef.current.setLinvel({
        x: dir.x * traits.speed,
        y: currentPos.y < 3 * currentScale ? traits.speed : -0.5, // hovering using physics
        z: dir.z * traits.speed
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
           <sphereGeometry args={[0.8, 16, 16]} />
           <meshStandardMaterial color="#000" emissive={coreColor} emissiveIntensity={coreIntensity} />
        </mesh>
      </group>
    </RigidBody>
  );
}