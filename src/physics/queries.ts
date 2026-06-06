/**
 * queries — Raycast and overlap helpers for the Rapier physics world.
 *
 * Provides high-level query functions used by gameplay systems:
 *   - raycast: world-space ray → first hit
 *   - isLineOfSightBlocked: enemy → player visibility check
 *
 * These wrap the RapierContext.raycast method with game-specific logic.
 *
 * Lifecycle:
 *   const hit = raycast(physics, from, to);
 *   const blocked = isLineOfSightBlocked(physics, from, to);
 */
import type { RapierContext, Vec3, RaycastHit } from './RapierWorld';

/** Small epsilon for floating-point tolerance in distance comparisons. */
const EPSILON = 0.001;

// ── Raycast ─────────────────────────────────────────────────────────────────

/**
 * Cast a ray from `origin` toward `target` and return the first hit.
 * Returns `null` if nothing was hit.
 *
 * @param origin  World-space start point of the ray
 * @param target  World-space end point (direction and distance derived)
 */
export function raycast(
  physics: RapierContext,
  origin: Vec3,
  target: Vec3,
): RaycastHit | null {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const dz = target.z - origin.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (distance < EPSILON) return null; // origin ≈ target, no ray

  const direction: Vec3 = {
    x: dx / distance,
    y: dy / distance,
    z: dz / distance,
  };

  return physics.raycast(origin, direction, distance);
}

// ── Line-of-Sight ───────────────────────────────────────────────────────────

/**
 * Check whether the line from `origin` to `target` is blocked by any
 * physics collider (wall, floor, etc.).
 *
 * Returns `true` if a collider is hit before reaching the target
 * (within an epsilon tolerance for floating-point comparisons).
 * Returns `false` if the ray reaches the target unobstructed,
 * or if origin ≈ target (degenerate ray).
 */
export function isLineOfSightBlocked(
  physics: RapierContext,
  origin: Vec3,
  target: Vec3,
): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const dz = target.z - origin.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (distance < EPSILON) return false; // degenerate ray

  const direction: Vec3 = {
    x: dx / distance,
    y: dy / distance,
    z: dz / distance,
  };

  const hit = physics.raycast(origin, direction, distance);
  if (!hit) return false; // nothing in the way

  // The raycast already limits maxDistance to `distance`, so any hit
  // is strictly between origin and target. But to guard against
  // floating-point boundary hits exactly at the target, compare with
  // a small tolerance.
  return hit.toi < distance - EPSILON;
}
