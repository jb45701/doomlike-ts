/**
 * DespawnSystem — decrements DespawnTimer on entities and removes them
 * when the timer reaches zero.
 *
 * Lifecycle:
 *   DespawnSystem(world, physics, bodyMap);
 *
 * Must run after all other systems that might interact with entities.
 */

import { removeComponent, removeEntity } from 'bitecs';
import {
  Position,
  Velocity,
  Collider,
  RigidBody,
  Damage,
  DespawnTimer,
  Renderable,
  AnimState,
} from '../ecs/Components';
import { queryDespawningEntities } from '../ecs/queries';
import type { EcsWorld } from '../ecs/World';
import type { RapierContext } from '../physics/RapierWorld';
import type { PhysicsBodyMap } from './PhysicsSystem';

export function DespawnSystem(
  world: EcsWorld,
  physics: RapierContext,
  bodyMap: PhysicsBodyMap,
  deltaTime: number,
): void {
  const entities = queryDespawningEntities(world);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];

    const remaining = (DespawnTimer.remaining[eid] ?? 0) - deltaTime;

    if (remaining > 0) {
      DespawnTimer.remaining[eid] = remaining;
      continue;
    }

    // ── Timer expired — remove entity ─────────────────────────────────────

    // Remove Rapier physics body
    const colliderHandle = bodyMap.colliders.get(eid);
    if (colliderHandle !== undefined) {
      physics.removeCollider(colliderHandle);
    }
    bodyMap.handles.delete(eid);
    bodyMap.colliders.delete(eid);

    // Remove all standard components
    removeComponent(world, eid, Position);
    removeComponent(world, eid, Velocity);
    removeComponent(world, eid, Collider);
    removeComponent(world, eid, RigidBody);
    removeComponent(world, eid, Damage);
    removeComponent(world, eid, DespawnTimer);
    removeComponent(world, eid, Renderable);
    removeComponent(world, eid, AnimState);

    // Destroy the entity
    removeEntity(world, eid);
  }
}
