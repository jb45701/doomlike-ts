/**
 * ECS World — bitecs world initialization and entity lifecycle helpers.
 *
 * Uses the bitecs core API (createWorld, addEntity, removeEntity)
 * which is shared between the base and legacy APIs.
 */
import { createWorld as createBitecsWorld, addEntity, removeEntity } from 'bitecs';
import type { World, EntityId } from 'bitecs';

/**
 * Create a new ECS world.
 * The world stores all component data in typed arrays (SoA layout).
 */
export function createECSWorld<T extends object = {}>(): World<T> {
  return createBitecsWorld<T>();
}

/**
 * Create a new entity in the world and return its ID.
 * Entity IDs are positive integers (1-indexed).
 */
export function createEntity(world: World): EntityId {
  return addEntity(world);
}

/**
 * Remove an entity and all its components from the world.
 * The entity ID may be reused after the internal generation counter increments.
 */
export function destroyEntity(world: World, eid: EntityId): void {
  removeEntity(world, eid);
}
