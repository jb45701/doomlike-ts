// ──────────────────────────────────────────────────────────
// Component definitions for the Doom-like FPS ECS world.
//
// Each block below provides:
//   1. A TypeScript interface (for editor support & documentation)
//   2. A component store object (the bitecs identity + SoA typed arrays)
//   3. Enum/map helpers for non-numeric fields
//
// Usage pattern:
//   addComponent(world, eid, Position);
//   Position.x[eid] = 0;
//   Position.y[eid] = 41;
//   Position.z[eid] = 0;
// ──────────────────────────────────────────────────────────

// ── Enum helpers ──────────────────────────────────────────
// Stored as integers in Uint8Array / Float64Array fields.
// The const-asserted objects give switch-friendly numeric values.

export const ColliderShape = { Capsule: 0, Box: 1, Sphere: 2, Ray: 3 } as const;
export type ColliderShape = (typeof ColliderShape)[keyof typeof ColliderShape];

export const RenderableKind = { Billboard: 0, Mesh: 1, StaticMesh: 2 } as const;
export type RenderableKind = (typeof RenderableKind)[keyof typeof RenderableKind];

export const AIBehavior = { Idle: 0, Patrol: 1, Pursue: 2, Attack: 3, Pain: 4, Death: 5 } as const;
export type AIBehavior = (typeof AIBehavior)[keyof typeof AIBehavior];

export const PickupKind = { Health: 0, Armor: 1, Ammo: 2, Weapon: 3, Key: 4 } as const;
export type PickupKind = (typeof PickupKind)[keyof typeof PickupKind];

// ── String / id maps (non-SoA, per-entity) ───────────────
// These maps bridge between SoA numeric storage and string
// resources (texture paths, animation names, weapon kinds).
export const RenderableResourceId = new Map<number, string>();
export const AnimStateCurrent = new Map<number, string>();
export const WeaponStateKind = new Map<number, string>();
export const PickupSubKind = new Map<number, string>();

// ══════════════════════════════════════════════════════════
// SPATIAL
// ══════════════════════════════════════════════════════════

/** World position in 3D space. */
export interface Position {
  x: number;
  y: number;
  z: number;
}
export const Position = {
  x: [] as number[],
  y: [] as number[],
  z: [] as number[],
};

/** Euler rotation — yaw (horizontal) and pitch (vertical). Roll is optional. */
export interface Rotation {
  yaw: number;
  pitch: number;
  roll: number;
}
export const Rotation = {
  yaw: [] as number[],
  pitch: [] as number[],
  roll: [] as number[],
};

/** Velocity in world-space units per second. */
export interface Velocity {
  dx: number;
  dy: number;
  dz: number;
}
export const Velocity = {
  dx: [] as number[],
  dy: [] as number[],
  dz: [] as number[],
};

// ══════════════════════════════════════════════════════════
// PHYSICS
// ══════════════════════════════════════════════════════════

/** Collision shape attached to a physics body. */
export interface Collider {
  shape: ColliderShape;
  radius: number;
  height: number;
  halfExtentsX: number;
  halfExtentsY: number;
  halfExtentsZ: number;
}
export const Collider = {
  shape: [] as number[], // ColliderShape
  radius: [] as number[],
  height: [] as number[],
  halfExtentsX: [] as number[],
  halfExtentsY: [] as number[],
  halfExtentsZ: [] as number[],
};

/** Rigid body settings for physics simulation. */
export interface RigidBody {
  mass: number;
  grounded: boolean;
}
export const RigidBody = {
  mass: [] as number[],
  grounded: [] as number[], // 0 | 1
};

// ══════════════════════════════════════════════════════════
// RENDERING
// ══════════════════════════════════════════════════════════

/** Visual representation of an entity in the Three.js scene. */
export interface Renderable {
  kind: RenderableKind;
  resourceId: string; // stored in RenderableResourceId map
  scale: number;
  brightness: number;
}
export const Renderable = {
  kind: [] as number[], // RenderableKind
  scale: [] as number[],
  brightness: [] as number[],
};

/** Sprite / mesh animation state. */
export interface AnimState {
  current: string; // stored in AnimStateCurrent map
  frame: number;
  timer: number;
  fps: number;
}
export const AnimState = {
  frame: [] as number[],
  timer: [] as number[],
  fps: [] as number[],
};

// ══════════════════════════════════════════════════════════
// GAMEPLAY
// ══════════════════════════════════════════════════════════

/** Hit points and armour. */
export interface Health {
  current: number;
  max: number;
  armor: number;
}
export const Health = {
  current: [] as number[],
  max: [] as number[],
  armor: [] as number[],
};

/** Incoming damage payload — applied by DamageSystem. */
export interface Damage {
  amount: number;
  source: number; // entity ID
  knockbackX: number;
  knockbackY: number;
  knockbackZ: number;
}
export const Damage = {
  amount: [] as number[],
  source: [] as number[], // entity ID
  knockbackX: [] as number[],
  knockbackY: [] as number[],
  knockbackZ: [] as number[],
};

/** Weapon state for the player (and possibly enemy weapons). */
export interface WeaponState {
  kind: string; // stored in WeaponStateKind map
  ammo: number;
  maxAmmo: number;
  cooldown: number;
  firing: boolean;
  reloading: boolean;
  reloadTimer: number;
}
export const WeaponState = {
  ammo: [] as number[],
  maxAmmo: [] as number[],
  cooldown: [] as number[],
  firing: [] as number[], // 0 | 1
  reloading: [] as number[], // 0 | 1
  reloadTimer: [] as number[],
};

/** Enemy AI state machine. */
export interface EnemyAI {
  behavior: AIBehavior;
  target: number; // entity ID
  sightRange: number;
  attackRange: number;
  speed: number;
  painChance: number;
  lastKnownPosX: number;
  lastKnownPosY: number;
  lastKnownPosZ: number;
}
export const EnemyAI = {
  behavior: [] as number[], // AIBehavior
  target: [] as number[], // entity ID
  sightRange: [] as number[],
  attackRange: [] as number[],
  speed: [] as number[],
  painChance: [] as number[],
  lastKnownPosX: [] as number[],
  lastKnownPosY: [] as number[],
  lastKnownPosZ: [] as number[],
};

/** World pickup that the player can collect. */
export interface Pickup {
  kind: PickupKind;
  subKind: string; // stored in PickupSubKind map
  amount: number;
  respawn: boolean;
}
export const Pickup = {
  kind: [] as number[], // PickupKind
  amount: [] as number[],
  respawn: [] as number[], // 0 | 1
};

/** Animated door for sector transitions. */
export interface Door {
  open: boolean;
  speed: number;
  openHeight: number;
  currentOffset: number;
  sectorId: number;
}
export const Door = {
  open: [] as number[], // 0 | 1
  speed: [] as number[],
  openHeight: [] as number[],
  currentOffset: [] as number[],
  sectorId: [] as number[],
};

// ══════════════════════════════════════════════════════════
// PLAYER
// ══════════════════════════════════════════════════════════

/** Marker component — exactly one entity carries this. No data. */
export interface PlayerTag {
}
export const PlayerTag = {} as Record<string, never>;

/** Raw input state, written each frame by InputSystem. */
export interface InputState {
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
  weaponSlot2: boolean;
  weaponSlot3: boolean;
  weaponSlot4: boolean;
  weaponSlot5: boolean;
  weaponSlot6: boolean;
  weaponSlot7: boolean;
  mouseX: number;
  mouseY: number;
}
export const InputState = {
  forward: [] as number[], // 0 | 1
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

// ══════════════════════════════════════════════════════════
// LIFECYCLE
// ══════════════════════════════════════════════════════════

/** Countdown timer — entity is destroyed when it reaches zero. */
export interface DespawnTimer {
  remaining: number;
}
export const DespawnTimer = {
  remaining: [] as number[],
};

/** Flash effect timer — e.g. invulnerability flash, damage flash. */
export interface FlashTimer {
  remaining: number;
  targetBrightness: number;
}
export const FlashTimer = {
  remaining: [] as number[],
  targetBrightness: [] as number[],
};
