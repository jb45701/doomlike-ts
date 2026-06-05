import {
  createWorld as bwCreateWorld,
  addEntity as bwAddEntity,
  removeEntity as bwRemoveEntity,
  entityExists,
} from 'bitecs';
import type { World, EntityId } from 'bitecs';

/**
 * Create a new bitecs ECS world.
 * The world is a plain object that stores all component data and entity state.
 */
export function createWorld(): World {
  return bwCreateWorld();
}

/**
 * Create a new entity in the world.
 * Returns the numeric entity ID assigned by bitecs.
 */
export function createEntity(world: World): EntityId {
  return bwAddEntity(world);
}

/**
 * Remove an entity and all its components from the world.
 * Safe to call on already-destroyed entities (no-op if entity doesn't exist).
 */
export function destroyEntity(world: World, eid: EntityId): void {
  if (entityExists(world, eid)) {
    bwRemoveEntity(world, eid);
  }
}
