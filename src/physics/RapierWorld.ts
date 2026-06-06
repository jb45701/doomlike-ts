/**
 * RapierWorld — Rapier physics world initialization and collision helpers.
 *
 * Provides an async factory (`createRapierWorld`) that:
 *  - Initialises Rapier WASM (RAPIER.init)
 *  - Creates a Rapier World with Doom-like gravity (0, -800, 0)
 *  - Exposes a RapierContext with step(), collider helpers, body tracking,
 *    raycasting, grounded detection, and cleanup.
 *
 * Lifecycle:
 *   const physics = await createRapierWorld();
 *   physics.step(deltaTime);
 *   // ...
 *   physics.dispose();
 */
import RAPIER from '@dimforge/rapier3d-compat';
import type { Collider, RayColliderIntersection } from '@dimforge/rapier3d-compat';
import {
  FIXED_DT,
  MAX_SUBSTEPS,
  GRAVITY_Y,
  PLAYER_RADIUS,
  PLAYER_HALF_HEIGHT,
} from '../constants';

// ── Types ───────────────────────────────────────────────────────────────────

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface RaycastHit {
  /** The world-space hit point. */
  point: Vec3;
  /** The surface normal at the hit point. */
  normal: Vec3;
  /** The numeric handle of the collider that was hit. */
  colliderHandle: number;
  /** The time-of-impact along the ray (0..maxDistance). */
  toi: number;
}

export interface KinematicBodyResult {
  /** Numeric handle of the created collider. */
  colliderHandle: number;
  /** Numeric handle of the created rigid body. */
  bodyHandle: number;
}

export interface RapierContext {
  /** The raw Rapier physics world (exposed for advanced queries). */
  readonly world: RAPIER.World;

  /**
   * Step the physics simulation forward by `deltaTime` seconds.
   * Uses a fixed timestep of 1/60s with up to `MAX_SUBSTEPS` substeps
   * to avoid a spiral-of-death if the frame budget is exceeded.
   */
  step: (deltaTime: number) => void;

  /**
   * Add a static box collider at the given world-space position.
   * Returns the collider handle, which can be used later with `removeCollider`.
   */
  addWallCollider: (halfExtents: Vec3, position: Vec3) => number;

  /**
   * Add a kinematic-position-based capsule collider for the player.
   * Returns the collider handle and body handle.
   *
   * The capsule dimensions are fixed: radius 16, half-height 20 (total ~72 units).
   * See the Architecture Guide for the player collider specification.
   */
  addPlayerCapsule: (position: Vec3) => KinematicBodyResult;

  /**
   * Create a sphere collider attached to a dynamic rigid body (for projectiles).
   * Returns the collider handle and body handle.
   */
  addDynamicSphere: (position: Vec3, radius: number) => KinematicBodyResult;

  /**
   * Return the collider handles of all colliders currently in contact with
   * the given collider. Call after `step()` to read resolved contacts.
   */
  getContactColliders: (colliderHandle: number) => number[];

  /**
   * Register a mapping from a collider handle to an ECS entity ID.
   * Used by ProjectileSystem and hitscan to resolve which entity a
   * collision/raycast hit belongs to.
   */
  registerEntityCollider: (colliderHandle: number, eid: number) => void;

  /**
   * Look up the ECS entity ID for a collider handle (reverse of registerEntityCollider).
   * Returns undefined if this collider is not mapped to any entity (e.g. a wall).
   */
  lookupEntityByCollider: (colliderHandle: number) => number | undefined;

  /**
   * Set the next kinematic translation for a tracked rigid body.
   * Call this before `step()` to move kinematic bodies.
   */
  setKinematicTranslation: (bodyHandle: number, position: Vec3) => void;

  /**
   * Read back the current world-space translation of a tracked rigid body.
   * Call this after `step()` to get the resolved position.
   */
  getBodyTranslation: (bodyHandle: number) => Vec3;

  /**
   * Check whether the body attached to the given collider handle is in contact
   * with any surface whose normal points upward (i.e. standing on floor/ground).
   * Call this after `step()`.
   */
  isGrounded: (colliderHandle: number) => boolean;

  /**
   * Set the linear velocity of a dynamic rigid body.
   * Used for projectiles and physics-driven entities.
   */
  setBodyVelocity: (bodyHandle: number, velocity: Vec3) => void;

  /**
   * Read back the current linear velocity of a rigid body.
   * Call after step() to get velocity modified by collision resolution.
   */
  getBodyVelocity: (bodyHandle: number) => Vec3;

  /**
   * Remove a collider from the physics world by its handle.
   * Safe to call with an invalid or already-removed handle.
   */
  removeCollider: (handle: number) => void;

  /**
   * Cast a ray and return the first hit (with normal and collider handle).
   * Returns `null` if nothing was hit within `maxDistance`.
   */
  raycast: (
    origin: Vec3,
    direction: Vec3,
    maxDistance: number,
  ) => RaycastHit | null;

  /** Dispose of the physics world and release all WASM memory. */
  dispose: () => void;
}

// ── Factory ─────────────────────────────────────────────────────────────────

export async function createRapierWorld(): Promise<RapierContext> {
  await RAPIER.init();

  const world = new RAPIER.World({ x: 0, y: GRAVITY_Y, z: 0 });

  // Track collider handles → Collider objects for removal
  const colliderMap = new Map<number, Collider>();

  // Track rigid body handles → RigidBody objects for kinematic sync
  const bodyMap = new Map<number, RAPIER.RigidBody>();

  // Track collider handles → ECS entity IDs for collision-to-entity resolution
  const entityColliderMap = new Map<number, number>();

  // Accumulator for fixed-timestep physics stepping
  let accumulator = 0;

  // ── step ───────────────────────────────────────────────────────────────
  function step(deltaTime: number): void {
    accumulator += deltaTime;
    let substeps = 0;
    while (accumulator >= FIXED_DT && substeps < MAX_SUBSTEPS) {
      world.step();
      accumulator -= FIXED_DT;
      substeps++;
    }
    // Spiral-of-death guard: if we couldn't catch up, drop the remainder
    if (accumulator >= FIXED_DT) {
      accumulator = 0;
    }
  }

  // ── addWallCollider ────────────────────────────────────────────────────
  function addWallCollider(halfExtents: Vec3, position: Vec3): number {
    const bodyDesc = RAPIER.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z);
    const body = world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      halfExtents.x,
      halfExtents.y,
      halfExtents.z,
    );
    const collider = world.createCollider(colliderDesc, body);
    colliderMap.set(collider.handle, collider);
    bodyMap.set(body.handle, body);
    return collider.handle;
  }

  // ── addPlayerCapsule ───────────────────────────────────────────────────
  function addPlayerCapsule(position: Vec3): KinematicBodyResult {
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(position.x, position.y, position.z);
    const body = world.createRigidBody(bodyDesc);
    bodyMap.set(body.handle, body);

    const colliderDesc = RAPIER.ColliderDesc.capsule(PLAYER_HALF_HEIGHT, PLAYER_RADIUS);
    const collider = world.createCollider(colliderDesc, body);
    colliderMap.set(collider.handle, collider);

    return { colliderHandle: collider.handle, bodyHandle: body.handle };
  }

  // ── addDynamicSphere ───────────────────────────────────────────────────
  function addDynamicSphere(position: Vec3, radius: number): KinematicBodyResult {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setGravityScale(0);
    const body = world.createRigidBody(bodyDesc);
    bodyMap.set(body.handle, body);

    const colliderDesc = RAPIER.ColliderDesc.ball(radius);
    const collider = world.createCollider(colliderDesc, body);
    // Enable CCD on the rigid body to prevent tunneling at high speed
    body.enableCcd(true);
    colliderMap.set(collider.handle, collider);

    return { colliderHandle: collider.handle, bodyHandle: body.handle };
  }

  // ── setKinematicTranslation ────────────────────────────────────────────
  function setKinematicTranslation(bodyHandle: number, position: Vec3): void {
    const body = bodyMap.get(bodyHandle);
    if (body) {
      body.setNextKinematicTranslation({ x: position.x, y: position.y, z: position.z });
    }
  }

  // ── getBodyTranslation ─────────────────────────────────────────────────
  function getBodyTranslation(bodyHandle: number): Vec3 {
    const body = bodyMap.get(bodyHandle);
    if (!body) return { x: 0, y: 0, z: 0 };
    const t = body.translation();
    return { x: t.x, y: t.y, z: t.z };
  }

  // ── isGrounded ─────────────────────────────────────────────────────────
  function isGrounded(colliderHandle: number): boolean {
    const collider = colliderMap.get(colliderHandle);
    if (!collider || !collider.isValid()) return false;

    let grounded = false;

    // Iterate over all colliders in contact with this one
    world.contactPairsWith(collider, (otherCollider) => {
      if (grounded) return;

      // Examine contact manifolds for this collider pair
      world.contactPair(collider, otherCollider, (manifold, flipped) => {
        if (grounded) return;

        // Get the contact normal in the frame of the other (non-player) collider.
        // If not flipped: localNormal2 belongs to otherCollider (collider2).
        // If flipped: localNormal1 belongs to otherCollider.
        const normal = flipped ? manifold.localNormal1() : manifold.localNormal2();

        // A normal with Y > 0.3 means the surface is mostly upward-facing —
        // the player is standing on it. This threshold allows ~73° slopes
        // while excluding walls and ceilings.
        if (normal.y > 0.3) {
          grounded = true;
        }
      });
    });

    return grounded;
  }

  // ── setBodyVelocity ────────────────────────────────────────────────────
  function setBodyVelocity(bodyHandle: number, velocity: Vec3): void {
    const body = bodyMap.get(bodyHandle);
    if (body) {
      body.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
    }
  }

  // ── getBodyVelocity ────────────────────────────────────────────────────
  function getBodyVelocity(bodyHandle: number): Vec3 {
    const body = bodyMap.get(bodyHandle);
    if (!body) return { x: 0, y: 0, z: 0 };
    const v = body.linvel();
    return { x: v.x, y: v.y, z: v.z };
  }

  // ── getContactColliders ────────────────────────────────────────────────
  function getContactColliders(colliderHandle: number): number[] {
    const collider = colliderMap.get(colliderHandle);
    if (!collider || !collider.isValid()) return [];

    const result: number[] = [];
    world.contactPairsWith(collider, (otherCollider) => {
      result.push(otherCollider.handle);
    });
    return result;
  }

  // ── registerEntityCollider ─────────────────────────────────────────────
  function registerEntityCollider(colliderHandle: number, eid: number): void {
    entityColliderMap.set(colliderHandle, eid);
  }

  // ── lookupEntityByCollider ─────────────────────────────────────────────
  function lookupEntityByCollider(colliderHandle: number): number | undefined {
    return entityColliderMap.get(colliderHandle);
  }

  // ── removeCollider ─────────────────────────────────────────────────────
  function removeCollider(handle: number): void {
    const collider = colliderMap.get(handle);
    if (collider && collider.isValid()) {
      // Also remove the parent body from tracking
      const parent = collider.parent();
      if (parent) {
        bodyMap.delete(parent.handle);
      }
      world.removeCollider(collider, true);
      colliderMap.delete(handle);
    }
  }

  // ── raycast ────────────────────────────────────────────────────────────
  function raycast(
    origin: Vec3,
    direction: Vec3,
    maxDistance: number,
  ): RaycastHit | null {
    const ray = new RAPIER.Ray(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: direction.x, y: direction.y, z: direction.z },
    );
    const hit: RayColliderIntersection | null = world.castRayAndGetNormal(
      ray, maxDistance, true,
    );
    if (hit) {
      const point = ray.pointAt(hit.timeOfImpact);
      return {
        point: { x: point.x, y: point.y, z: point.z },
        normal: { x: hit.normal.x, y: hit.normal.y, z: hit.normal.z },
        colliderHandle: hit.collider.handle,
        toi: hit.timeOfImpact,
      };
    }
    return null;
  }

  // ── dispose ────────────────────────────────────────────────────────────
  function dispose(): void {
    colliderMap.clear();
    bodyMap.clear();
    entityColliderMap.clear();
    world.free();
  }

  return {
    world,
    step,
    addWallCollider,
    addPlayerCapsule,
    addDynamicSphere,
    setKinematicTranslation,
    getBodyTranslation,
    isGrounded,
    removeCollider,
    raycast,
    setBodyVelocity,
    getBodyVelocity,
    getContactColliders,
    registerEntityCollider,
    lookupEntityByCollider,
    dispose,
  };
}
