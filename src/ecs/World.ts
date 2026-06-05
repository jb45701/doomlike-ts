/**
 * ECS World — bitecs world initialization and entity lifecycle helpers.
 *
 * Uses the bitecs core API (createWorld, addEntity, removeEntity).
 * The world stores all component data in typed arrays (SoA layout).
 * Entity IDs are positive integers (1-indexed) and may be reused
 * after the internal generation counter increments.
 *
 * Lifecycle:
 *   const world = createEcsWorld();
 *   const eid = createEntity(world);
 *   destroyEntity(world, eid);
 */
import { createWorld, addEntity, removeEntity, entityExists } from 'bitecs';
import type { World as BitecsWorld } from 'bitecs';

/** The world object used throughout the ECS. Wraps bitecs' World type. */
export type EcsWorld = BitecsWorld;

/**
 * Create a new ECS world.
 * The world stores all component data in SoA (Structure of Arrays) layout --
 * each numeric component field is a typed array indexed by entity ID.
 */
export function createEcsWorld(): EcsWorld {
  return createWorld();
}

/**
 * Create a new entity in the world and return its numeric ID.
 * Entity IDs are monotonically increasing within a generation.
 */
export function createEntity(world: EcsWorld): number {
  return addEntity(world);
}

/**
 * Remove an entity and all its components from the world.
 * Safe to call on already-removed entities — the entityExists
 * guard prevents double-removal warnings.
 */
export function destroyEntity(world: EcsWorld, eid: number): void {
  if (entityExists(world, eid)) {
    removeEntity(world, eid);
  }
}
