/**
 * ProjectileSystem — detects wall/object collision for projectile entities
 * and handles impact despawning.
 *
 * Processing order (called after PhysicsSystem):
 *   1. Query entities with Position + Velocity + Collider + Damage (projectiles)
 *   2. Check each projectile's velocity — if speed dropped below threshold
 *      (meaning Rapier resolved a wall/floor collision), treat as impact
 *   3. Emit weapon_impact event, remove from physics, destroy entity
 *   4. DespawnTimer is the timeout fallback (handled by DespawnSystem)
 *
 * Lifecycle:
 *   ProjectileSystem(world, physics, bodyMap);
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
} from '../ecs/Components';
import { queryProjectiles } from '../ecs/queries';
import type { EcsWorld } from '../ecs/World';
import type { RapierContext } from '../physics/RapierWorld';
import type { PhysicsBodyMap } from './PhysicsSystem';
import { emitEvent } from '../events/GameEvents';

/** Velocity threshold below which a projectile is considered stopped. */
const MIN_SPEED = 5;

export function ProjectileSystem(
  world: EcsWorld,
  physics: RapierContext,
  bodyMap: PhysicsBodyMap,
): void {
  const entities = queryProjectiles(world);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];

    const bodyHandle = bodyMap.handles.get(eid);
    if (bodyHandle === undefined) continue;

    // Read back velocity from Rapier (after physics step resolved collisions)
    const vel = physics.getBodyVelocity(bodyHandle);
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);

    if (speed > MIN_SPEED) continue;

    // ── Impact detected ──────────────────────────────────────────────────
    // Projectile has stopped — Rapier resolved a wall/floor/object collision.

    // Get position for the impact event
    const pos = physics.getBodyTranslation(bodyHandle);

    emitEvent({
      type: 'weapon_impact',
      surface: 'wall',
      position: { x: pos.x, y: pos.y, z: pos.z },
    });

    // Track which entity fired this projectile (for future kill attribution)
    // Damage.source[eid] holds the shooter entity ID.

    // Remove from physics world
    const colliderHandle = bodyMap.colliders.get(eid);
    if (colliderHandle !== undefined) {
      physics.removeCollider(colliderHandle);
    }
    bodyMap.handles.delete(eid);
    bodyMap.colliders.delete(eid);

    // Remove ECS components and entity
    removeComponent(world, eid, Position);
    removeComponent(world, eid, Velocity);
    removeComponent(world, eid, Collider);
    removeComponent(world, eid, RigidBody);
    removeComponent(world, eid, Damage);
    removeComponent(world, eid, DespawnTimer);
    removeComponent(world, eid, Renderable);
    removeEntity(world, eid);
  }
}
