import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore, LootDrop, LOOT_CONFIG } from "@/store";
import * as THREE from "three";

const DESPAWN_TIME = 15000; // 15 seconds
const COLLECT_RANGE = 3.0;
const MAGNET_RANGE = 6.0;

// Geometry per loot type
const LOOT_GEOMETRY: Record<string, { args: [number, number, number?]; type: 'octahedron' | 'dodecahedron' | 'icosahedron' }> = {
  health:       { args: [0.4, 0],    type: 'octahedron' },
  shield:       { args: [0.35, 0],   type: 'dodecahedron' },
  damage_boost: { args: [0.35, 0],   type: 'icosahedron' },
  speed_boost:  { args: [0.3, 0],    type: 'icosahedron' },
  ammo_surge:   { args: [0.3, 0],    type: 'dodecahedron' },
  intel_cache:  { args: [0.35, 0],   type: 'octahedron' },
};

export function LootDrops() {
  const lootDrops = useStore((s) => s.lootDrops);
  return (
    <>
      {lootDrops.map((drop) => (
        <LootPickup key={drop.id} drop={drop} />
      ))}
    </>
  );
}

function LootPickup({ drop }: { drop: LootDrop }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const posRef = useRef(new THREE.Vector3(...drop.position));
  const cfg = LOOT_CONFIG[drop.type];
  const geo = LOOT_GEOMETRY[drop.type] ?? LOOT_GEOMETRY.health;

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const store = useStore.getState();
    if (store.gamePhase !== 'playing') return;

    const now = performance.now();
    const age = now - drop.spawnedAt;

    // Despawn after 15s
    if (age > DESPAWN_TIME) {
      store.removeLootDrop(drop.id);
      return;
    }

    // Bob up and down
    const baseY = drop.position[1];
    const bobY = baseY + Math.sin(now * 0.003) * 0.3;
    posRef.current.y = bobY;

    // Spin
    meshRef.current.rotation.y += delta * 2;
    meshRef.current.rotation.x += delta * 0.5;

    // Magnetic pull toward player
    const playerPos = state.camera.position;
    const dist = posRef.current.distanceTo(playerPos);

    if (dist < COLLECT_RANGE) {
      store.collectLoot(drop.id);
      return;
    }

    if (dist < MAGNET_RANGE) {
      const pullStrength = (1 - dist / MAGNET_RANGE) * 8 * delta;
      posRef.current.lerp(playerPos, pullStrength);
    }

    // Fade when about to despawn (last 3s)
    const fadeStart = DESPAWN_TIME - 3000;
    const opacity = age > fadeStart ? 1 - (age - fadeStart) / 3000 : 1;

    meshRef.current.position.copy(posRef.current);

    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat.opacity !== undefined) {
      mat.opacity = opacity;
    }
  });

  return (
    <mesh ref={meshRef} position={drop.position}>
      {geo.type === 'octahedron' && <octahedronGeometry args={geo.args as [number, number]} />}
      {geo.type === 'dodecahedron' && <dodecahedronGeometry args={geo.args as [number, number]} />}
      {geo.type === 'icosahedron' && <icosahedronGeometry args={geo.args as [number, number]} />}
      <meshStandardMaterial
        color={cfg.color}
        emissive={cfg.color}
        emissiveIntensity={3}
        transparent
        opacity={1}
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  );
}
