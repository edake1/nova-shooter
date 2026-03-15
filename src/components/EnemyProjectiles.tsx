"use client";
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useStore, EnemyProjectile } from "@/store";
import * as THREE from "three";

const TICK_RATE = 1 / 60; // fixed step size for position updates

function Projectile({ proj }: { proj: EnemyProjectile }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const posRef = useRef(new THREE.Vector3(...proj.position));

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, TICK_RATE * 3); // clamp to avoid huge jumps
    posRef.current.x += proj.velocity[0] * dt;
    posRef.current.y += proj.velocity[1] * dt;
    posRef.current.z += proj.velocity[2] * dt;
    // Write back so tick collision check uses updated positions
    proj.position[0] = posRef.current.x;
    proj.position[1] = posRef.current.y;
    proj.position[2] = posRef.current.z;
    meshRef.current.position.copy(posRef.current);
  });

  return (
    <mesh ref={meshRef} position={posRef.current}>
      <sphereGeometry args={[0.25, 6, 6]} />
      <meshStandardMaterial
        color={proj.color}
        emissive={proj.color}
        emissiveIntensity={6}
        toneMapped={false}
      />
    </mesh>
  );
}

export function EnemyProjectiles() {
  const projectiles = useStore((s) => s.enemyProjectiles);
  const tickEnemyProjectiles = useStore((s) => s.tickEnemyProjectiles);
  const { camera } = useThree();

  // Run collision tick every frame
  useFrame(() => {
    if (useStore.getState().gamePhase !== 'playing') return;
    const p = camera.position;
    tickEnemyProjectiles([p.x, p.y, p.z]);
  });

  return (
    <>
      {projectiles.map((proj) => (
        <Projectile key={proj.id} proj={proj} />
      ))}
    </>
  );
}
