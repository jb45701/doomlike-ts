import { defineQuery } from 'bitecs/legacy';

import {
  Position,
  Rotation,
  Velocity,
  Collider,
  RigidBody,
  Renderable,
  AnimState,
  Health,
  Damage,
  WeaponState,
  EnemyAI,
  Pickup,
  Door,
  PlayerTag,
  InputState,
  DespawnTimer,
  FlashTimer,
} from './Components';

// ── Spatial ──────────────────────────────────────────────
/** Entities with position and velocity — apply movement processing. */
export const movableQuery = defineQuery([Position, Velocity]);

/** Entities with position and rotation — sync visual transforms. */
export const transformQuery = defineQuery([Position, Rotation]);

// ── Rendering ────────────────────────────────────────────
/** Entities with position and a renderable — visible in the scene. */
export const renderableQuery = defineQuery([Position, Renderable]);

/** Entities with animation state — advance frame timing. */
export const animatedQuery = defineQuery([Position, Renderable, AnimState]);

// ── Physics ──────────────────────────────────────────────
/** Entities with physics representation — sync to Rapier. */
export const physicsQuery = defineQuery([Position, Collider, RigidBody, Velocity]);

// ── Player ───────────────────────────────────────────────
/** The single player entity with input, position, and weapon. */
export const playerQuery = defineQuery([PlayerTag, InputState, Position]);

/** Player plus full gameplay state. */
export const playerFullQuery = defineQuery([
  PlayerTag, InputState, Position, Rotation, Velocity, Health, WeaponState,
]);

// ── Enemies ──────────────────────────────────────────────
/** All enemy entities with AI, position, and health. */
export const enemyQuery = defineQuery([EnemyAI, Position, Health]);

/** Enemy with renderable (for animation system to set sprite state). */
export const enemyRenderableQuery = defineQuery([EnemyAI, Position, Renderable]);

// ── Combat ───────────────────────────────────────────────
/** Projectiles — moving entities that deal damage. */
export const projectileQuery = defineQuery([Position, Velocity, Damage, DespawnTimer]);

/** Entities that have been dealt damage this frame. */
export const damageQuery = defineQuery([Damage]);

/** Entities with non-zero health — candidates for damage/death. */
export const healthQuery = defineQuery([Health]);

/** Dead entities (Health.current <= 0) are found at runtime via healthQuery + filter. */

// ── Gameplay Objects ─────────────────────────────────────
/** All doors. */
export const doorQuery = defineQuery([Door]);

/** All pickups. */
export const pickupQuery = defineQuery([Pickup, Position]);

// ── Lifecycle ────────────────────────────────────────────
/** Entities scheduled for automatic cleanup. */
export const despawnQuery = defineQuery([DespawnTimer]);
