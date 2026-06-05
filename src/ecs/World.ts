import { createWorld, addEntity, removeEntity, entityExists } from 'bitecs';
import type { World as BitecsWorld } from 'bitecs';

// ── Types ────────────────────────────────────────────────
/** The world object used throughout the ECS. */
export type EcsWorld = BitecsWorld;

export function createEntity(world: World): EntityId {
  return addEntity(world);
}

export function destroyEntity(world: World, eid: EntityId): void {
  removeEntity(world, eid);
}
