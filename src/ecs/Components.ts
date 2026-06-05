/**
 * Component definitions for the Doomlike FPS.
 *
 * Components are Structure-of-Arrays (SoA) — plain objects whose fields are
 * number arrays indexed by entity ID. This is the native bitecs 0.4.0 pattern.
 *
 * String/enum fields are stored as numeric indices. See individual component
 * comments for the mapping.
 */

// ── Spatial ────────────────────────────────────────────────────────────────

/** 3D position in world units. */
export const Position = {
  x: [] as number[],
  y: [] as number[],
  z: [] as number[],
};

/** Euler angles in radians. */
export const Rotation = {
  yaw: [] as number[],
  pitch: [] as number[],
  roll: [] as number[],
};

/** Linear velocity in units/second. */
export const Velocity = {
  dx: [] as number[],
  dy: [] as number[],
  dz: [] as number[],
};

// ── Physics ────────────────────────────────────────────────────────────────

/**
 * Collision shape definition.
 * shape: 0=capsule, 1=box, 2=sphere, 3=ray
 */
export const Collider = {
  shape: [] as number[],
  radius: [] as number[],
  height: [] as number[],
  halfExtentsX: [] as number[],
  halfExtentsY: [] as number[],
  halfExtentsZ: [] as number[],
};

/** Rigid body parameters. grounded is 0/1 boolean. */
export const RigidBody = {
  mass: [] as number[],
  grounded: [] as number[],
};

// ── Rendering ──────────────────────────────────────────────────────────────

/**
 * Renderable entity.
 * kind: 0=billboard, 1=mesh, 2=static_mesh
 * resourceId: index into the resource registry (maps to texture/model path)
 */
export const Renderable = {
  kind: [] as number[],
  resourceId: [] as number[],
  scale: [] as number[],
  brightness: [] as number[],
};

/**
 * Sprite/animation state.
 * current: animation ID (index into animation registry)
 */
export const AnimState = {
  current: [] as number[],
  frame: [] as number[],
  timer: [] as number[],
  fps: [] as number[],
};

// ── Gameplay ───────────────────────────────────────────────────────────────

/** Hit points. armor defaults to 0. */
export const Health = {
  current: [] as number[],
  max: [] as number[],
  armor: [] as number[],
};

/** Incoming damage (removed after processing by DamageSystem). */
export const Damage = {
  amount: [] as number[],
  source: [] as number[],       // entity ID
  knockbackX: [] as number[],
  knockbackY: [] as number[],
  knockbackZ: [] as number[],
};

/**
 * Player weapon state.
 * kind: 0=fist, 1=pistol, 2=shotgun, 3=chaingun, 4=rocket, etc.
 */
export const WeaponState = {
  kind: [] as number[],
  ammo: [] as number[],
  maxAmmo: [] as number[],
  cooldown: [] as number[],
  firing: [] as number[],
  reloading: [] as number[],
  reloadTimer: [] as number[],
};

/**
 * Enemy AI state.
 * behavior: 0=idle, 1=patrol, 2=pursue, 3=attack, 4=pain, 5=death
 * target: entity ID of current target, or 0 if none
 */
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
  patrolIdx: [] as number[],    // current waypoint index in patrol path
  patrolCount: [] as number[],  // number of waypoints (0 = no patrol)
};

/**
 * World pickup item.
 * kind: 0=health, 1=armor, 2=ammo, 3=weapon, 4=key
 * subKind: weapon/ammo type index (0 = none/default)
 */
export const Pickup = {
  kind: [] as number[],
  subKind: [] as number[],
  amount: [] as number[],
  respawn: [] as number[],
};

/** Sector door that opens/closes vertically. */
export const Door = {
  open: [] as number[],
  speed: [] as number[],
  openHeight: [] as number[],
  currentOffset: [] as number[],
  sectorId: [] as number[],
};

// ── Player ─────────────────────────────────────────────────────────────────

/** Marker component — exactly one entity carries this. */
export const PlayerTag = {} as Record<string, never>;

/**
 * Per-frame input state (read from InputManager, consumed by MovementSystem
 * and WeaponSystem). All boolean fields are 0/1.
 */
export const InputState = {
  forward: [] as number[],
  back: [] as number[],
  left: [] as number[],
  right: [] as number[],
  jump: [] as number[],
  crouch: [] as number[],
  fire: [] as number[],
  altFire: [] as number[],
  use: [] as number[],
  nextWeapon: [] as number[],
  prevWeapon: [] as number[],
  weaponSlot1: [] as number[],
  weaponSlot2: [] as number[],
  weaponSlot3: [] as number[],
  weaponSlot4: [] as number[],
  weaponSlot5: [] as number[],
  weaponSlot6: [] as number[],
  weaponSlot7: [] as number[],
  mouseX: [] as number[],
  mouseY: [] as number[],
};

// ── Lifecycle ──────────────────────────────────────────────────────────────

/** Countdown timer — entity is destroyed when remaining <= 0. */
export const DespawnTimer = {
  remaining: [] as number[],
};

/** Temporary visual flash (damage flash, invulnerability flash). */
export const FlashTimer = {
  remaining: [] as number[],
  targetBrightness: [] as number[],
};
