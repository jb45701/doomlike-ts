import { query, type World } from 'bitecs';
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
} from './Components';

// ── Spatial ────────────────────────────────────────────────────────────────

/** Entities with Position + Velocity — moved every frame. */
export function queryMovableEntities(world: World): ReturnType<typeof query> {
  return query(world, [Position, Velocity]);
}

/** Entities with Position + Rotation — need transform sync. */
export function queryTransformEntities(world: World): ReturnType<typeof query> {
  return query(world, [Position, Rotation]);
}

// ── Physics ────────────────────────────────────────────────────────────────

/** Physical bodies (collider + rigid body). */
export function queryPhysicsBodies(world: World): ReturnType<typeof query> {
  return query(world, [Collider, RigidBody]);
}

/** Static colliders (collider, no rigid body). */
export function queryStaticColliders(world: World): ReturnType<typeof query> {
  return query(world, [Collider]);
}

// ── Rendering ──────────────────────────────────────────────────────────────

/** Entities that need a visual representation. */
export function queryRenderableEntities(world: World): ReturnType<typeof query> {
  return query(world, [Position, Renderable]);
}

/** Animated sprites. */
export function queryAnimatedEntities(world: World): ReturnType<typeof query> {
  return query(world, [AnimState, Renderable, Position]);
}

// ── Gameplay ───────────────────────────────────────────────────────────────

/** Entities with damage to apply. */
export function queryDamageEntities(world: World): ReturnType<typeof query> {
  return query(world, [Damage]);
}

/** Entities with health (alive or dead). */
export function queryHealthEntities(world: World): ReturnType<typeof query> {
  return query(world, [Health]);
}

/** Enemy entities. */
export function queryEnemyEntities(world: World): ReturnType<typeof query> {
  return query(world, [EnemyAI, Position, Health]);
}

/** Pickup items. */
export function queryPickups(world: World): ReturnType<typeof query> {
  return query(world, [Pickup, Position]);
}

/** Doors. */
export function queryDoors(world: World): ReturnType<typeof query> {
  return query(world, [Door]);
}

// ── Player ─────────────────────────────────────────────────────────────────

/** The single player entity (exactly one). */
export function queryPlayerEntity(world: World): ReturnType<typeof query> {
  return query(world, [PlayerTag, Position, InputState]);
}

/** Player with weapon data. */
export function queryPlayerCombat(world: World): ReturnType<typeof query> {
  return query(world, [PlayerTag, WeaponState, InputState]);
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

/** Entities with active despawn timers. */
export function queryDespawningEntities(world: World): ReturnType<typeof query> {
  return query(world, [DespawnTimer]);
}

// ── Projectile ─────────────────────────────────────────────────────────────

/** Active projectiles (moving + damaging + timed). */
export function queryProjectiles(world: World): ReturnType<typeof query> {
  return query(world, [Position, Velocity, Damage, DespawnTimer]);
}
