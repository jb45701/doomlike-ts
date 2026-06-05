import { createWorld, addEntity, removeEntity, entityExists } from 'bitecs';

export type EcsWorld = ReturnType<typeof createWorld>;

export function createEcsWorld(): EcsWorld {
  return createWorld();
}

export function createEntity(world: EcsWorld): number {
  return addEntity(world);
}

export function destroyEntity(world: EcsWorld, eid: number): void {
  if (entityExists(world, eid)) {
    removeEntity(world, eid);
  }
}
