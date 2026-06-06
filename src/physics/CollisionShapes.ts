/**
 * CollisionShapes — helpers for creating Rapier colliders from game concepts.
 *
 * These functions wrap the RapierWorld context to create properly-sized
 * colliders for the player capsule, wall segments, floor planes, and
 * projectile spheres. They handle the geometry math so callers don't
 * need to reason about box dimensions, rotations, or Rapier API calls.
 *
 * Lifecycle (called during level load / player init):
 *   const playerBody = createPlayerCapsule(physics, startPos);
 *   const wallHandle = createWallCollider(physics, {x:0,z:0}, {x:256,z:0}, 96);
 *   const floorHandle = createFloorCollider(physics, -128, 128, -128, 128);
 */
import type { RapierContext, Vec3, KinematicBodyResult } from './RapierWorld';

// ── Thickness ───────────────────────────────────────────────────────────────

/** Half-thickness of wall and floor box colliders (units). */
const COLLIDER_THICKNESS = 2;

// ── Player ──────────────────────────────────────────────────────────────────

/**
 * Create the player's kinematic capsule collider at the given position.
 * Returns the collider handle and body handle for use by PhysicsSystem.
 */
export function createPlayerCapsule(
  physics: RapierContext,
  position: Vec3,
): KinematicBodyResult {
  return physics.addPlayerCapsule(position);
}

// ── Walls ───────────────────────────────────────────────────────────────────

/**
 * Create a static box collider for a wall segment.
 *
 * `start` and `end` are 2D points (x, z) on the floor plane.
 * `height` is the wall height from floor to ceiling.
 *
 * The collider is a thin cuboid centered on the wall segment's midpoint,
 * spanning the segment's length with COLLIDER_THICKNESS depth.
 */
export function createWallCollider(
  physics: RapierContext,
  start: { x: number; z: number },
  end: { x: number; z: number },
  height: number,
  floorY: number,
): number {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.sqrt(dx * dx + dz * dz);

  if (length < 0.001) return -1; // degenerate wall, skip

  const midX = (start.x + end.x) / 2;
  const midZ = (start.z + end.z) / 2;

  // The box is oriented along the wall direction. For simplicity we compute
  // half-extents and position but don't rotate — walls are placed with
  // enough overlap to seal corners.
  const halfExtents = {
    x: Math.abs(dx) / 2 + COLLIDER_THICKNESS,
    y: height / 2,
    z: Math.abs(dz) / 2 + COLLIDER_THICKNESS,
  };

  return physics.addWallCollider(halfExtents, {
    x: midX,
    y: floorY + height / 2,
    z: midZ,
  });
}

// ── Floors / Ceilings ───────────────────────────────────────────────────────

/**
 * Create a static box collider for a floor or ceiling surface.
 *
 * `minX`/`maxX` and `minZ`/`maxZ` define the sector bounds.
 * `y` is the vertical position of the surface (floor Y or ceiling Y).
 */
export function createFloorCollider(
  physics: RapierContext,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  y: number,
): number {
  const halfWidth = (maxX - minX) / 2;
  const halfDepth = (maxZ - minZ) / 2;

  return physics.addWallCollider(
    { x: halfWidth, y: COLLIDER_THICKNESS, z: halfDepth },
    {
      x: (minX + maxX) / 2,
      y: y,
      z: (minZ + maxZ) / 2,
    },
  );
}

// ── Projectiles ─────────────────────────────────────────────────────────────

/**
 * Create a dynamic sphere collider for a projectile.
 * Returns both collider handle and body handle so PhysicsSystem can track it.
 */
export function createProjectileCollider(
  physics: RapierContext,
  position: Vec3,
  radius?: number,
): KinematicBodyResult {
  return physics.addDynamicSphere(position, radius ?? 4);
}
