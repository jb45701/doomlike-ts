/**
 * RapierWorld — Rapier physics world initialization and collision helpers.
 *
 * Provides an async factory (`createRapierWorld`) that:
 *  - Initialises Rapier WASM (RAPIER.init)
 *  - Creates a Rapier World with Doom-like gravity (0, -800, 0)
 *  - Exposes a RapierContext with step(), wall/player collider helpers,
 *    raycasting, and cleanup.
 *
 * Lifecycle:
 *   const physics = await createRapierWorld();
 *   physics.step(deltaTime);
 *   // ...
 *   physics.dispose();
 */
import RAPIER from '@dimforge/rapier3d-compat';
import type { Collider, RayColliderIntersection } from '@dimforge/rapier3d-compat';

// ── Constants ───────────────────────────────────────────────────────────────

/** Fixed physics timestep (seconds). */
const FIXED_DT = 1 / 60;

/** Maximum number of substeps per frame to prevent spiral-of-death. */
const MAX_SUBSTEPS = 4;

/** Downward gravitational acceleration (units/s²). */
const GRAVITY_Y = -800;

/** Player capsule radius (units). */
const PLAYER_RADIUS = 16;

/** Player capsule half-height along the Y axis (units). */
const PLAYER_HALF_HEIGHT = 20;

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
   * Returns the collider handle.
   *
   * The capsule dimensions are fixed: radius 16, half-height 20 (total ~72 units).
   * See the Architecture Guide for the player collider specification.
   */
  addPlayerCapsule: (position: Vec3) => number;

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

  // Keep a reference to the player body so we can update its position later
  // (player body reference stored when PhysicsSystem syncs positions)

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
    return collider.handle;
  }

  // ── addPlayerCapsule ───────────────────────────────────────────────────
  function addPlayerCapsule(position: Vec3): number {
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(position.x, position.y, position.z);
    const body = world.createRigidBody(bodyDesc);
    // body reference stored for future PhysicsSystem position syncing

    const colliderDesc = RAPIER.ColliderDesc.capsule(PLAYER_HALF_HEIGHT, PLAYER_RADIUS);
    const collider = world.createCollider(colliderDesc, body);
    colliderMap.set(collider.handle, collider);
    return collider.handle;
  }

  // ── removeCollider ─────────────────────────────────────────────────────
  function removeCollider(handle: number): void {
    const collider = colliderMap.get(handle);
    if (collider && collider.isValid()) {
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
    world.free();
  }

  return {
    world,
    step,
    addWallCollider,
    addPlayerCapsule,
    removeCollider,
    raycast,
    dispose,
  };
}
