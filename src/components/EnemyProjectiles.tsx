"use client";
import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useStore, EnemyProjectile } from "@/store";
import * as THREE from "three";

const TICK_RATE = 1 / 60; // fixed step size for position updates
const TRAIL_LENGTH = 5;

function Projectile({ proj }: { proj: EnemyProjectile }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.InstancedMesh>(null);
  const posRef = useRef(new THREE.Vector3(...proj.position));
  const trailPositions = useRef<THREE.Vector3[]>(
    Array.from({ length: TRAIL_LENGTH }, () => new THREE.Vector3(...proj.position))
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, TICK_RATE * 3);
    posRef.current.x += proj.velocity[0] * dt;
    posRef.current.y += proj.velocity[1] * dt;
    posRef.current.z += proj.velocity[2] * dt;
    proj.position[0] = posRef.current.x;
    proj.position[1] = posRef.current.y;
    proj.position[2] = posRef.current.z;
    meshRef.current.position.copy(posRef.current);

    // Update trail
    const trail = trailPositions.current;
    for (let i = trail.length - 1; i > 0; i--) {
      trail[i].copy(trail[i - 1]);
    }
    trail[0].copy(posRef.current);

    if (trailRef.current) {
      for (let i = 0; i < TRAIL_LENGTH; i++) {
        const s = 1 - (i + 1) / (TRAIL_LENGTH + 1);
        dummy.position.copy(trail[i]);
        dummy.scale.setScalar(s * 0.6);
        dummy.updateMatrix();
        trailRef.current.setMatrixAt(i, dummy.matrix);
      }
      trailRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group userData={{ isEnemyProjectile: true, id: proj.id }}>
      {/* Core projectile */}
      <mesh ref={meshRef} position={posRef.current}>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshStandardMaterial
          color={proj.color}
          emissive={proj.color}
          emissiveIntensity={10}
          toneMapped={false}
        />
      </mesh>
      {/* Glow */}
      <mesh position={posRef.current}>
        <sphereGeometry args={[0.2, 6, 6]} />
        <meshStandardMaterial
          color={proj.color}
          emissive={proj.color}
          emissiveIntensity={3}
          transparent
          opacity={0.25}
          toneMapped={false}
        />
      </mesh>
      {/* Trail instances */}
      <instancedMesh ref={trailRef} args={[undefined, undefined, TRAIL_LENGTH]}>
        <sphereGeometry args={[0.08, 4, 4]} />
        <meshStandardMaterial
          color={proj.color}
          emissive={proj.color}
          emissiveIntensity={4}
          transparent
          opacity={0.5}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
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
