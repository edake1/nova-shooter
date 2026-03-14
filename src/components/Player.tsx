import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, useRapier, RapierRigidBody, CapsuleCollider } from "@react-three/rapier";
import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";

const SPEED = 5;
const JUMP_FORCE = 5;

const useKeyControls = () => {
  const [movement, setMovement] = useState({ forward: false, backward: false, left: false, right: false, jump: false });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyW") setMovement((m) => ({ ...m, forward: true }));
      if (e.code === "KeyS") setMovement((m) => ({ ...m, backward: true }));
      if (e.code === "KeyA") setMovement((m) => ({ ...m, left: true }));
      if (e.code === "KeyD") setMovement((m) => ({ ...m, right: true }));
      if (e.code === "Space") setMovement((m) => ({ ...m, jump: true }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyW") setMovement((m) => ({ ...m, forward: false }));
      if (e.code === "KeyS") setMovement((m) => ({ ...m, backward: false }));
      if (e.code === "KeyA") setMovement((m) => ({ ...m, left: false }));
      if (e.code === "KeyD") setMovement((m) => ({ ...m, right: false }));
      if (e.code === "Space") setMovement((m) => ({ ...m, jump: false }));
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return movement;
};

export function Player() {
  const { forward, backward, left, right, jump } = useKeyControls();
  const playerRef = useRef<RapierRigidBody>(null);
  const { camera } = useThree();

  const frontVector = useMemo(() => new THREE.Vector3(), []);
  const sideVector = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!playerRef.current) return;

    // 1. Move the camera to the player's 'eyes'
    const position = playerRef.current.translation();
    camera.position.set(position.x, position.y + 0.8, position.z);

    // 2. Calculate movement directions relative to where camera is looking
    frontVector.set(0, 0, Number(backward) - Number(forward));
    sideVector.set(Number(left) - Number(right), 0, 0);

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(SPEED)
      .applyEuler(camera.rotation);

    // 3. Apply walking physics
    const linvel = playerRef.current.linvel();
    playerRef.current.setLinvel(
      { x: direction.x, y: linvel.y, z: direction.z },
      true
    );

    // 4. Handle jumping (Basic: check if Y velocity is very low, meaning we are on the ground)
    if (jump && Math.abs(linvel.y) < 0.1) {
      playerRef.current.setLinvel({ x: linvel.x, y: JUMP_FORCE, z: linvel.z }, true);
    }
  });

  return (
    <RigidBody
      ref={playerRef}
      colliders={false}
      mass={1}
      type="dynamic"
      position={[0, 2, 0]}
      // Prevent the capsule from falling over
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider args={[0.5, 0.5]} />
      {/* Mesh is hidden as it is a FPS view now */}
      <mesh visible={false}>
        <capsuleGeometry args={[0.5, 1, 4, 8]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>
    </RigidBody>
  );
}