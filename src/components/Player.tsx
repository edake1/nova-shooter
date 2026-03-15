import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, useRapier, RapierRigidBody, CapsuleCollider } from "@react-three/rapier";
import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { useStore } from "@/store";

const SPEED = 12;
const SPRINT_MULTIPLIER = 1.8;
const JUMP_FORCE = 8;
const GROUND_RAY_LENGTH = 1.3; // Slightly longer than capsule half-height + radius

const useKeyControls = () => {
  const keys = useRef({ forward: false, backward: false, left: false, right: false, jump: false, sprint: false });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyW") keys.current.forward = true;
      if (e.code === "KeyS") keys.current.backward = true;
      if (e.code === "KeyA") keys.current.left = true;
      if (e.code === "KeyD") keys.current.right = true;
      if (e.code === "Space") keys.current.jump = true;
      if (e.code === "ShiftLeft") keys.current.sprint = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyW") keys.current.forward = false;
      if (e.code === "KeyS") keys.current.backward = false;
      if (e.code === "KeyA") keys.current.left = false;
      if (e.code === "KeyD") keys.current.right = false;
      if (e.code === "Space") keys.current.jump = false;
      if (e.code === "ShiftLeft") keys.current.sprint = false;
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return keys;
};

export function Player() {
  const keys = useKeyControls();
  const playerRef = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const { world, rapier } = useRapier();

  const frontVector = useMemo(() => new THREE.Vector3(), []);
  const sideVector = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!playerRef.current) return;
    if (useStore.getState().isPaused) return;

    const { forward, backward, left, right, jump, sprint } = keys.current;

    // 1. Move the camera to the player's eyes
    const position = playerRef.current.translation();
    camera.position.set(position.x, position.y + 0.8, position.z);

    // 2. Calculate movement directions relative to camera look
    frontVector.set(0, 0, Number(backward) - Number(forward));
    sideVector.set(Number(left) - Number(right), 0, 0);

    const speed = sprint ? SPEED * SPRINT_MULTIPLIER : SPEED;
    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(speed)
      .applyEuler(camera.rotation);

    // 3. Apply walking physics
    const linvel = playerRef.current.linvel();
    playerRef.current.setLinvel(
      { x: direction.x, y: linvel.y, z: direction.z },
      true
    );

    // 4. Ground detection via Rapier raycast (proper ground check, not velocity hack)
    const ray = new rapier.Ray(
      { x: position.x, y: position.y, z: position.z },
      { x: 0, y: -1, z: 0 }
    );
    const hit = world.castRay(ray, GROUND_RAY_LENGTH, true, undefined, undefined, undefined, playerRef.current);
    const isGrounded = hit !== null && hit.timeOfImpact < GROUND_RAY_LENGTH;

    if (jump && isGrounded) {
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
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider args={[0.5, 0.5]} />
      <mesh visible={false}>
        <capsuleGeometry args={[0.5, 1, 4, 8]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>
    </RigidBody>
  );
}