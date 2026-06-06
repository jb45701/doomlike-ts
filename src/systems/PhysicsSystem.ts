/**
 * PhysicsSystem — Bridges ECS world ↔ Rapier physics world.
 *
 * Each frame:
 *   1. Queries entities with Collider + RigidBody (physics-managed bodies)
 *   2. For each entity, syncs ECS state to the Rapier body using
 *      kinematic translation (for kinematic bodies) or by setting
 *      velocity (for dynamic bodies).
 *   3. Steps the Rapier physics world (fixed 1/60s timestep with substeps).
 *   4. Reads back resolved positions/velocities from Rapier into ECS.
 *   5. Sets RigidBody.grounded based on contact normals.
 *
 * Lifecycle (called once per frame, after MovementSystem):
 *   PhysicsSystem(world, physics, bodyMap, dt);
 *
 * The bodyMap maps ECS entity IDs to Rapier body handles.
 * When an entity first appears with Collider+RigidBody, the PhysicsSystem
 * creates a corresponding Rapier body and records the mapping.
 */
import type { EcsWorld } from '../ecs/World';
import {
  Position,
  Velocity,
  Collider,
  RigidBody,
  ColliderShape,
} from '../ecs/Components';
import { queryPhysicsBodies } from '../ecs/queries';
import type { RapierContext, Vec3 } from '../physics/RapierWorld';
import { createPlayerCapsule } from '../physics/CollisionShapes';

/** Minimum Y velocity for considering the entity in freefall. */
const FREE_FALL_THRESHOLD = 5;

// ── Types ───────────────────────────────────────────────────────────────────

/** Tracks the mapping from ECS entity IDs to Rapier rigid body handles. */
export interface PhysicsBodyMap {
  /** Rapier body handle for each ECS entity with a physics body. */
  handles: Map<number, number>;
  /** Rapier collider handle for each ECS entity (used for grounded check). */
  colliders: Map<number, number>;
}

/**
 * Create an empty body map. Call once during game initialisation.
 */
export function createPhysicsBodyMap(): PhysicsBodyMap {
  return { handles: new Map(), colliders: new Map() };
}

// ── System ──────────────────────────────────────────────────────────────────

export function PhysicsSystem(
  world: EcsWorld,
  physics: RapierContext,
  bodyMap: PhysicsBodyMap,
  deltaTime: number,
): void {
  // Query physics-managed entities (Collider + RigidBody).
  // Position and Velocity are read directly per-entity rather than used
  // as query filters — they're always present on physics bodies but
  // should not gate the query.
  const entities = queryPhysicsBodies(world);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];
    const bodyHandle = bodyMap.handles.get(eid);

    if (bodyHandle === undefined) {
      // First encounter with this entity — create the Rapier body.
      createPhysicsBody(world, physics, bodyMap, eid);
    } else {
      // Existing body — sync ECS state → Rapier.
      syncToRapier(world, physics, bodyMap, eid, bodyHandle, deltaTime);
    }
  }

  // Step the physics simulation (fixed timestep handled inside physics).
  physics.step(deltaTime);

  // Read resolved positions back from Rapier into ECS.
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];
    const bodyHandle = bodyMap.handles.get(eid);
    if (bodyHandle === undefined) continue;

    syncFromRapier(world, physics, bodyMap, eid, bodyHandle);
  }
}

// ── Body Creation ────────────────────────────────────────────────────────────

function createPhysicsBody(
  _world: EcsWorld,
  physics: RapierContext,
  bodyMap: PhysicsBodyMap,
  eid: number,
): void {
  const pos: Vec3 = {
    x: Position.x[eid] ?? 0,
    y: Position.y[eid] ?? 0,
    z: Position.z[eid] ?? 0,
  };

  const shape = Collider.shape[eid] ?? ColliderShape.Capsule;

  if (shape === ColliderShape.Capsule) {
    // Player capsule
    const result = createPlayerCapsule(physics, pos);
    bodyMap.handles.set(eid, result.bodyHandle);
    bodyMap.colliders.set(eid, result.colliderHandle);
  } else if (shape === ColliderShape.Sphere) {
    // Projectile sphere — future use
    const radius = Collider.radius[eid] ?? 4;
    const result = physics.addDynamicSphere(pos, radius);
    bodyMap.handles.set(eid, result.bodyHandle);
    bodyMap.colliders.set(eid, result.colliderHandle);
  } else {
    // Unhandled shape (Box, Ray, etc.) — loud failure so it's not missed
    // when Phase 3 adds projectiles or enemies.
    console.warn(`PhysicsSystem: unhandled ColliderShape ${shape} for entity ${eid}`);
  }
}

// ── Sync: ECS → Rapier ─────────────────────────────────────────────────────

function syncToRapier(
  _world: EcsWorld,
  physics: RapierContext,
  _bodyMap: PhysicsBodyMap,
  eid: number,
  bodyHandle: number,
  dt: number,
): void {
  const shape = Collider.shape[eid] ?? ColliderShape.Capsule;

  if (shape === ColliderShape.Capsule) {
    // Kinematic body — set target translation from current position + velocity.
    // Uses the frame deltaTime so movement is frame-rate independent:
    // at 60 FPS → velocity * 1/60 per frame × 60 = velocity/sec
    // at 30 FPS → velocity * 1/30 per frame × 30 = velocity/sec
    // Rapier's step() internally divides by substep count, so
    // setNextKinematicTranslation only needs the total displacement.
    const px = Position.x[eid] ?? 0;
    const py = Position.y[eid] ?? 0;
    const pz = Position.z[eid] ?? 0;
    const vx = Velocity.dx[eid] ?? 0;
    const vy = Velocity.dy[eid] ?? 0;
    const vz = Velocity.dz[eid] ?? 0;

    physics.setKinematicTranslation(bodyHandle, {
      x: px + vx * dt,
      y: py + vy * dt,
      z: pz + vz * dt,
    });
  }
  // Dynamic bodies (spheres for projectiles) get their velocity set directly.
  // This will be implemented when ProjectileSystem is added in Phase 3.
}

// ── Sync: Rapier → ECS ─────────────────────────────────────────────────────

function syncFromRapier(
  _world: EcsWorld,
  physics: RapierContext,
  bodyMap: PhysicsBodyMap,
  eid: number,
  bodyHandle: number,
): void {
  // Read back resolved position from Rapier
  const pos = physics.getBodyTranslation(bodyHandle);
  Position.x[eid] = pos.x;
  Position.y[eid] = pos.y;
  Position.z[eid] = pos.z;

  // ── Grounded detection ─────────────────────────────────────────────────
  // Check contact normals for surfaces that point upward.
  const colliderHandle = bodyMap.colliders.get(eid);
  if (colliderHandle !== undefined) {
    RigidBody.grounded[eid] = physics.isGrounded(colliderHandle);
  } else {
    // Fallback: if we lost the collider tracking, assume grounded
    // when vertical velocity is near zero
    const vy = Velocity.dy[eid] ?? 0;
    RigidBody.grounded[eid] = Math.abs(vy) < FREE_FALL_THRESHOLD;
  }
}
