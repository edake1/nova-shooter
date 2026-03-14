# Nova Shooter - Execution Plan

## Phase 1: First-Person Controller (FPS) Mechanics
- [ ] Fix the Player's perspective (camera inside the capsule collider).
- [ ] Hide the player mesh to make it an invisible physical body.
- [ ] Implement WASD movement mapped to physics velocity based on camera look direction.
- [ ] Implement jumping mechanics with basic ground-detection/velocity checks.

## Phase 2: Weapon System & Shooting
- [ ] Add a 3D weapon view attached to the camera.
- [ ] Implement Raycast shooting from the center of the screen on click.
- [ ] Add shooting feedback (recoil, muzzle flash, impact system).

## Phase 3: Gameplay Loop & Enemies
- [ ] Create target enemies (basic RigidBodies spawning on map).
- [ ] Integrate hit detection and enemy damage/destruction.
- [ ] Connect the Zustand store to update score when targets are destroyed.

## Phase 4: Polish & Environment
- [ ] Upgrade the arena environment (walls, terrain, ramps).
- [ ] Add basic sound effects for shooting and jumping.
- [ ] Polish UI (crosshair, score, health overlay).
