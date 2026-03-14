"use client";

import { useStore } from "@/store";
import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";

export function Debris() {
  const debris = useStore((state) => state.debris);

  // We map over debris, creating physically active cubes
  return (
    <>
      {debris.map((p) => (
        <RigidBody key={p.id} colliders="cuboid" position={p.position} linearVelocity={[(Math.random() - 0.5) * 10, Math.random() * 10, (Math.random() - 0.5) * 10]} angularVelocity={[Math.random() * 10, Math.random() * 10, Math.random() * 10]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={2} roughness={0.1} metalness={0.9} />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
}