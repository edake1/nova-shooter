# Nova Shooter — Game Design Document

## Vision
Cyberpunk arena FPS with deep weapon progression, enemy variety, and loot mechanics.
The player should feel their power grow from a single plasma pistol to wielding
reality-breaking weaponry against overwhelming odds.

---

## Weapon System (18 weapons across 6 classes)

### Class 1: KINETIC (physical projectiles)
| # | Name | Mechanic | Unlock |
|---|------|----------|--------|
| 1 | **Pulse Pistol** | Single raycast, fast fire | Starter |
| 2 | **Railgun** | Piercing ray (hits all in line) | Level 3 |
| 3 | **Gauss Cannon** | Charged shot — hold to charge, release for massive single hit | Level 6 |

### Class 2: ENERGY (beam / plasma)
| # | Name | Mechanic | Unlock |
|---|------|----------|--------|
| 4 | **Plasma Caster** | 3-round burst, slight spread | 2,000 pts |
| 5 | **Arc Rifle** | Continuous beam, drains energy meter | Level 4 |
| 6 | **Nova Lance** | Sniper-style delayed beam, huge damage, long cooldown | Level 8 |

### Class 3: EXPLOSIVE (AOE)
| # | Name | Mechanic | Unlock |
|---|------|----------|--------|
| 7 | **Frag Launcher** | Bouncing grenade, explodes on timer or contact | 5,000 pts |
| 8 | **Cluster Mortar** | Lobs projectile that splits into 5 mini-explosions | Level 5 |
| 9 | **Singularity Bomb** | Black hole pulls enemies in, then detonates | Level 9 |

### Class 4: SPREAD (close/mid range)
| # | Name | Mechanic | Unlock |
|---|------|----------|--------|
| 10 | **Shrapnel Blaster** | 5-pellet cone, classic shotgun | 3,000 pts |
| 11 | **Ricochet SMG** | Fast fire, bullets bounce off walls (2 bounces) | Level 4 |
| 12 | **Storm Needler** | 12-needle burst in a wide arc, each needle does DOT | Level 7 |

### Class 5: TECH (utility / special)
| # | Name | Mechanic | Unlock |
|---|------|----------|--------|
| 13 | **Cryo Emitter** | Short-range cone, slows enemies 60% for 3s | 8,000 pts |
| 14 | **EMP Pulse** | AOE stun (2s) + shield strip, no direct damage | Level 5 |
| 15 | **Nano Swarm** | Fires cloud that auto-targets nearby enemies for 4s | Level 8 |

### Class 6: FORBIDDEN (endgame)
| # | Name | Mechanic | Unlock |
|---|------|----------|--------|
| 16 | **Void Reaper** | Scythe beam that chains to 5 enemies (bio evolved) | Level 7 + 50k pts |
| 17 | **Apocalypse Core** | Screen-wide nuke, 10s cooldown, self-damage 20% HP | Level 9 + 100k pts |
| 18 | **Chrono Splitter** | Freezes time 3s, all shots during freeze hit simultaneously | Level 10 + 200k pts |

### Weapon Upgrade System
- Each weapon has **5 levels** (Lv1 → Lv5)
- Each level gives: +20% damage, +10% fire rate, +visual upgrade
- Visual changes per level:
  - Lv1: Base model
  - Lv2: Glowing barrel strips
  - Lv3: Particle trail on projectiles
  - Lv4: Barrel geometry changes (wider/longer)
  - Lv5: Full glow + unique kill effect + title "MASTERED"
- Upgrade costs scale: base × 1.0 / 1.5 / 2.5 / 4.0 / 6.0

---

## Enemy System (8 types across 3 tiers)

### Tier 1: Fodder (levels 1-3)
| Type | HP | Speed | Behavior | Drop Rate |
|------|----|-------|----------|-----------|
| **Drone** | 1 | 4.0 | Bee-line to player | 15% |
| **Spitter** | 2 | 2.5 | Keeps distance, fires slow projectiles | 20% |

### Tier 2: Threats (levels 3-7)
| Type | HP | Speed | Behavior | Drop Rate |
|------|----|-------|----------|-----------|
| **Charger** | 4 | 6.0 | Charges in bursts, pauses to wind up | 25% |
| **Shielder** | 3+3sh | 2.0 | Has regenerating shield, protects nearby | 30% |
| **Bomber** | 2 | 4.5 | Explodes on death (AOE damage to player) | 35% |

### Tier 3: Elites (levels 6-10)
| Type | HP | Speed | Behavior | Drop Rate |
|------|----|-------|----------|-----------|
| **Juggernaut** | 15 | 1.5 | Slow tank, high damage melee, shrinks as damaged | 50% |
| **Phantom** | 5 | 5.0 | Teleports every 3s, appears behind player | 40% |
| **Hive Queen** | 20 | 1.0 | Stationary, spawns 2 drones every 5s, must be killed to stop | 100% |

### Enemy Scaling
- HP multiplier: `1 + (level - 1) * 0.3`
- Speed multiplier: `1 + (level - 1) * 0.05`
- Score per kill: base × level multiplier

---

## Loot Drop System

### Drop Types
| Drop | Color | Effect | Duration |
|------|-------|--------|----------|
| **Health Pack** | Green | +50 HP | Instant |
| **Shield Orb** | Blue | +30 temporary shield (decays 1/s) | 30s |
| **Damage Boost** | Red | +50% weapon damage | 10s |
| **Speed Boost** | Yellow | +40% movement speed | 8s |
| **Ammo Surge** | Orange | 2x fire rate | 6s |
| **Intel Cache** | Cyan | +500 bonus score | Instant |
| **Weapon Crate** | Purple | Random weapon unlock/upgrade (rare) | Instant |

### Drop Mechanics
- Drops float and spin at enemy death position, bob up and down
- Auto-collected when player walks within 3 units
- Magnetic pull when within 6 units (accelerates toward player)
- Despawn after 15 seconds with fade warning at 12s
- Active buffs shown as icons in the HUD with countdown timers

---

## Level Progression

### Wave Structure (10 levels)
| Level | Kills Required | Enemy Types | Max Enemies | Special |
|-------|---------------|-------------|-------------|---------|
| 1 | 10 | Drone | 8 | Tutorial feel |
| 2 | 15 | Drone, Spitter | 11 | Ranged enemies intro |
| 3 | 20 | Drone, Spitter, Charger | 14 | First rush enemy |
| 4 | 25 | All Tier 1-2 | 17 | Shielder intro |
| 5 | 30 | All Tier 1-2 | 20 | **MINI-BOSS: 3× Juggernauts** |
| 6 | 35 | All types | 23 | Phantom intro |
| 7 | 40 | All types | 26 | Storm Needler unlock wave |
| 8 | 50 | Heavy Tier 2-3 | 29 | Hive Queen intro |
| 9 | 60 | All types + extra elites | 32 | **BOSS: Mega Juggernaut** |
| 10 | 80 | Everything, max intensity | 35 | **FINAL: Endless survival** |

---

## Kill Effects by Weapon Class

| Class | Kill Effect |
|-------|------------|
| KINETIC | Enemy shatters into rigid body fragments |
| ENERGY | Enemy disintegrates (white flash → particles scatter) |
| EXPLOSIVE | Ragdoll explosion + screen shake |
| SPREAD | Enemy pops into many small pieces |
| TECH | Enemy freezes/glitches then collapses |
| FORBIDDEN | Dramatic slow-mo, reality crack VFX, screen distortion |

---

## HUD Improvements
- Active buffs bar (top-right)
- Kill combo counter (center, fades after 2s idle)
- Boss health bar (top-center, only during boss waves)
- Minimap radar (bottom-left, shows enemy dots)
- Ammo/energy meter per weapon

---

## Implementation Priority

### Phase 3: Weapon Overhaul ← CURRENT
- [x] Core 4 weapons working (placeholder names)
- [ ] Rename to final weapon names
- [ ] Expand to 6 starter weapons (1 per class)
- [ ] 5-level upgrade system with visible scaling
- [ ] Compact weapon card grid in Arsenal
- [ ] Weapon-class-specific kill effects

### Phase 4: Enemy Overhaul
- [ ] Add Spitter (ranged enemy)
- [ ] Add Charger (burst movement)
- [ ] Add Shielder (shield mechanic)
- [ ] Add Phantom (teleport)
- [ ] Add Hive Queen (spawner)
- [ ] Enemy health scaling per level

### Phase 5: Loot System
- [ ] Drop spawning on enemy death
- [ ] Floating/spinning pickup visuals
- [ ] Magnetic collection radius
- [ ] Health Pack + Shield Orb
- [ ] Damage/Speed/Ammo buffs with timers
- [ ] HUD buff indicators

### Phase 6: Progression & Polish
- [ ] Wave structure with kill targets
- [ ] Boss waves (5, 9)
- [ ] Kill combo system
- [ ] Minimap/radar
- [ ] Arena improvements (multiple rooms, moving platforms)
