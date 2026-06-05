import { createWorld, addEntity, removeEntity, entityExists } from 'bitecs';
import type { World as BitecsWorld } from 'bitecs';

export type EcsWorld = BitecsWorld;

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
