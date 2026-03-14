import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useStore } from "@/store";

export function Weapon() {
  const { camera, scene } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const weaponMeshRef = useRef<THREE.Mesh>(null);
  const [recoil, setRecoil] = useState(0);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      // Only shoot if the pointer is locked
      if (document.pointerLockElement) {
        if (e.button === 0) {
          // Trigger recoil & flash
          setRecoil(1);
          setFlash(true);
          setTimeout(() => setFlash(false), 50);
          
          // Setup three.js raycast from the exact center of the screen
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
          
          // Cast against all visual meshes
          const intersects = raycaster.intersectObjects(scene.children, true);
          
          if (intersects.length > 0) {
            // Find the closest visually hit object
            const hit = intersects[0];
            
            // Check if what we hit was tagged as an enemy
            let obj: THREE.Object3D | null = hit.object;
            while (obj) {
              if (obj.userData?.isEnemy) {
                // Remove the enemy from global state and grant score
                useStore.getState().removeEnemy(obj.userData.id);
                useStore.getState().incScore(100);
                
                // Spawn Physical GPU Debris
                const pos = new THREE.Vector3();
                obj.getWorldPosition(pos);
                useStore.getState().addDebris([pos.x, pos.y, pos.z], "#ff0044", 8);

                break; // Stop at the first hit
              }
              obj = obj.parent;
            }
          }
        }
      }
    };
    
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [camera, scene]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Attach the weapon exactly to the camera's position and rotation
    groupRef.current.position.copy(camera.position);
    groupRef.current.rotation.copy(camera.rotation);
    
    // Recover from recoil slowly over frames
    if (recoil > 0) {
      setRecoil((r) => Math.max(0, r - delta * 5));
    }
    
    if (weaponMeshRef.current) {
      // Linear interpolation to make the kickback look snappy then smooth
      weaponMeshRef.current.position.z = THREE.MathUtils.lerp(
        weaponMeshRef.current.position.z,
        recoil > 0 ? -0.1 : -0.4,
        delta * 15
      );
      // Pitch rotation for the barrel jumping up
      weaponMeshRef.current.rotation.x = THREE.MathUtils.lerp(
        weaponMeshRef.current.rotation.x,
        recoil > 0 ? 0.3 : 0,
        delta * 15
      );
    }
  });

  return (
    <group ref={groupRef}>
      {/* Positioned bottom-right of the screen */}
      <mesh ref={weaponMeshRef} position={[0.3, -0.3, -0.4]} castShadow>
        <boxGeometry args={[0.08, 0.15, 0.6]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
        
        {/* Glowing cyan barrel strip */}
        <mesh position={[0, 0.08, 0.1]}>
           <boxGeometry args={[0.02, 0.05, 0.4]} />
           <meshStandardMaterial color="#0ff" emissive="#00ffff" emissiveIntensity={2} />
        </mesh>

        {/* Huge laser trail effect */}
        {flash && (
          <mesh position={[0, 0, -50]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 100]} />
            <meshBasicMaterial color="#00ffff" />
          </mesh>
        )}
      </mesh>
    </group>
  );
}