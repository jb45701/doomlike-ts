/**
 * ECS Query definitions — reusable queries for systems.
 *
 * Uses the bitecs new API `query()` which operates on component references.
 * Each function returns a `QueryResult` (read-only array of entity IDs).
 *
 * Usage:
 *   for (const eid of queryRenderableEntities(world)) {
 *     // eid is a valid entity with Position + Renderable
 *   }
 */
import { query, Not } from 'bitecs';
import type { World, QueryResult } from 'bitecs';
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

// ── Re-export query operators for convenience ──────────────────────────────
export { Not } from 'bitecs';
export type { World };

/** Convenience type alias for query results (read-only array of entity IDs). */
export type Entities = QueryResult;

// ── Spatial queries ────────────────────────────────────────────────────────

/** Entities with Position + Velocity — moved every frame by MovementSystem. */
export function queryMovableEntities(world: World): Entities {
  return query(world, [Position, Velocity]);
}

/** Entities with Position + Rotation — need transform sync. */
export function queryTransformEntities(world: World): Entities {
  return query(world, [Position, Rotation]);
}

// ── Physics queries ────────────────────────────────────────────────────────

/** Physical bodies (collider + rigid body). */
export function queryPhysicsBodies(world: World): Entities {
  return query(world, [Collider, RigidBody]);
}

/** Static bodies (collider but no rigid body). */
export function queryStaticColliders(world: World): Entities {
  return query(world, [Collider, Not(RigidBody)]);
}

// ── Rendering queries ──────────────────────────────────────────────────────

/** Entities that need a visual representation. */
export function queryRenderableEntities(world: World): Entities {
  return query(world, [Position, Renderable]);
}

/** Animated sprites. */
export function queryAnimatedEntities(world: World): Entities {
  return query(world, [AnimState, Renderable, Position]);
}

// ── Gameplay queries ───────────────────────────────────────────────────────

/** Entities with damage to apply. */
export function queryDamageEntities(world: World): Entities {
  return query(world, [Damage]);
}

/** Dead entities (health <= 0). Need DeathSystem + optional Pickup spawn. */
export function queryDeadEntities(world: World): Entities {
  return query(world, [Health, Not(Damage)]);
}

/** Enemy entities. */
export function queryEnemyEntities(world: World): Entities {
  return query(world, [EnemyAI, Position, Health]);
}

/** Enemies in pursuit mode. */
export function queryPursuingEnemies(world: World): Entities {
  return query(world, [EnemyAI, Position, Velocity]);
}

/** Pickup items in the world. */
export function queryPickups(world: World): Entities {
  return query(world, [Pickup, Position]);
}

/** Sectors with doors. */
export function queryDoors(world: World): Entities {
  return query(world, [Door]);
}

// ── Player queries ─────────────────────────────────────────────────────────

/** The player entity (exactly one). */
export function queryPlayerEntity(world: World): Entities {
  return query(world, [PlayerTag, Position, InputState]);
}

/** Player with weapon data. */
export function queryPlayerCombat(world: World): Entities {
  return query(world, [PlayerTag, WeaponState, InputState]);
}

// ── Lifecycle queries ──────────────────────────────────────────────────────

/** Entities with active despawn timers. */
export function queryDespawningEntities(world: World): Entities {
  return query(world, [DespawnTimer]);
}

/** Entities with active flash timers. */
export function queryFlashingEntities(world: World): Entities {
  return query(world, [FlashTimer]);
}

// ── Projectile queries ─────────────────────────────────────────────────────

/** Active projectiles (moving + damaging + timed). */
export function queryProjectiles(world: World): Entities {
  return query(world, [Position, Velocity, Damage, DespawnTimer]);
}
