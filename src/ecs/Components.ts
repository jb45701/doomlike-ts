/**
 * ECS Components for the Doomlike FPS.
 *
 * Each component is defined as a plain object with typed array fields.
 * This is the native bitecs 0.4.0 SoA (Structure of Arrays) pattern.
 *
 * Usage (bitecs main API, not legacy):
 *   import { addComponent, setComponent } from 'bitecs';
 *   addComponent(world, eid, Position);
 *   Position.x[eid] = 10;
 *   Position.y[eid] = 41;
 *   Position.z[eid] = -128;
 *
 * Tag/marker components (like PlayerTag) have no fields — empty objects.
 */

// ═══════════════════════════════════════════════════════════════════════════
//  Enum Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Collision shape identifiers (stored as number/uint8 in SoA arrays). */
export const ColliderShape = { Capsule: 0, Box: 1, Sphere: 2, Ray: 3 } as const;

/** Renderable visual kind identifiers. */
export const RenderableKind = { Billboard: 0, Mesh: 1, StaticMesh: 2 } as const;

/** Enemy AI behavior state identifiers. */
export const Behavior = { Idle: 0, Patrol: 1, Pursue: 2, Attack: 3, Pain: 4, Death: 5 } as const;

/** Weapon kind identifiers. */
export const WeaponKind = { Fist: 0, Pistol: 1, Shotgun: 2, Chaingun: 3, RocketLauncher: 4, PlasmaRifle: 5, SuperShotgun: 6, Chainsaw: 7 } as const;

/** Pickup kind identifiers. */
export const PickupKind = { Health: 0, Armor: 1, Ammo: 2, Weapon: 3, Key: 4 } as const;

// ═══════════════════════════════════════════════════════════════════════════
//  Spatial Components
// ═══════════════════════════════════════════════════════════════════════════

/** World-space position. Default: (0, 0, 0) */
export const Position = { x: [] as number[], y: [] as number[], z: [] as number[] };

/** Euler rotation (radians). Default: yaw=0, pitch=0, roll=0 */
export const Rotation = { yaw: [] as number[], pitch: [] as number[], roll: [] as number[] };

/** Linear velocity (units/sec). Default: (0, 0, 0) */
export const Velocity = { dx: [] as number[], dy: [] as number[], dz: [] as number[] };

// ═══════════════════════════════════════════════════════════════════════════
//  Physics Components
// ═══════════════════════════════════════════════════════════════════════════

/** Collision shape. Default: capsule, radius=16, height=20 */
export const Collider = {
  shape: [] as number[],
  radius: [] as number[],
  height: [] as number[],
  halfExtentX: [] as number[],
  halfExtentY: [] as number[],
  halfExtentZ: [] as number[],
};

/** Rigid body. Default: mass=1, grounded=false */
export const RigidBody = { mass: [] as number[], grounded: [] as boolean[] };

// ═══════════════════════════════════════════════════════════════════════════
//  Rendering Components
// ═══════════════════════════════════════════════════════════════════════════

/** Visual representation. Default: billboard, scale=1, brightness=0 */
export const Renderable = {
  kind: [] as number[],
  resourceId: [] as string[],
  scale: [] as number[],
  brightness: [] as number[],
};

/** Sprite/mesh animation state. Default: frame=0, timer=0, fps=10 */
export const AnimState = {
  current: [] as string[],
  frame: [] as number[],
  timer: [] as number[],
  fps: [] as number[],
};

// ═══════════════════════════════════════════════════════════════════════════
//  Gameplay Components
// ═══════════════════════════════════════════════════════════════════════════

/** Hit-points. Default: current=100, max=100, armor=0 */
export const Health = { current: [] as number[], max: [] as number[], armor: [] as number[] };

/** Damage payload. Default: amount=0, source=0, no knockback */
export const Damage = {
  amount: [] as number[],
  source: [] as number[],
  knockbackX: [] as number[],
  knockbackY: [] as number[],
  knockbackZ: [] as number[],
};

/** Weapon configuration. Default: fist, ammo=0, maxAmmo=0, cooldown=0 */
export const WeaponState = {
  kind: [] as number[],
  ammo: [] as number[],
  maxAmmo: [] as number[],
  cooldown: [] as number[],
  firing: [] as boolean[],
  reloading: [] as boolean[],
  reloadTimer: [] as number[],
};

/** Enemy AI state. Default: idle, no target, sightRange=512, attackRange=128, speed=96, painChance=0.3 */
export const EnemyAI = {
  behavior: [] as number[],
  target: [] as number[],
  sightRange: [] as number[],
  attackRange: [] as number[],
  speed: [] as number[],
  painChance: [] as number[],
  lastKnownX: [] as number[],
  lastKnownY: [] as number[],
  lastKnownZ: [] as number[],
};

/** World pickup. Default: health, amount=10, respawn=false */
export const Pickup = {
  kind: [] as number[],
  subKind: [] as string[],
  amount: [] as number[],
  respawn: [] as boolean[],
};

/** Sector door. Default: closed, speed=48, openHeight=128, offset=0, sectorId=0 */
export const Door = {
  open: [] as boolean[],
  speed: [] as number[],
  openHeight: [] as number[],
  currentOffset: [] as number[],
  sectorId: [] as number[],
};

// ═══════════════════════════════════════════════════════════════════════════
//  Player Components
// ═══════════════════════════════════════════════════════════════════════════

/** Marker component — exactly one entity has this. Empty object (no data). */
export const PlayerTag = {};

/** Raw input state. Default: all false, mouse=(0, 0) */
export const InputState = {
  forward: [] as boolean[],
  back: [] as boolean[],
  left: [] as boolean[],
  right: [] as boolean[],
  jump: [] as boolean[],
  crouch: [] as boolean[],
  fire: [] as boolean[],
  altFire: [] as boolean[],
  use: [] as boolean[],
  nextWeapon: [] as boolean[],
  prevWeapon: [] as boolean[],
  weaponSlot1: [] as boolean[],
  weaponSlot2: [] as boolean[],
  weaponSlot3: [] as boolean[],
  weaponSlot4: [] as boolean[],
  weaponSlot5: [] as boolean[],
  weaponSlot6: [] as boolean[],
  weaponSlot7: [] as boolean[],
  mouseX: [] as number[],
  mouseY: [] as number[],
};

// ═══════════════════════════════════════════════════════════════════════════
//  Lifecycle Components
// ═══════════════════════════════════════════════════════════════════════════

/** Despawn timer. Default: remaining=0 (immediate if not set) */
export const DespawnTimer = { remaining: [] as number[] };

/** Visual flash timer. Default: remaining=0, brightness=0 */
export const FlashTimer = { remaining: [] as number[], targetBrightness: [] as number[] };
