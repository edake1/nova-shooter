"use client";

import { useStore, ExplosionType } from "@/store";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useEffect, useState } from "react";
import * as THREE from "three";

// Weapon-class kill effect profiles
type FxProfile = { count: number; speed: number; gravity: number; lifetime: number; size: number; spread: 'sphere' | 'ring' | 'column' | 'burst' };

function getFxProfile(type: ExplosionType): FxProfile {
  switch (type) {
    // KINETIC: sharp shatter fragments
    case 'kinetic':
      return { count: 400, speed: 30, gravity: 25, lifetime: 0.8, size: 120, spread: 'sphere' };
    // ENERGY: white-flash disintegrate, outward scatter
    case 'energy': case 'beam': case 'photon': case 'arc':
      return { count: 600, speed: 20, gravity: 5, lifetime: 1.0, size: 180, spread: 'sphere' };
    // EXPLOSIVE: heavy ragdoll + lots of debris
    case 'explosive': case 'singularity':
      return { count: 800, speed: 35, gravity: 20, lifetime: 1.2, size: 200, spread: 'sphere' };
    // SPREAD: many small pieces popping outward in a ring
    case 'spread': case 'sonic':
      return { count: 500, speed: 25, gravity: 15, lifetime: 0.7, size: 100, spread: 'ring' };
    // TECH: freeze/glitch — slow drift, column shape
    case 'tech': case 'nano':
      return { count: 400, speed: 8, gravity: 2, lifetime: 1.5, size: 160, spread: 'column' };
    // FORBIDDEN: dramatic slow-mo, radial burst
    case 'forbidden': case 'warp':
      return { count: 1200, speed: 15, gravity: 3, lifetime: 2.0, size: 250, spread: 'burst' };
    // MISC
    case 'force': case 'swarm': case 'whip':
      return { count: 500, speed: 22, gravity: 12, lifetime: 1.0, size: 140, spread: 'sphere' };
    default:
      return { count: 500, speed: 25, gravity: 15, lifetime: 1.0, size: 150, spread: 'sphere' };
  }
}

function ExplosionEffect({ position, color, id, type }: { position: [number, number, number], color: string, id: number, type: ExplosionType }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const removeExplosion = useStore((state) => state.removeExplosion);
  const fx = getFxProfile(type);

  const [arrays] = useState(() => {
    const pos = new Float32Array(fx.count * 3);
    const vel = new Float32Array(fx.count * 3);
    const lts = new Float32Array(fx.count);
    
    for (let i = 0; i < fx.count; i++) {
        pos[i * 3] = position[0];
        pos[i * 3 + 1] = position[1];
        pos[i * 3 + 2] = position[2];
        
        const speed = Math.random() * fx.speed;
        let vx: number, vy: number, vz: number;

        if (fx.spread === 'ring') {
          // Horizontal ring burst
          const theta = Math.random() * 2 * Math.PI;
          vx = speed * Math.cos(theta);
          vy = (Math.random() - 0.3) * speed * 0.3;
          vz = speed * Math.sin(theta);
        } else if (fx.spread === 'column') {
          // Vertical column — mostly upward drift
          const theta = Math.random() * 2 * Math.PI;
          const r = Math.random() * speed * 0.3;
          vx = r * Math.cos(theta);
          vy = speed * (0.5 + Math.random() * 0.5);
          vz = r * Math.sin(theta);
        } else if (fx.spread === 'burst') {
          // Radial burst — even distribution, slower for dramatic effect
          const theta = Math.random() * 2 * Math.PI;
          const phi = Math.acos(2 * Math.random() - 1);
          const s = speed * (0.3 + Math.random() * 0.7);
          vx = s * Math.sin(phi) * Math.cos(theta);
          vy = s * Math.sin(phi) * Math.sin(theta);
          vz = s * Math.cos(phi);
        } else {
          // Default sphere
          const theta = Math.random() * 2 * Math.PI;
          const phi = Math.acos(2 * Math.random() - 1);
          vx = speed * Math.sin(phi) * Math.cos(theta);
          vy = speed * Math.sin(phi) * Math.sin(theta);
          vz = speed * Math.cos(phi);
        }

        vel[i * 3] = vx;
        vel[i * 3 + 1] = vy;
        vel[i * 3 + 2] = vz;
        
        lts[i] = (0.3 + Math.random()) * fx.lifetime;
    }
    return [pos, vel, lts];
  });
  const [positions, velocities, lifetimes] = arrays;

  // Clean up explosion from global state after duration
  useEffect(() => {
    const timer = setTimeout(() => removeExplosion(id), fx.lifetime * 1200);
    return () => clearTimeout(timer);
  }, [id, removeExplosion, fx.lifetime]);

  useFrame((state, delta) => {
    if (useStore.getState().isPaused) return;
    if (materialRef.current) {
        materialRef.current.uniforms.uTime.value += delta;
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(color) },
    uGravity: { value: fx.gravity },
    uSize: { value: fx.size },
  }), [color, fx.gravity, fx.size]);

  const vertexShader = `
    uniform float uTime;
    uniform float uGravity;
    uniform float uSize;
    attribute vec3 velocity;
    attribute float lifetime;
    varying float vAlpha;
    varying float vLifetime;

    void main() {
      vec3 newPos = position + velocity * uTime;
      
      // Gravity
      newPos.y -= uGravity * uTime * uTime * 0.5;
      
      // Floor collision
      if (newPos.y < 0.1) {
          newPos.y = 0.1 + (0.1 - newPos.y) * 0.5; 
      }

      vAlpha = max(0.0, 1.0 - (uTime / lifetime));
      
      vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      gl_PointSize = (uSize / -mvPosition.z) * vAlpha;
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
        <ExplosionEffect key={exp.id} id={exp.id} position={exp.position} color={exp.color} type={exp.type} />
      ))}
    </>
  );
}