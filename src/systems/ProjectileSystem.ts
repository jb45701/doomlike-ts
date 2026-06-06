/**
 * ProjectileSystem — detects wall/entity collision for projectile entities
 * and applies damage to target entities.
 *
 * Processing order (called after PhysicsSystem, before DamageSystem):
 *   1. Query projectile entities (Position + Velocity + DespawnTimer + Renderable)
 *   2. For each projectile, check if Rapier has resolved a collision
 *      by reading back velocity — if speed dropped below threshold, treat as impact
 *   3. On impact, use getContactColliders() to find touching colliders,
 *      look up their ECS entities via the reverse collider→entity map,
 *      and apply Damage to any valid target (entity with Health, not the shooter)
 *   4. Set a short DespawnTimer to route cleanup through DespawnSystem
 *      (single source of truth for entity removal)
 *
 * Lifecycle:
 *   ProjectileSystem(world, physics, bodyMap);
 */

import { addComponent, hasComponent } from 'bitecs';
import {
  Health,
  Damage,
  DespawnTimer,
} from '../ecs/Components';
import { queryProjectiles } from '../ecs/queries';
import type { EcsWorld } from '../ecs/World';
import type { RapierContext } from '../physics/RapierWorld';
import type { PhysicsBodyMap } from './PhysicsSystem';
import { emitEvent } from '../events/GameEvents';

/** Velocity threshold below which a projectile is considered stopped. */
const MIN_SPEED = 5;
/** Short despawn timer (seconds) for projectile cleanup via DespawnSystem. */
const IMPACT_DESPAWN_TIME = 0.001;

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
    // Rapier resolved a collision — projectile has stopped.

    // Get collider handle for contact detection
    const colliderHandle = bodyMap.colliders.get(eid);
    if (colliderHandle === undefined) continue;

    // Show information about the projectile's shooter for attribution
    const shooterEid = Damage.source[eid]; // still set from handleProjectile

    // Find all colliders touching the projectile post-collision
    const contactColliders = physics.getContactColliders(colliderHandle);

    let hitEntity = false;
    for (const otherColliderHandle of contactColliders) {
      const targetEid = physics.lookupEntityByCollider(otherColliderHandle);
      if (targetEid === undefined) continue;                      // wall — no entity
      if (targetEid === shooterEid) continue;                      // don't hit the shooter
      if (!hasComponent(world, targetEid, Health)) continue;       // not a damageable entity

      // ── Apply damage to target ──────────────────────────────────────
      if (!hasComponent(world, targetEid, Damage)) {
        addComponent(world, targetEid, Damage);
      }
      Damage.amount[targetEid] = (Damage.amount[targetEid] ?? 0) + (Damage.amount[eid] ?? 0);
      Damage.source[targetEid] = shooterEid;
      hitEntity = true;
    }

    // Get position for the impact event
    const pos = physics.getBodyTranslation(bodyHandle);
    emitEvent({
      type: 'weapon_impact',
      surface: hitEntity ? 'flesh' : 'wall',
      position: { x: pos.x, y: pos.y, z: pos.z },
    });

    // Route cleanup through DespawnSystem (single source of truth)
    DespawnTimer.remaining[eid] = IMPACT_DESPAWN_TIME;
  }
}
