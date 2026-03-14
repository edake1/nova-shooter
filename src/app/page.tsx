"use client";

import { Canvas } from "@react-three/fiber";
import { PointerLockControls, Grid, Stars, MeshReflectorMaterial, Environment } from "@react-three/drei";
import { Physics, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Suspense } from "react";
import { Player } from "@/components/Player";
import { Weapon } from "@/components/Weapon";
import { Enemies } from "@/components/Enemies";
import { GPUParticles } from "@/components/GPUParticles";
import { useStore } from "@/store";

export default function Game() {
  const score = useStore((state) => state.score);

  return (
    <main className="w-screen h-screen relative bg-[#050510] font-sans selection:bg-cyan-900 overflow-hidden">
      <Canvas shadows camera={{ fov: 75 }}>
        {/* Environment Settings */}
        <color attach="background" args={["#030308"]} />
        <fog attach="fog" args={["#030308", 5, 40]} />
        <ambientLight intensity={0.2} />
        <directionalLight castShadow position={[10, 20, 10]} intensity={1.5} color="#4455ff" />
        <pointLight position={[-10, -10, -10]} intensity={2} color="#ff0044" />

        <Suspense fallback={null}>
          <Physics debug={false}>
            {/* Player & Weapon */}
            <Player />
            <Weapon />
            
            {/* Enemies */}
            <Enemies />

            {/* True GPU Particles */}
            <GPUParticles />

            {/* Giant Monolith Obstacles */}
            <RigidBody type="fixed" position={[0, 4, -15]} colliders="cuboid">
              <mesh castShadow receiveShadow>
                <boxGeometry args={[4, 10, 4]} />
                <meshStandardMaterial color="#000" roughness={0.1} metalness={0.9} />
              </mesh>
            </RigidBody>
            <RigidBody type="fixed" position={[12, 3, -5]} colliders="cuboid">
              <mesh castShadow receiveShadow>
                <boxGeometry args={[3, 6, 3]} />
                <meshStandardMaterial color="#000" roughness={0.1} metalness={0.9} />
              </mesh>
            </RigidBody>

            {/* Highly Reflective Mirror Floor (SSR) */}
            <RigidBody type="fixed" colliders="cuboid" position={[0, -0.5, 0]}>
              <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
                <planeGeometry args={[200, 200]} />
                <MeshReflectorMaterial
                  blur={[300, 100]}
                  resolution={1024}
                  mixBlur={1}
                  mixStrength={50}
                  roughness={1}
                  depthScale={1.2}
                  minDepthThreshold={0.4}
                  maxDepthThreshold={1.4}
                  color="#151520"
                  metalness={0.5}
                  mirror={1}
                />
              </mesh>
              {/* Invisible floor collider payload */}
              <mesh visible={false}>
                <boxGeometry args={[200, 1, 200]} />
              </mesh>
            </RigidBody>
          </Physics>

          {/* Environment Global Illumination Map */}
          <Environment preset="night" />

          {/* Neon Grid overlaying the floor */}
          <Grid 
            position={[0, 0.01, 0]} 
            args={[200, 200]} 
            cellColor="#00ffff" 
            sectionColor="#ff00ff" 
            cellThickness={0.5}
            sectionThickness={1.0}
            fadeDistance={40} 
          />

          <Stars radius={50} depth={50} count={3000} factor={2} fade speed={0.5} />
        </Suspense>

        {/* Post-Processing Pipeline! The 2026 Tech */}
        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} />
          <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.002, 0.002)} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
          <Noise opacity={0.03} />
        </EffectComposer>

        <PointerLockControls />
      </Canvas>

      {/* Cyberpunk HUD Overlay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {/* Dynamic Crosshair */}
        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_10px_#00ffff]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-cyan-400/50 rounded-full animate-[spin_4s_linear_infinite]" />
      </div>
      
      <div className="absolute top-8 left-8 pointer-events-none flex flex-col gap-4 z-50">
        {/* God Tier Labels & Glassmorphism */}
        <div className="glass-panel p-6 w-80">
          <h1 className="font-orbitron text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 font-black text-5xl tracking-tighter italic glass-text">
            NOVA
          </h1>
          <h2 className="text-xl font-bold tracking-[0.3em] text-cyan-500 mt-1">SYSTEM ONLINE</h2>
          
          <div className="mt-6 border-t border-cyan-500/30 pt-4 flex flex-col gap-3">
             <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-cyan-500/10">
                <span className="text-cyan-400/70 font-mono text-xs uppercase">Target Intel</span>
                <span className="text-cyan-300 font-mono font-bold">{score.toString().padStart(4, '0')} PTS</span>
             </div>
             
             <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-purple-500/10">
                <span className="text-purple-400/70 font-mono text-xs uppercase">Threat Level</span>
                <span className="text-purple-400 font-mono font-bold animate-pulse glass-text-secondary">CRITICAL</span>
             </div>
          </div>
          
          <div className="mt-4 text-cyan-400/50 font-mono text-[10px] tracking-widest uppercase">
            SYS.OP: W A S D / SPACE / CLICK
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-8 right-8 pointer-events-none">
         <div className="text-cyan-400 font-mono text-xs tracking-widest text-right uppercase">Weapon // Plasmacaster</div>
         <div className="text-white font-black text-3xl italic tracking-tighter text-right">CAPACITY: ∞</div>
      </div>
    </main>
  );
}
