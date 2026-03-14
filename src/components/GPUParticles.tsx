"use client";

import { useStore } from "@/store";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useEffect, useState } from "react";
import * as THREE from "three";

const PARTICLES_PER_EXPLOSION = 5000;

function ExplosionEffect({ position, color, id }: { position: [number, number, number], color: string, id: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const removeExplosion = useStore((state) => state.removeExplosion);

  const [arrays] = useState(() => {
    const pos = new Float32Array(PARTICLES_PER_EXPLOSION * 3);
    const vel = new Float32Array(PARTICLES_PER_EXPLOSION * 3);
    const lts = new Float32Array(PARTICLES_PER_EXPLOSION);
    
    for (let i = 0; i < PARTICLES_PER_EXPLOSION; i++) {
        pos[i * 3] = position[0];
        pos[i * 3 + 1] = position[1];
        pos[i * 3 + 2] = position[2];
        
        const speed = Math.random() * 25;
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        vel[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
        vel[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
        vel[i * 3 + 2] = speed * Math.cos(phi);
        
        lts[i] = 0.5 + Math.random() * 1.5;
    }
    return [pos, vel, lts];
  });
  const [positions, velocities, lifetimes] = arrays;

  // Clean up explosion from global state after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => removeExplosion(id), 2000);
    return () => clearTimeout(timer);
  }, [id, removeExplosion]);

  useFrame((state, delta) => {
    if (useStore.getState().isPaused) return;
    if (materialRef.current) {
        materialRef.current.uniforms.uTime.value += delta;
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(color) }
  }), [color]);

  // Completely handled by the GPU - no CPU loops
  const vertexShader = `
    uniform float uTime;
    attribute vec3 velocity;
    attribute float lifetime;
    varying float vAlpha;
    varying float vLifetime;

    void main() {
      // Basic Integration: pos = initial_pos + velocity * time
      vec3 newPos = position + velocity * uTime;
      
      // Gravity affect over time: 0.5 * g * t^2
      newPos.y -= 15.0 * uTime * uTime * 0.5;
      
      // Floor collision - simple bounce
      if (newPos.y < 0.1) {
          newPos.y = 0.1 + (0.1 - newPos.y) * 0.5; 
      }

      // Fade out based on calculated particle lifetime
      vAlpha = max(0.0, 1.0 - (uTime / lifetime));
      
      vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Size scales as it gets further, but also diminishes as it fades
      gl_PointSize = (150.0 / -mvPosition.z) * vAlpha;
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor;
    varying float vAlpha;

    void main() {
      if (vAlpha <= 0.0) discard;
      
      // Makes the particle circular instead of a default square
      float dist = distance(gl_PointCoord, vec2(0.5));
      if (dist > 0.5) discard;
      
      // Core is very bright white, edge bleeds into the specified color
      float intensity = (0.5 - dist) * 2.0;
      vec3 finalColor = mix(uColor, vec3(1.0), intensity * 0.8);
      
      gl_FragColor = vec4(finalColor, vAlpha * intensity * 2.0);
    }
  `;

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-velocity" args={[velocities, 3]} />
        <bufferAttribute attach="attributes-lifetime" args={[lifetimes, 1]} />
      </bufferGeometry>
      <shaderMaterial 
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </points>
  );
}

export function GPUParticles() {
  const explosions = useStore((state) => state.explosions);
  return (
    <>
      {explosions.map((exp) => (
        <ExplosionEffect key={exp.id} id={exp.id} position={exp.position} color={exp.color} />
      ))}
    </>
  );
}