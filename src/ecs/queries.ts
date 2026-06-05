import { query, Not, type World } from 'bitecs';
import type { QueryResult } from 'bitecs';
import {
  Position,
  Velocity,
  Rotation,
  Renderable,
  AnimState,
  Damage,
  Health,
  EnemyAI,
  Door,
  Pickup,
  PlayerTag,
  InputState,
  DespawnTimer,
  FlashTimer,
  RigidBody,
  Collider,
  WeaponState,
} from './Components';

export type { QueryResult };

/**
 * Helper: spread a QueryResult (Uint32Array) into a plain number[].
 * Useful for functional pipelines.
 */
export function toArray(result: QueryResult): number[] {
  return Array.from(result);
}

// ── Spatial Queries ─────────────────────────────────────

/** Entities that move each frame (have both position and velocity). */
export function movableEntities(world: World): QueryResult {
  return query(world, [Position, Velocity]);
}

/** Entities with a position that can be rendered. */
export function positionedEntities(world: World): QueryResult {
  return query(world, [Position]);
}

// ── Rendering Queries ───────────────────────────────────

/** Fully renderable entities (position + rotation + visual). */
export function renderableEntities(world: World): QueryResult {
  return query(world, [Position, Rotation, Renderable]);
}

/** Animated sprites/meshes (renderable + animation state). */
export function animatedEntities(world: World): QueryResult {
  return query(world, [Position, Rotation, Renderable, AnimState]);
}

// ── Physics Queries ─────────────────────────────────────

/** Entities with physics colliders. */
export function collidableEntities(world: World): QueryResult {
  return query(world, [Position, Collider]);
}

/** Dynamic physics bodies. */
export function physicsBodies(world: World): QueryResult {
  return query(world, [Position, Collider, RigidBody]);
}

// ── Projectile Queries ──────────────────────────────────

/** Projectiles (position + velocity + damage payload). */
export function projectileEntities(world: World): QueryResult {
  return query(world, [Position, Velocity, Damage]);
}

// ── Gameplay Queries ────────────────────────────────────

/** All enemies (have EnemyAI + Position). */
export function enemyEntities(world: World): QueryResult {
  return query(world, [EnemyAI, Position]);
}

/** All doors. */
export function doorEntities(world: World): QueryResult {
  return query(world, [Door]);
}

/** All pickups. */
export function pickupEntities(world: World): QueryResult {
  return query(world, [Pickup, Position]);
}

/** Player entity (singleton — at most one). */
export function playerEntity(world: World): QueryResult {
  return query(world, [PlayerTag, InputState, Position]);
}

/** Player entity with weapon state (for weapon/input processing). */
export function playerWithWeapon(world: World): QueryResult {
  return query(world, [PlayerTag, InputState, Position, WeaponState]);
}

/** Player entity with health (for damage/HUD processing). */
export function playerWithHealth(world: World): QueryResult {
  return query(world, [PlayerTag, Health]);
}

/** Player for death check. */
export function playerWithHealthAndWeapon(world: World): QueryResult {
  return query(world, [PlayerTag, Health, WeaponState]);
}

// ── Lifecycle Queries ───────────────────────────────────

/** Entities that will despawn when their timer runs out. */
export function despawningEntities(world: World): QueryResult {
  return query(world, [DespawnTimer]);
}

/** Entities with active visual flash. */
export function flashingEntities(world: World): QueryResult {
  return query(world, [FlashTimer]);
}

// ── Combined / Convenience Queries ──────────────────────

/** Entities that can take damage (have health + position). */
export function damageableEntities(world: World): QueryResult {
  return query(world, [Position, Health]);
}

/** Entities with weapon state (player weapon or turret). */
export function armedEntities(world: World): QueryResult {
  return query(world, [WeaponState]);
}

/** Non-player entities with health (enemies). */
export function nonPlayerHealthEntities(world: World): QueryResult {
  return query(world, [Health, Not(PlayerTag)]);
}
