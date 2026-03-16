# Nova Shooter — Game Design Document

## Vision
Cyberpunk arena FPS with deep weapon progression, enemy variety, and loot mechanics.
The player should feel their power grow from a single plasma pistol to wielding
reality-breaking weaponry against overwhelming odds. Infinite replayability through
escalating waves, diverse enemies with evolving AI, and a deep arsenal that rewards
exploration and mastery.

### Core Loop
1. **Fight** — Kill enemies in the arena
2. **Collect** — Pick up loot drops (HP, buffs, intel)
3. **Upgrade** — Spend intel to unlock/upgrade weapons in Nova Command
4. **Survive** — Waves get harder, enemies get smarter, stakes get higher
5. **Repeat** — After Level 10, endless mode with leaderboard tracking

---

## In-Game Weapon Switching
- **Hold Q** → Radial weapon wheel (time slows 50% while open)
- **Number keys 1-9** → Quick-switch to weapon in that slot
- **Mouse scroll** → Cycle next/prev weapon
- Equipped weapon shown in bottom-right HUD
- Only unlocked weapons appear in wheel
- Active weapon has glow highlight in wheel

## Charged Shots
- **Hold left-click** to charge (0→100% over 2 seconds)
- Visual: weapon glows brighter, charge bar fills above reticle
- Release: damage scales with charge (100% charge = 3× base damage)
- Charge bonus stacks with weapon level bonus
- Some weapons have unique charge behaviors:
  - Gauss Cannon: charge is mandatory (no tap-fire)
  - Nova Lance: charge determines beam duration
  - Frag Launcher: charge determines arc distance

## AOE Scaling
- All weapons gain AOE splash at **Level 3+**:
  - Lv3: 2m splash radius, 25% splash damage
  - Lv4: 3m splash radius, 40% splash damage
  - Lv5: 4m splash radius, 60% splash damage
- Explosive class weapons have innate AOE at all levels
- AOE kill chains: if splash kills an enemy, that enemy also explodes (chain reaction)

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
- After Level 10 (endless): multipliers keep growing every 10 kills

### Ranged Enemy AI
- **Spitter/Shielder/Phantom** fire projectiles at the player
- Projectiles: glowing orbs that travel at 15-25 units/s
- Projectile damage: 10-25 depending on enemy type
- Player can dodge projectiles (they're visible and not instant)
- Projectiles despawn after 3 seconds or on surface hit
- Visual: colored trail matching enemy type, small explosion on impact
- Spitter fires every 2s, Shielder fires every 4s, Phantom fires on teleport

### Enemy Visual Redesign
- Each enemy type gets distinct geometry + color scheme
- Drone: small icosahedron, red wireframe, fast rotation
- Spitter: elongated shape (cylinder + sphere head), purple glow, spits visible orbs
- Charger: wedge/arrow shape, orange trails, charges with speed blur
- Shielder: sphere inside a transparent shield bubble, blue
- Bomber: spiky dodecahedron, orange pulsing, explodes into particles on death
- Juggernaut: large octahedron, blue, shrinks as HP drops, ground shake on footsteps
- Phantom: ghost-like translucent mesh, green, flickers before teleporting
- Hive Queen: large pulsing organic shape, pink/magenta, spawns mini-drones

---

## Save System

### Auto-Save
- Game state saved to `localStorage` on: level completion, pause, game over
- Saved data: level, score, total kills, weapon unlocks, weapon levels,
  equipped weapon, player HP, settings (volume, sensitivity, etc.)

### Save Slots
- 3 save slots on the main menu
- Each slot shows: level, score, last played date
- "New Game" starts fresh, "Continue" loads most recent
- "Delete Save" with confirmation dialog

### Settings Persistence
- All settings (volume, sensitivity, FOV, graphics) saved separately
- Applied immediately on change, persisted across sessions

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

### Phase 3: Weapon Overhaul ✅
- [x] Core 6 weapons working (1 per class)
- [x] 5-level upgrade system with scaling damage/rate
- [x] Compact 3-column weapon card grid in Arsenal
- [x] In-game weapon wheel (hold Q to radial-select)
- [x] Number keys 1-9 quick-switch in gameplay
- [x] 18 weapons total (12 new: lightning coil, blade wave, railgun, gravity well, swarm missiles, beam laser, ricochet cannon, sonic boom, nano swarm, photon burst, plasma whip, warp lance)
- [x] Weapon penetration at level 3+ for kinetic/beam weapons
- [x] Shoot-down enemy projectiles
- [x] Combo system with 7 tiers (COMBO→RAMPAGE→CARNAGE→MASSACRE→GODLIKE→NOVA STREAK, 1x-5x score)
- [x] Charged shots (hold to charge, release for bonus damage)
- [x] Weapon-class-specific kill effects
- [x] Visual upgrades per level (glow, particles, geometry)

### Phase 4: Enemy Overhaul ✅ (partial)
- [x] Add Spitter (ranged enemy — fires slow projectiles at player)
- [x] Add Charger (burst movement — winds up then rushes)
- [x] Add Shielder (regenerating shield, protects nearby allies)
- [x] Add Phantom (teleports every 3s, appears behind player)
- [x] Enemy health/speed scaling per level
- [x] Elites fire projectiles from distance
- [x] Enemy visual redesign (distinct geometry per type)
- [x] Add Hive Queen (stationary spawner, must be killed to stop)
- [x] Death-on-explosion for Bomber (AOE damage radius)
- [x] Enemy aggro improvements (flanking, group tactics)

### Phase 5: Loot & Drop System ✅
- [x] Drop spawning on enemy death (% chance per type)
- [x] Floating/spinning pickup visuals (3D orbs with glow)
- [x] Magnetic collection radius (6 units pull, 3 units collect)
- [x] Health Pack (+50 HP, green)
- [x] Shield Orb (+30 temp shield, blue)
- [x] Damage/Speed/Ammo buffs with countdown timers
- [x] Intel Cache (bonus score, cyan)
- [x] HUD buff indicators (top-right icons with timers)
- [x] Despawn after 15s with fade warning at 12s
- [x] Weapon Crate (rare — random weapon unlock/upgrade, purple)

### Phase 6: Game Flow & Progression (partial)
- [x] Wave structure with escalating kill targets (level × 10)
- [x] Kill combo counter (center HUD, multiplier for consecutive kills)
- [x] Level-up fanfare (screen flash, ring expansion, "LEVEL UP" text)
- [x] Boss waves (Level 5: 3× Juggernauts, Level 9: Mega Juggernaut)
- [x] Infinite mode after Level 10 (endless scaling waves)

### Phase 7: Audio & Atmosphere (partial)
- [x] Weapon-specific fire sounds (unique per weapon)
- [x] Volume controls in Settings (SFX, Music)
- [x] Background music system (looping tracks, crossfade)
- [x] Enemy-specific sounds (spawn, attack, death)
- [x] Ambient arena sounds (hum, sparks, distant combat)
- [x] Dynamic music intensity (calm → combat → boss)

### Phase 8: Settings & Quality of Life (partial)
- [x] Volume sliders (SFX, Music)
- [x] Mouse sensitivity slider
- [x] Reticle scale/contrast options
- [x] Reduced motion toggle
- [x] FOV slider (60-110)
- [x] Graphics quality (Low/Medium/High — bloom, particles, reflections)
- [x] Keybind remapping
- [x] Colorblind mode (enemy/reticle color overrides)
- [x] Fullscreen toggle
- [x] Show FPS counter toggle

### Phase 9: Save System & Persistence ✅
- [x] Save game state to localStorage
- [x] Auto-save on level completion and pause
- [x] Load/continue from main menu
- [x] Save data: level, score, weapon unlocks/levels, settings
- [x] Delete save option
- [x] Multiple save slots (3)

### Phase 10: Leaderboard & Social
- [x] End-of-run stats screen (score, level, kills)
- [x] Local high score table (top 10, stored in localStorage)
- [x] Online leaderboard (Neon serverless Postgres + Next.js API routes)
- [ ] Share score screenshot

### Phase 11: UI & Polish (partial)
- [x] Premium home screen redesign (animated background, particle effects, nebula, hex grid)
- [x] Damage flash overlay on player hit
- [x] Directional damage indicators
- [x] Combo HUD with animated counter and tier labels
- [x] Minimap/radar (bottom-left, shows enemy positions as dots)
- [x] Boss health bar (top-center)
- [x] Damage numbers floating above enemies
- [x] Screen shake on explosions
- [ ] Arena improvements (multiple rooms, moving platforms, cover)
- [ ] Loading screen with tips
- [ ] Weapon inspect mode (rotate 3D model in Arsenal)

### Phase 12: Deployment & Infrastructure
- **Platform:** Vercel (zero-config Next.js hosting, free tier)
- **Database:** Neon serverless Postgres (free tier: 0.5 GB, 190 compute-hours/month)
- **Driver:** `@neondatabase/serverless` — works in Vercel edge/serverless functions
- **Env var:** `DATABASE_URL` — Neon connection string (set in Vercel project settings)
- **API routes:** `GET /api/scores` (top 100), `POST /api/scores` (submit + return rank)
- **Schema:**
  ```sql
  CREATE TABLE IF NOT EXISTS scores (
    id SERIAL PRIMARY KEY,
    username VARCHAR(20) NOT NULL DEFAULT 'ANON',
    score INTEGER NOT NULL,
    level INTEGER NOT NULL,
    kills INTEGER NOT NULL,
    max_combo INTEGER NOT NULL DEFAULT 0,
    weapon VARCHAR(50) NOT NULL DEFAULT 'pulse_pistol',
    time_played INTEGER NOT NULL DEFAULT 0,
    damage_dealt INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  CREATE INDEX idx_scores_score ON scores(score DESC);
  ```
- **Auto-migration:** Table is created automatically on first API call — no manual SQL needed
