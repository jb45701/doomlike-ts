import { soa } from 'bitecs';

// ── Spatial ──────────────────────────────────────────

/** Position in 3D world space */
export const Position = soa({
  x: Float64Array,
  y: Float64Array,
  z: Float64Array,
});

/** Euler angles (yaw around Y, pitch around X, roll around Z) */
export const Rotation = soa({
  yaw: Float64Array,
  pitch: Float64Array,
  roll: Float64Array,
});

/** Linear velocity in units per second */
export const Velocity = soa({
  dx: Float64Array,
  dy: Float64Array,
  dz: Float64Array,
});

// ── Physics ──────────────────────────────────────────

/** Collision shape attached to an entity */
export const Collider = soa({
  shape: Uint8Array,       // 0=capsule, 1=box, 2=sphere, 3=ray
  radius: Float64Array,
  height: Float64Array,
  halfExtentsX: Float64Array,
  halfExtentsY: Float64Array,
  halfExtentsZ: Float64Array,
});

/** Rigid body physics properties */
export const RigidBody = soa({
  mass: Float64Array,
  grounded: Uint8Array,    // boolean: 0=false, 1=true
});

// ── Rendering ────────────────────────────────────────

/** Visual representation of an entity */
export const Renderable = soa({
  kind: Uint8Array,        // 0=billboard, 1=mesh, 2=static_mesh
  resourceId: Uint16Array, // index into a shared resource table (string indirection)
  scale: Float64Array,
  brightness: Float64Array,
});

/** Animation state for sprite-sheet or model animations */
export const AnimState = soa({
  current: Uint8Array,     // animation name index
  frame: Uint32Array,
  timer: Float64Array,
  fps: Float64Array,
});

// ── Gameplay ─────────────────────────────────────────

/** Health pool with optional armor */
export const Health = soa({
  current: Float64Array,
  max: Float64Array,
  armor: Float64Array,
});

/** Damage payload — applied to target by DamageSystem */
export const Damage = soa({
  amount: Float64Array,
  sourceX: Float64Array,
  sourceY: Float64Array,
  sourceZ: Float64Array,
  knockbackX: Float64Array,
  knockbackY: Float64Array,
  knockbackZ: Float64Array,
});

/** Player weapon state */
export const WeaponState = soa({
  kind: Uint8Array,        // weapon type index
  ammo: Float64Array,
  maxAmmo: Float64Array,
  cooldown: Float64Array,
  firing: Uint8Array,
  reloading: Uint8Array,
  reloadTimer: Float64Array,
});

/** Enemy AI state machine */
export const EnemyAI = soa({
  behavior: Uint8Array,    // 0=idle, 1=patrol, 2=pursue, 3=attack, 4=pain, 5=death
  sightRange: Float64Array,
  attackRange: Float64Array,
  speed: Float64Array,
  painChance: Float64Array,
  lastKnownX: Float64Array,
  lastKnownY: Float64Array,
  lastKnownZ: Float64Array,
  target: Uint32Array,     // target entity ID
});

/** Pickup item on the ground */
export const Pickup = soa({
  kind: Uint8Array,        // 0=health, 1=armor, 2=ammo, 3=weapon, 4=key
  subKind: Uint8Array,     // subtype index
  amount: Float64Array,
  respawn: Uint8Array,
});

/** Door that opens/closes */
export const Door = soa({
  open: Uint8Array,
  speed: Float64Array,
  openHeight: Float64Array,
  currentOffset: Float64Array,
  sectorId: Uint32Array,
});

// ── Player ───────────────────────────────────────────

/** Marker: exactly one entity should have this */
export const PlayerTag = soa({});

/** Raw input state — written by InputSystem each frame */
export const InputState = soa({
  forward: Uint8Array,
  back: Uint8Array,
  left: Uint8Array,
  right: Uint8Array,
  jump: Uint8Array,
  crouch: Uint8Array,
  fire: Uint8Array,
  altFire: Uint8Array,
  use: Uint8Array,
  nextWeapon: Uint8Array,
  prevWeapon: Uint8Array,
  weaponSlot1: Uint8Array,
  weaponSlot2: Uint8Array,
  weaponSlot3: Uint8Array,
  weaponSlot4: Uint8Array,
  weaponSlot5: Uint8Array,
  weaponSlot6: Uint8Array,
  weaponSlot7: Uint8Array,
  mouseX: Float64Array,
  mouseY: Float64Array,
});

// ── Lifecycle ────────────────────────────────────────

/** Timer that auto-destroys entity when it reaches zero */
export const DespawnTimer = soa({
  remaining: Float64Array,
});

/** Timer + target brightness for flash effects (invuln, damage) */
export const FlashTimer = soa({
  remaining: Float64Array,
  targetBrightness: Float64Array,
});
