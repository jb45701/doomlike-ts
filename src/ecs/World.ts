import { createWorld, addEntity, removeEntity, entityExists } from 'bitecs';

/** The world object used throughout the ECS. */
export type EcsWorld = ReturnType<typeof createWorld>;

/** Create a new bitecs ECS world for this game. */
export function createEcsWorld(): EcsWorld {
  return createWorld();
}

/** Create a new entity in the world. Returns the numeric entity ID. */
export function createEntity(world: EcsWorld): number {
  return addEntity(world);
}

/**
 * Destroy an entity and remove all its components.
 * Has a safety guard: only calls removeEntity if the entity exists,
 * to prevent internal state corruption in bitecs.
 */
export function destroyEntity(world: EcsWorld, eid: number): void {
  if (entityExists(world, eid)) {
    removeEntity(world, eid);
  }
}
