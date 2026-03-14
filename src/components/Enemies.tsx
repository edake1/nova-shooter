import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import { useStore } from "@/store";
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
        <Enemy key={enemy.id} id={enemy.id} position={enemy.position} />
      ))}
    </>
  );
}

function Enemy({ id, position }: { id: number; position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const [speed] = useState(() => Math.random() * 2 + 1); // Random speed per unit
  
  useFrame((state) => {
    if (meshRef.current && rigidBodyRef.current) {
      // Rotate the enemy to look sinister
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.02;

      // Swarm AI: Move towards the player's camera position dynamically
      const playerPos = state.camera.position;
      const currentPos = rigidBodyRef.current.translation();
      
      const dir = new THREE.Vector3()
        .subVectors(playerPos, new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z))
        .normalize();
      
      // Preserve Y to let physics gravity handle bounding
      dir.y = 0;

      // Apply linear velocity towards player
      rigidBodyRef.current.setLinvel({
        x: dir.x * speed,
        y: currentPos.y < 3 ? speed : -0.5, // gentle bobbing/hovering using physics
        z: dir.z * speed
      }, true);
    }
  });

  return (
    <RigidBody ref={rigidBodyRef} position={position} type="dynamic" colliders="ball" mass={1} linearDamping={2}>
      <mesh ref={meshRef} userData={{ isEnemy: true, id }} castShadow receiveShadow>
        <icosahedronGeometry args={[1.5, 0]} />
        <meshStandardMaterial 
          color="#111" 
          emissive="#ff0044" 
          emissiveIntensity={4} 
          roughness={0.2} 
          metalness={1.0} 
          wireframe
        />
      </mesh>
      
      {/* Inner glowing core */}
      <mesh>
         <sphereGeometry args={[0.8, 16, 16]} />
         <meshStandardMaterial color="#000" emissive="#ff0040" emissiveIntensity={8} />
      </mesh>
    </RigidBody>
  );
}