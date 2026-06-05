# Doom-Like FPS — Game Architecture & Agent Development Guide

> **Goal:** A modern-retro first-person shooter — plays like Doom (fast movement, sprite enemies, satisfying weapons, sector-based levels) but rendered with modern 3D techniques using Three.js. Pixel-art textures, billboard sprites, unfiltered rendering for that crisp retro feel.

> **Who this is for:** You (the creative director — drawing art, designing levels, tuning gameplay feel) and your coding agents (building the engine, wiring systems, fixing bugs). This doc tells agents *how* to build things so everything stays coherent.

---

## Architecture Overview

### The Big Rule

**Game state and rendering are separate.** The game logic updates entities in a pure data layer. Once per frame, the render system syncs visuals to match. Never put game logic inside a render callback or Three.js object. This is the most important architectural boundary in the entire project.

```
Each frame:
  InputSystem      — reads keyboard/mouse → writes to entity components
  GameplaySystems  — processes entity data (movement, combat, AI, physics)
  RenderSystem     — reads final entity state → updates Three.js scene
  UISystem         — reads player state → updates HTML HUD
  AudioSystem      — reads audio events → plays sounds
```

### The Spine: Entity-Component-System (ECS)

Use **bitecs** (tiny, fast, pure TypeScript ECS). This is the standard pattern for modern game architecture and coding agents handle it extremely well.

- **Entities** are integer IDs. They carry no data themselves.
- **Components** are typed plain data objects stored in arrays. No methods.
- **Systems** are functions that run each frame. Each system queries entities with specific component combinations and processes them.

The Player is not a class. The Player is an entity (ID `1`) that has components: `Position`, `Velocity`, `InputState`, `Health`, `WeaponState`, `PlayerTag`.

An enemy is an entity with: `Position`, `Velocity`, `Collider`, `Health`, `EnemyAI`, `Renderable`.

A projectile is an entity with: `Position`, `Velocity`, `Collider`, `Damage`, `DespawnTimer`, `Renderable`.

This uniformity is the point. Systems don't care what something "is" — they care what components it has.

---

## Component Types

Every component is a plain interface. Components are stored in typed SoA (structure-of-arrays) by bitecs.

```typescript
// ── Spatial ──────────────────────────────────────────
interface Position { x: number; y: number; z: number }
interface Rotation { yaw: number; pitch: number; roll?: number }
interface Velocity { dx: number; dy: number; dz: number }

// ── Physics ──────────────────────────────────────────
interface Collider {
  shape: 'capsule' | 'box' | 'sphere' | 'ray';
  radius: number;        // capsule/sphere radius
  height: number;        // capsule height
  halfExtents?: Vec3;    // box half-extents
}
interface RigidBody { mass: number; grounded: boolean }

// ── Rendering ────────────────────────────────────────
interface Renderable {
  kind: 'billboard' | 'mesh' | 'static_mesh';
  resourceId: string;    // path to texture or model
  scale?: number;        // sprite scale
  brightness?: number;   // fullbright for pickups, enemy projectiles
}
interface AnimState {
  current: string;       // animation name
  frame: number;         // current frame index
  timer: number;         // accumulator for frame timing
  fps?: number;          // default 10
}

// ── Gameplay ─────────────────────────────────────────
interface Health { current: number; max: number; armor?: number }
interface Damage { amount: number; source: Entity; knockback?: Vec3 }
interface WeaponState {
  kind: string;           // 'fist', 'pistol', 'shotgun', 'chaingun', 'rocket', etc.
  ammo: number;           // current loaded
  maxAmmo: number;
  cooldown: number;       // seconds remaining until can fire again
  firing: boolean;        // true while trigger held (auto weapons)
  reloading: boolean;
  reloadTimer: number;
}
interface EnemyAI {
  behavior: 'idle' | 'patrol' | 'pursue' | 'attack' | 'pain' | 'death';
  target?: Entity;
  sightRange: number;
  attackRange: number;
  speed: number;
  painChance: number;     // 0-1, chance to flinch when hit
  lastKnownPosition?: Vec3;
  patrolPath?: Vec3[];    // waypoints for patrol behavior
}
interface Pickup {
  kind: 'health' | 'armor' | 'ammo' | 'weapon' | 'key';
  subKind?: string;       // weapon name, ammo type, etc.
  amount?: number;
  respawn?: boolean;
}
interface Door {
  open: boolean;
  speed: number;          // units per second
  openHeight: number;     // how far it moves up
  currentOffset: number;  // current open amount
  sectorId: number;       // which sector this door belongs to
}

// ── Player ───────────────────────────────────────────
interface PlayerTag {}     // marker component — exactly one entity has this
interface InputState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  crouch: boolean;
  fire: boolean;
  altFire: boolean;
  use: boolean;
  nextWeapon: boolean;
  prevWeapon: boolean;
  weaponSlot1: boolean;
  // ... weaponSlot2 through weaponSlot7
  mouseX: number;          // delta since last frame
  mouseY: number;
}

// ── Lifecycle ────────────────────────────────────────
interface DespawnTimer { remaining: number }
interface FlashTimer { remaining: number; targetBrightness: number }  // invuln flash, damage flash
```

---

## Systems (Processing Order Each Frame)

Systems run in this order. Each system is a separate file, 30–120 lines, and does exactly one thing.

### 1. InputSystem
- Reads raw keyboard/mouse state (tracked in a global `InputManager`)
- Writes `InputState` to the entity with `PlayerTag`
- Resets mouse delta accumulators

### 2. WeaponSystem
- Reads `InputState.fire` + `WeaponState` on the player entity
- If firing and cooldown ≤ 0 and ammo > 0: spawn a projectile entity, decrement ammo, set cooldown
- Handles hitscan vs projectile weapons (hitscan → immediate raycast; projectile → spawn entity with Velocity)
- Handles weapon switching: if `nextWeapon`/`prevWeapon` pressed, cycle `WeaponState`

### 3. ProjectileSystem
- Queries all entities with `Position` + `Velocity` + `Damage` (these are projectiles)
- Moves them each frame
- Checks collision via Rapier physics queries against entities with `Collider`
- On hit: applies `Damage` to the target entity, despawns the projectile, triggers `weapon_impact` game event
- Checks wall collision (Rapier world query or sector containment check)

### 4. EnemyAISystem
- Queries all entities with `EnemyAI` + `Position`
- Checks line-of-sight to player entity (raycast)
- State machine per enemy: idle → detect player → pursue → attack → pain → death
- Writes `Velocity` for movement toward target
- Writes `Damage` to player if in attack range (timed attacks)

### 5. MovementSystem
- Reads `InputState` + `Velocity` on player entity (or AI-written `Velocity` on enemies)
- Applies acceleration, friction, max speed
- Handles jumping (impulse up, gravity pulls down when not grounded)
- Does NOT resolve collisions — just proposes new position via velocity

### 6. PhysicsSystem
- Steps Rapier world forward by deltaTime
- Reads `Position` + `Velocity` + `Collider` from ECS, syncs to Rapier rigid bodies
- Runs the physics step
- Reads back resolved positions and velocities from Rapier into ECS components
- Sets `RigidBody.grounded` based on contact normals

### 7. DoorSystem
- Queries entities with `Door`
- If `activated` by player use, transitions `open: true`
- Animates `currentOffset` toward `openHeight` (or back to 0)
- Updates sector geometry in the collision world when door position changes

### 8. DamageSystem
- Queries all entities with `Damage` component (newly applied this frame)
- Applies damage to target's `Health`, accounting for armor
- Removes `Damage` component after processing
- Triggers `enemy_damaged` or `player_damaged` game event for audio/flash

### 9. DeathSystem
- Queries entities where `Health.current <= 0`
- Changes `EnemyAI.behavior` to `'death'`, sets `DespawnTimer`
- Removes `Collider` so dead bodies don't block
- For player: triggers death state, respawn logic
- For enemies: spawns `Pickup` entity at death position (random drop table)

### 10. PickupSystem
- Queries player + overlapping `Pickup` entities (distance check or collision sensor)
- Applies pickup effect (health, ammo, weapon, key)
- Despawns pickup entity
- Triggers `pickup_collected` game event

### 11. AnimationSystem
- Queries entities with `AnimState`
- Advances frame timer, updates frame index based on fps
- Sets current animation based on entity state (EnemyAI.behavior, WeaponState.firing, etc.)

### 12. DespawnSystem
- Queries entities with `DespawnTimer`
- Decrements timer, destroys entity when it hits zero

### 13. RenderSystem
- Queries entities with `Position` + `Rotation` + `Renderable` (+ `AnimState` for sprites)
- Syncs Three.js object transforms to ECS component values
- Handles billboard sprites: always face camera
- Applies nearest-neighbor texture filtering for crisp pixel art
- Handles brightness/fullbright (emissive materials for pickups, projectiles)
- Manages sprite sheet UVs based on `AnimState.frame`

### 14. UISystem
- Reads player `Health`, `WeaponState` (ammo, weapon kind)
- Updates HTML HUD elements (health bar, ammo counter, weapon name, face)
- Handles damage flash, pickup messages, crosshair

### 15. AudioSystem
- Listens for game events (enemy_died, weapon_fired, player_damaged, pickup_collected, door_open)
- Plays sounds via Three.js positional audio (spatial) for world sounds
- Plays sounds via global gain for UI/menu sounds

---

## The Thin Event Layer

ECS handles all game state flow. Events exist only for **cross-cutting notifications** — things where multiple unrelated systems need to know something happened, and none of them should own the response. Think of them as "announcements," not "commands."

```typescript
type GameEvent =
  | { type: 'weapon_fired'; weapon: string; position: Vec3; direction: Vec3 }
  | { type: 'weapon_impact'; surface: 'flesh' | 'wall' | 'metal'; position: Vec3 }
  | { type: 'enemy_damaged'; entity: Entity; amount: number; position: Vec3 }
  | { type: 'enemy_died'; entity: Entity; enemyType: string; position: Vec3 }
  | { type: 'player_damaged'; amount: number; newHealth: number; direction: Vec3 }
  | { type: 'player_died' }
  | { type: 'pickup_collected'; kind: string; position: Vec3 }
  | { type: 'door_opened'; sectorId: number }
  | { type: 'level_loaded'; levelId: string }
  | { type: 'secret_found'; sectorId: number }
```

Events drive: particle effects (muzzle flash, blood spray, explosion), screen shake, audio stingers, kill tracking, secret counter.

**Systems that emit events** push them into a per-frame event buffer. **Systems that consume events** read and clear relevant events at their point in the execution order. No pub/sub, no dynamic subscriptions, no event cleanup headaches. Just a typed array that gets flushed each frame.

---

## Level Format

Levels are stored as JSON. This is the single source of truth — the level editor produces this format, the game loads and renders it.

```typescript
interface LevelData {
  name: string;
  author: string;
  skyTexture: string;
  musicTrack: string;
  ambientLight: number;        // 0-1
  sectors: Sector[];
  things: Thing[];
  playerStart: PlayerStart;
}

interface PlayerStart {
  position: { x: number; y: number; z: number };
  angle: number;               // yaw in radians
}

interface Sector {
  id: number;
  floorHeight: number;
  ceilingHeight: number;
  floorTexture: string;        // path to texture
  ceilingTexture: string;
  lightLevel: number;          // 0-255, sector-wide
  special?: string;            // 'secret', 'damage_5', 'exit', etc.
  walls: Wall[];
}

interface Wall {
  start: { x: number; y: number };
  end: { x: number; y: number };
  texture: string;
  portal?: {
    sectorId: number;          // sector seen through this wall
    kind: 'window' | 'door' | 'open';  // how the portal behaves
  };
  unpegged?: 'upper' | 'lower'; // texture alignment
  offset?: { x: number; y: number };  // texture scroll
}

interface Thing {
  id: string;                  // unique within level
  type: string;                // 'player_start', 'enemy_imp', 'enemy_demon',
                               // 'weapon_shotgun', 'health_pack', 'armor_green',
                               // 'ammo_shells', 'key_blue', 'door_trigger'
  position: { x: number; y: number; z: number };
  angle: number;
  properties?: Record<string, unknown>; // type-specific config
}
```

### Level Loading

On load, the game:
1. Validates the JSON schema
2. Creates Rapier colliders for all walls (box shapes along each wall segment)
3. Creates floor/ceiling static bodies for physics
4. Creates Three.js meshes for sector geometry (textured quads for walls, floors, ceilings)
5. Spawns entities for all `things`
6. Positions the player, sets initial camera

---

## The Map Editor

A standalone browser application (or separate route in the same app). This is the single highest-leverage tool you can have agents build — it turns you from someone who *requests* levels into someone who *designs* levels directly.

### Features

**2D Canvas View (left panel)**
- Top-down view of the level. Grid with snap-to-grid option.
- Draw mode: click to place wall vertices. Connect vertices to form sectors.
- Sector fill shows floor texture preview.
- Select sectors/walls by clicking on them.
- Pan and zoom with mouse.
- Portal visualization: dotted lines showing connections between sectors.

**Properties Panel (right)**
- When a sector is selected: floor height, ceiling height, floor texture picker, ceiling texture picker, light level slider, sector special dropdown.
- When a wall is selected: texture picker, portal settings (target sector, portal kind), alignment options.
- When a thing is selected: type dropdown, position/angle fields, properties editor.

**Asset Browser (bottom or floating)**
- Shows available textures as thumbnail tiles.
- Drag and drop onto sectors/walls to assign.
- Organized by category (floors, walls, skies, sprites).

**3D Preview (toggle-able floating window)**
- Renders the level with the actual game renderer.
- Free-camera mode: fly around to see how it looks.
- Player-start mode: preview from the player's starting position.
- Live updates as you edit — no export/reload needed.

**Top Bar**
- New / Open / Save / Save As (all local JSON files)
- Test in Game (launches the game with this level loaded)
- Grid toggle, snap strength, zoom level
- Undo / Redo

### Technical Approach

- HTML5 Canvas for the 2D view (no external library needed)
- The 3D preview is the *same* Three.js renderer used by the game, just embedded in an iframe or separate canvas
- Level data is the JSON format above, held in memory and mutated directly
- Save writes JSON to disk; the game loads JSON directly

---

## Rendering Conventions

### Pixel-Art Textures
- All textures use nearest-neighbor filtering (no bilinear, no mipmapping)
- Texture resolution: 64×64 or 128×128 base, consistent within a set
- No PBR materials. Use `MeshBasicMaterial` or `MeshStandardMaterial` with `roughness: 1`

### Sprites
- Enemy sprites are billboards — textured quads that always face the camera
- Use sprite sheets: a single texture with animation frames in a grid
- The AnimState component drives UV offsets for the current frame
- Scale sprites so a humanoid enemy is roughly 56 units tall (player eye height is ~41 units)

### Lighting
- Sector-based ambient light: each sector has a `lightLevel` (0–255)
- Dark sectors = moody. Bright sectors = outdoor or lit areas.
- Optional: point lights for lamps, torches, explosions — but keep it simple
- Fullbright entities (pickups, projectiles) ignore sector lighting

### Camera
- First-person camera at player eye height (41 units)
- FOV: 90 degrees (classic Doom is 74, but modern screens want wider)
- Weapon bobbing: sin-wave oscillation of weapon model position when moving
- Screen shake: random offset on damage/death, decaying over 0.2–0.4 seconds

---

## Physics Setup (Rapier)

### World Configuration
- Gravity: (0, -800, 0) — fast Doom-like gravity
- Timestep: 1/60 fixed, with up to 4 substeps for stability

### Player Character
- Capsule collider: radius 16, half-height 20 (total height ~56)
- Kinematic character controller (not a dynamic rigid body)
- Movement resolved by the MovementSystem, collisions resolved by Rapier queries
- Snap to ground when on slopes up to 45°

### Level Collision
- Each wall segment becomes a static box collider (thin, tall box along the wall line)
- Floor and ceiling become static plane colliders or tall box colliders spanning the sector
- Generated once on level load, stored in the Rapier world

### Projectile Collision
- Small sphere collider (radius 2–4)
- Dynamic rigid body with linear velocity
- On collision with a character capsule: apply damage, despawn projectile
- On collision with a wall: despawn projectile, trigger impact effect

### Line of Sight
- Raycast from enemy eye position to player position
- If the ray hits a wall collider before reaching the player: line of sight is blocked
- Used by EnemyAISystem for detection and pursuit decisions

---

## Project Structure

```
doomlike/
├── index.html              — entry point, canvas, HUD overlay
├── package.json
├── tsconfig.json
├── vite.config.ts
├── assets/
│   ├── textures/           — walls, floors, skies
│   ├── sprites/            — enemy sprite sheets, pickups, decorations
│   ├── sounds/             — weapons, enemies, ambiance, UI
│   ├── levels/             — .json level files
│   └── ui/                 — HUD images, fonts, crosshairs
├── src/
│   ├── main.ts             — game bootstrap, startup sequence
│   ├── Game.ts             — main loop (requestAnimationFrame), delta timing
│   │
│   ├── ecs/
│   │   ├── World.ts        — bitecs world, entity creation/destruction helpers
│   │   ├── Components.ts   — all component type definitions and SoA stores
│   │   └── queries.ts      — bitecs query definitions (defineQuery)
│   │
│   ├── systems/
│   │   ├── InputSystem.ts
│   │   ├── WeaponSystem.ts
│   │   ├── ProjectileSystem.ts
│   │   ├── EnemyAISystem.ts
│   │   ├── MovementSystem.ts
│   │   ├── PhysicsSystem.ts
│   │   ├── DoorSystem.ts
│   │   ├── DamageSystem.ts
│   │   ├── DeathSystem.ts
│   │   ├── PickupSystem.ts
│   │   ├── AnimationSystem.ts
│   │   ├── DespawnSystem.ts
│   │   ├── RenderSystem.ts
│   │   ├── UISystem.ts
│   │   └── AudioSystem.ts
│   │
│   ├── renderer/
│   │   ├── Renderer.ts     — Three.js scene setup, camera, resize
│   │   ├── LevelRenderer.ts — builds Three.js meshes from LevelData
│   │   ├── SpriteRenderer.ts — handle sprite sheets & billboarding
│   │   └── Materials.ts    — texture loading, nearest-neighbor config
│   │
│   ├── physics/
│   │   ├── RapierWorld.ts  — Rapier world init, step, config
│   │   ├── CollisionShapes.ts — helpers: create player capsule, wall boxes
│   │   └── queries.ts      — raycast, overlap helpers
│   │
│   ├── input/
│   │   └── InputManager.ts — tracks keyboard state, mouse delta, pointer lock
│   │
│   ├── audio/
│   │   └── AudioManager.ts — Three.js AudioListener, spatial audio, sound loading
│   │
│   ├── level/
│   │   ├── LevelLoader.ts  — parse LevelData JSON, spawn sectors + things
│   │   └── LevelTypes.ts   — LevelData TypeScript interfaces
│   │
│   ├── events/
│   │   └── GameEvents.ts   — GameEvent type, per-frame buffer, emit/consume helpers
│   │
│   ├── ui/
│   │   ├── HUD.ts          — health, ammo, weapon display, face
│   │   └── Menu.ts         — main menu, pause menu, settings
│   │
│   └── editor/             — *separate build entry point*
│       ├── editor.html
│       ├── editor.ts
│       ├── EditorCanvas.ts — 2D sector drawing on HTML5 Canvas
│       ├── EditorPanel.ts  — properties sidebar
│       ├── AssetBrowser.ts — texture picker with thumbnails
│       ├── Preview3D.ts    — embedded Three.js renderer for live preview
│       └── LevelIO.ts      — save/load JSON, undo/redo
```

---

## Technology Choices

| Concern | Choice | Why |
|---------|--------|-----|
| Rendering | **Three.js** | Best agent training coverage, pure rendering library (no engine opinions to fight), TypeScript declarations |
| ECS | **bitecs** | Tiny, fast, pure TS, simple API, agents handle it well |
| Physics | **Rapier** | WASM binding, great TS API, Dimforge-maintained, good docs |
| Audio | **Three.js PositionalAudio** | Already integrated with Three.js transforms, spatial audio free |
| Bundler | **Vite** | Instant hot reload, native ESM, zero config for TS |
| Level format | **Custom JSON** | Human-readable, agent-friendly, no binary tooling needed |
| Map editor | **Custom HTML5 Canvas** | No external editor dependency, agents can build it, you can use it |
| UI (HUD/menus) | **HTML/CSS overlay** | Agents are great at HTML/CSS, no Canvas text rendering needed |
| Package manager | **pnpm** or **npm** | Standard, agents know both |

---

## Development Phases

### Phase 1: The Core Loop (Week 1–2)
**Goal:** Walk around in an empty room. See a textured floor, walls, and ceiling. Move with WASD, look with mouse.

- Vite + Three.js project scaffold
- Basic ECS world (World.ts, Components.ts)
- InputManager (keyboard state, pointer lock, mouse delta)
- InputSystem → MovementSystem → RenderSystem pipeline
- First-person camera with correct movement (no collision yet)
- Load and render a single hardcoded sector (one room)
- Nearest-neighbor textures working

### Phase 2: Physics & Collision (Week 2–3)
**Goal:** Walls are solid. You can't walk through them. You can jump.

- Rapier integration (PhysicsSystem)
- Player capsule collider
- LevelLoader builds wall colliders from sector data
- Ground detection and jumping
- Step up small ledges (optional — classic Doom auto-step)

### Phase 3: Weapons (Week 3–4)
**Goal:** A pistol that fires. Projectiles that hit walls and disappear. A HUD with ammo.

- WeaponState component and WeaponSystem
- Projectile entity spawning (with Damage + Velocity + Collider)
- ProjectileSystem (movement, collision, despawn)
- Hitscan raycast alternative for instant-hit weapons
- Basic HUD: ammo counter, health display
- Weapon bobbing (cosmetic oscillation)

### Phase 4: Level Format & Editor (Week 4–5)
**Goal:** Level JSON format finalized. Map editor lets you draw sectors and save levels. Game loads them.

- Finalize LevelData schema
- LevelLoader parses JSON, creates geometry + colliders
- Map editor: 2D canvas drawing (place vertices, connect to sectors)
- Map editor: properties panel (textures, heights)
- Map editor: save/load JSON
- Test: draw a room in the editor, load it in the game, walk around

### Phase 5: Enemies (Week 5–7)
**Goal:** Enemies that see you, chase you, attack you, and die dramatically.

- Enemy entity template (health, AI, sprite renderable, collider, anim state)
- EnemyAI state machine (idle/patrol/pursue/attack/pain/death)
- Line-of-sight raycasts
- NAVIGATION: simplest approach — enemies move directly toward player, get stuck on walls is OK for now
- Damage → Health → Death pipeline (shared with player)
- DeathSystem handles drops, despawn, death animation
- Sprite sheet animation system

### Phase 6: Polish & Game Feel (Week 7–9)
**Goal:** It feels like a game, not a tech demo.

- Particle effects (muzzle flash, blood, explosions) — use Three.js Points
- Audio system: weapon sounds, enemy sounds, ambiance, UI sounds
- Screen shake on damage
- Damage flash (red tint)
- Pickup glow / animation
- Secret detection (sectors behind fake walls)
- Door animation (open/close with sound)
- Menu system (main, pause, settings, key bindings)
- Multiple weapons with switching
- Level transitions (exit switch loads next level)

### Phase 7: Content (Ongoing)
**Goal:** More levels, more enemies, more weapons. This phase never really ends.

- New enemy types (different behavior, sprites, attacks)
- New weapons (each with unique feel)
- More level textures
- Level design (you do this!)
- Balance tuning
- Boss encounters

---

## Rules for Agents

Share these with any coding agent that works on the project:

1. **Game state lives in components only.** Never store game state on Three.js objects, in closures, or in globals. Components → Systems → Components. That's the whole loop.

2. **Rendering is always a read.** RenderSystem and LevelRenderer read component data. They never write. If a visual effect needs to change game state (a door moving, a pickup despawning), that happens in the gameplay system that owns that behavior — the render system just shows the result.

3. **One system, one file, one concern.** If a system file is over 150 lines, it's doing too much. Split it.

4. **Use types everywhere.** Every component, every function signature, every query result. If a type is missing, add it to `Components.ts` first. TypeScript is the project's shared vocabulary.

5. **Delta time is always available.** Every system receives `deltaTime` (seconds since last frame). Never assume 60fps. Never use fixed-step counters that don't account for variable frame times.

6. **No runtime component addition/removal in tight loops.** Creating or removing components during a system execution is fine for one-off events (spawning a projectile). Don't iterate over entities while adding/removing components from the same archetype — it's a footgun. Use a deferred buffer if needed.

7. **Test each system in isolation if possible.** The MovementSystem should be testable by calling it with fake input state and checking the resulting velocity. Design systems to be callable with explicit inputs, not just the ECS world.

8. **Commit working states.** Don't leave the project in a broken state between sessions. If you're mid-feature, create a branch. `main` should always compile and run.

---

## FAQ

**Why not Godot/Unity/Unreal?**
Coding agents are dramatically better at TypeScript and web technologies than at C# or C++ in game engines. The web debugging loop (browser devtools, DOM inspection, console) gives agents full visibility. Game engines are black boxes to agents — they can write scripts but cannot debug engine behavior.

**Why not Babylon.js or PlayCanvas?**
Those are full game engines with physics, scene graphs, and integrated tooling. For a modern Doom-like built by agents, the batteries are mostly the wrong shape — the project needs a custom sector renderer and simple 2D collision, not PBR materials and rigid body physics. Three.js gives agents maximum leverage with minimal engine opinions to fight.

**Will this actually look like Doom?**
With pixel-art textures, sprite enemies, sector-based lighting, and a fast-paced FPS camera: yes. The rendering technique is different (polygons instead of raycasting columns), but the visual language and gameplay feel are the same ingredients. The 1993 column-rendered look can be achieved later as a post-processing effect or alternate renderer without changing any game code.

**How many agents can work on this at once?**
The system-per-file architecture means different agents can work on different systems simultaneously with minimal merge conflicts. The ECS world, component definitions, and level format are shared contracts — those need coordination. Everything else is independently parallel.

**What about multiplayer?**
That is a completely different project. Don't think about it until the single-player game is fun. Networking touches every system and needs its own architecture (client prediction, server reconciliation, entity interpolation). Walk before running.
