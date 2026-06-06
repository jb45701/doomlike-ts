/**
 * weaponFire — Hitscan and projectile firing helpers for WeaponSystem.
 *
 * Exports:
 *   - handleHitscan(world, physics, eid, def): raycast and apply damage
 *   - handleProjectile(world, eid, def, physicsBodies): spawn projectile entity
 */

import { addComponent, addEntity, hasComponent } from 'bitecs';
import {
  Position,
  Rotation,
  Velocity,
  Collider,
  RigidBody,
  Damage,
  Health,
  DespawnTimer,
  Renderable,
  RenderableKind,
  ColliderShape,
} from '../ecs/Components';
import type { EcsWorld } from '../ecs/World';
import type { RapierContext, Vec3 } from '../physics/RapierWorld';
import type { WeaponDef } from './weaponDefs';
import { emitEvent } from '../events/GameEvents';
import { PLAYER_FLOOR_OFFSET, PROJECTILE_DESPAWN_TIME } from '../constants';

/** Max hitscan raycast range (units). */
const HITSCAN_RANGE = 2048;

// ── Fire direction ─────────────────────────────────────────────────────────

/**
 * Compute the fire direction from the player's rotation.
 */
export function getFireDirection(eid: number): Vec3 {
  const yaw = Rotation.yaw[eid] ?? 0;
  const pitch = Rotation.pitch[eid] ?? 0;
  const cosPitch = Math.cos(pitch);
  return {
    x: -Math.sin(yaw) * cosPitch,
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * cosPitch,
  };
}

// ── Hitscan ──────────────────────────────────────────────────────────────────

/**
 * Fire a hitscan weapon (pistol, shotgun).
 *
 * Performs one or more raycasts from the camera position in the fire direction.
 * On hit, looks up the target entity via the collider-to-entity reverse map
 * and applies Damage directly to that entity.
 */
export function handleHitscan(
  world: EcsWorld,
  physics: RapierContext,
  eid: number,
  def: WeaponDef,
): void {
  const origin: Vec3 = {
    x: Position.x[eid] ?? 0,
    y: (Position.y[eid] ?? 0) + PLAYER_FLOOR_OFFSET,
    z: Position.z[eid] ?? 0,
  };

  for (let p = 0; p < def.pellets; p++) {
    // Compute direction with spread
    let dir: Vec3;
    if (def.spread > 0 && def.pellets > 1) {
      const spreadPitch = (Math.random() - 0.5) * def.spread * 2;
      const spreadYaw = (Math.random() - 0.5) * def.spread * 2;
      const cosPitch = Math.cos(Rotation.pitch[eid] + spreadPitch);
      dir = {
        x: -Math.sin(Rotation.yaw[eid] + spreadYaw) * cosPitch,
        y: Math.sin(Rotation.pitch[eid] + spreadPitch),
        z: -Math.cos(Rotation.yaw[eid] + spreadYaw) * cosPitch,
      };
    } else {
      dir = getFireDirection(eid);
    }

    const hit = physics.raycast(origin, dir, HITSCAN_RANGE);
    if (!hit) continue;

    // Look up the entity that owns this collider
    const targetEid = physics.lookupEntityByCollider(hit.colliderHandle);
    if (targetEid !== undefined && hasComponent(world, targetEid, Health)) {
      // Apply damage to the target entity
      if (!hasComponent(world, targetEid, Damage)) {
        addComponent(world, targetEid, Damage);
      }
      Damage.amount[targetEid] = (Damage.amount[targetEid] ?? 0) + def.damage;
      Damage.source[targetEid] = eid;
      Damage.knockbackX[targetEid] = 0;
      Damage.knockbackY[targetEid] = 0;
      Damage.knockbackZ[targetEid] = 0;
    }

    // Emit impact event for visual feedback
    const surface = targetEid !== undefined ? 'flesh' : 'wall';
    emitEvent({
      type: 'weapon_impact',
      surface,
      position: hit.point,
    });
  }
}

// ── Projectile ───────────────────────────────────────────────────────────────

/**
 * Spawn a projectile entity for projectile weapons (chaingun, rocket launcher).
 *
 * The projectile entity has Position, Velocity, Collider, RigidBody,
 * DespawnTimer, and Renderable. Damage is also attached to carry the
 * payload (amount + shooter) for ProjectileSystem to copy to the target
 * on impact; DamageSystem filters it out because projectiles have no Health.
 */
export function handleProjectile(
  world: EcsWorld,
  eid: number,
  def: WeaponDef,
): void {
  const origin: Vec3 = {
    x: Position.x[eid] ?? 0,
    y: (Position.y[eid] ?? 0) + PLAYER_FLOOR_OFFSET,
    z: Position.z[eid] ?? 0,
  };
  const direction = getFireDirection(eid);

  // Apply slight random spread for chaingun
  let dir = direction;
  if (def.spread > 0) {
    const spreadPitch = (Math.random() - 0.5) * def.spread * 2;
    const spreadYaw = (Math.random() - 0.5) * def.spread * 2;
    const cosPitch = Math.cos(spreadPitch);
    dir = {
      x: -Math.sin(Rotation.yaw[eid] + spreadYaw) * cosPitch,
      y: Math.sin(Rotation.pitch[eid] + spreadPitch),
      z: -Math.cos(Rotation.yaw[eid] + spreadYaw) * cosPitch,
    };
  }

  // Spawn position: in front of the camera (to avoid self-collision)
  const spawnPos: Vec3 = {
    x: origin.x + dir.x * 48,
    y: origin.y + dir.y * 48,
    z: origin.z + dir.z * 48,
  };

  // Create the projectile entity with Damage payload (amount + shooter) for\n  // ProjectileSystem to relay to the target; DamageSystem skips projectiles
  const projEid = addEntity(world);
  addComponent(world, projEid, Position);
  addComponent(world, projEid, Velocity);
  addComponent(world, projEid, Collider);
  addComponent(world, projEid, RigidBody);
  addComponent(world, projEid, Damage);
  addComponent(world, projEid, DespawnTimer);
  addComponent(world, projEid, Renderable);

  // Position
  Position.x[projEid] = spawnPos.x;
  Position.y[projEid] = spawnPos.y;
  Position.z[projEid] = spawnPos.z;

  // Velocity — direction * speed
  Velocity.dx[projEid] = dir.x * def.projectileSpeed;
  Velocity.dy[projEid] = dir.y * def.projectileSpeed;
  Velocity.dz[projEid] = dir.z * def.projectileSpeed;

  // Collider (sphere)
  Collider.shape[projEid] = ColliderShape.Sphere;
  Collider.radius[projEid] = def.projectileRadius;
  Collider.height[projEid] = 0;

  // RigidBody (dynamic, gravity scale 0 handled by addDynamicSphere)
  RigidBody.mass[projEid] = 1;
  RigidBody.grounded[projEid] = false;

  // Damage — tracks the shooter for kill attribution (DamageSystem skips
  // projectiles because they have no Health)
  Damage.amount[projEid] = def.damage;
  Damage.source[projEid] = eid;
  Damage.knockbackX[projEid] = 0;
  Damage.knockbackY[projEid] = 0;
  Damage.knockbackZ[projEid] = 0;

  // Despawn — clean up after timeout
  DespawnTimer.remaining[projEid] = PROJECTILE_DESPAWN_TIME;

  // Renderable placeholder
  Renderable.kind[projEid] = RenderableKind.Mesh;
  Renderable.resourceId[projEid] = 'projectile';
  Renderable.scale[projEid] = def.projectileRadius * 2;
  Renderable.brightness[projEid] = 1; // fullbright
}
