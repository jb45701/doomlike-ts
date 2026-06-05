/**
 * ECS Query definitions — reusable query functions for systems.
 *
 * Uses the bitecs main API query() on component references.
 * Each function returns a QueryResult (read-only array of entity IDs).
 *
 * Usage:
 *   for (const eid of queryRenderableEntities(world)) {
 *     // eid has Position + Renderable
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

// ── Re-export for convenience ─────────────────────────────────────────────
export { Not } from 'bitecs';
export type { World };

/** Type alias for query results (read-only entity ID array). */
export type Entities = QueryResult;

// ── Spatial ───────────────────────────────────────────────────────────────

export function queryMovableEntities(world: World): Entities {
  return query(world, [Position, Velocity]);
}

export function queryTransformEntities(world: World): Entities {
  return query(world, [Position, Rotation]);
}

// ── Physics ───────────────────────────────────────────────────────────────

export function queryPhysicsBodies(world: World): Entities {
  return query(world, [Collider, RigidBody]);
}

export function queryStaticColliders(world: World): Entities {
  return query(world, [Collider, Not(RigidBody)]);
}

// ── Rendering ─────────────────────────────────────────────────────────────

export function queryRenderableEntities(world: World): Entities {
  return query(world, [Position, Renderable]);
}

export function queryAnimatedEntities(world: World): Entities {
  return query(world, [AnimState, Renderable, Position]);
}

// ── Gameplay ──────────────────────────────────────────────────────────────

export function queryDamageEntities(world: World): Entities {
  return query(world, [Damage]);
}

export function queryDeadEntities(world: World): Entities {
  return query(world, [Health, Not(Damage)]);
}

export function queryEnemyEntities(world: World): Entities {
  return query(world, [EnemyAI, Position, Health]);
}

export function queryPursuingEnemies(world: World): Entities {
  return query(world, [EnemyAI, Position, Velocity]);
}

export function queryPickups(world: World): Entities {
  return query(world, [Pickup, Position]);
}

export function queryDoors(world: World): Entities {
  return query(world, [Door]);
}

// ── Player ────────────────────────────────────────────────────────────────

export function queryPlayerEntity(world: World): Entities {
  return query(world, [PlayerTag, Position, InputState]);
}

export function queryPlayerCombat(world: World): Entities {
  return query(world, [PlayerTag, WeaponState, InputState]);
}

// ── Lifecycle ─────────────────────────────────────────────────────────────

export function queryDespawningEntities(world: World): Entities {
  return query(world, [DespawnTimer]);
}

export function queryFlashingEntities(world: World): Entities {
  return query(world, [FlashTimer]);
}

// ── Projectiles ───────────────────────────────────────────────────────────

export function queryProjectiles(world: World): Entities {
  return query(world, [Position, Velocity, Damage, DespawnTimer]);
}
