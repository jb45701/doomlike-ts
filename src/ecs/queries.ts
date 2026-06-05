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
export function queryMovableEntities(world: World): number[] {
  return query(world, [Position, Velocity]);
}

/** Entities with Position + Rotation — need transform sync. */
export function queryTransformEntities(world: World): number[] {
  return query(world, [Position, Rotation]);
}

// ── Physics queries ────────────────────────────────────────────────────────

/** Physical bodies (collider + rigid body). */
export function queryPhysicsBodies(world: World): number[] {
  return query(world, [Collider, RigidBody]);
}

/** Static bodies (collider but no rigid body). */
export function queryStaticColliders(world: World): number[] {
  return query(world, [Collider, Not(RigidBody)]);
}

// ── Rendering queries ──────────────────────────────────────────────────────

/** Entities that need a visual representation. */
export function queryRenderableEntities(world: World): number[] {
  return query(world, [Position, Renderable]);
}

/** Animated sprites. */
export function queryAnimatedEntities(world: World): number[] {
  return query(world, [AnimState, Renderable, Position]);
}

// ── Gameplay queries ───────────────────────────────────────────────────────

/** Entities with damage to apply. */
export function queryDamageEntities(world: World): number[] {
  return query(world, [Damage]);
}

/** Dead entities (health <= 0). Need DeathSystem + optional Pickup spawn. */
export function queryDeadEntities(world: World): number[] {
  return query(world, [Health, Not(Damage)]);
}

/** Enemy entities. */
export function queryEnemyEntities(world: World): number[] {
  return query(world, [EnemyAI, Position, Health]);
}

/** Enemies in pursuit mode. */
export function queryPursuingEnemies(world: World): number[] {
  return query(world, [EnemyAI, Position, Velocity]);
}

/** Pickup items in the world. */
export function queryPickups(world: World): number[] {
  return query(world, [Pickup, Position]);
}

/** Sectors with doors. */
export function queryDoors(world: World): number[] {
  return query(world, [Door]);
}

// ── Player queries ─────────────────────────────────────────────────────────

/** The player entity (exactly one). */
export function queryPlayerEntity(world: World): number[] {
  return query(world, [PlayerTag, Position, InputState]);
}

/** Player with weapon data. */
export function queryPlayerCombat(world: World): number[] {
  return query(world, [PlayerTag, WeaponState, InputState]);
}

// ── Lifecycle queries ──────────────────────────────────────────────────────

/** Entities with active despawn timers. */
export function queryDespawningEntities(world: World): number[] {
  return query(world, [DespawnTimer]);
}

/** Entities with active flash timers. */
export function queryFlashingEntities(world: World): number[] {
  return query(world, [FlashTimer]);
}

// ── Projectile queries ─────────────────────────────────────────────────────

/** Active projectiles (moving + damaging + timed). */
export function queryProjectiles(world: World): number[] {
  return query(world, [Position, Velocity, Damage, DespawnTimer]);
}
