import { createWorld, addEntity, removeEntity } from 'bitecs';
import type { World as BitecsWorld } from 'bitecs';

// ── Types ────────────────────────────────────────────────
/** The world object used throughout the ECS. */
export type EcsWorld = BitecsWorld;

// ── World Creation ───────────────────────────────────────
/**
 * Create a new bitecs ECS world.
 * The world is a plain object that holds entity component data in
 * typed SoA (Structure of Arrays) storage. Systems query entities
 * by their component composition and process them each frame.
 *
 * Usage:
 * ```ts
 * const world = createEcsWorld();
 * const eid = createEntity(world);
 * addComponent(world, eid, Position);
 * Position.x[eid] = 10;
 * ```
 */
export function createEcsWorld(): EcsWorld {
  return createWorld();
}

// ── Entity Helpers ───────────────────────────────────────
/**
 * Create a new entity in the world.
 * Returns the numeric entity ID (eid). Components must be added
 * separately via addComponent().
 *
 * @param world - The ECS world
 * @returns A new unique entity ID
 */
export function createEntity(world: EcsWorld): number {
  return addEntity(world);
}

/**
 * Destroy an entity and remove all its components.
 * The entity ID may be reused after destruction.
 *
 * @param world - The ECS world
 * @param eid - The entity ID to destroy
 */
export function destroyEntity(world: EcsWorld, eid: number): void {
  removeEntity(world, eid);
}
