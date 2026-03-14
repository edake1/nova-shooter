import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
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
  
  useFrame((state) => {
    if (meshRef.current) {
      // Bob up and down
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2 + id) * 0.5 + 4;
      
      // Slowly rotate the enemy to look sinister
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.02;
    }
  });

  return (
    <RigidBody position={position} type="fixed" colliders="ball">
      <mesh ref={meshRef} userData={{ isEnemy: true, id }} castShadow receiveShadow>
        {/* We use an Icosahedron to make them look like sharp, crystalline drones */}
        <icosahedronGeometry args={[1.5, 0]} />
        
        {/* Emissive material that reacts to the Bloom post-processing! */}
        <meshStandardMaterial 
          color="#111" 
          emissive="#ff0044" 
          emissiveIntensity={2} 
          roughness={0.2} 
          metalness={1.0} 
          wireframe
        />
      </mesh>
      
      {/* Inner glowing core */}
      <mesh>
         <sphereGeometry args={[0.8, 16, 16]} />
         <meshStandardMaterial color="#000" emissive="#ff0040" emissiveIntensity={5} />
      </mesh>
    </RigidBody>
  );
}