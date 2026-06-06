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
  if (distance < 0.001) return null; // origin ≈ target, no ray

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
 * Returns `true` if a collider is hit before reaching the target.
 * Returns `false` if the ray reaches the target unobstructed.
 * Returns `false` if origin ≈ target (degenerate ray).
 */
export function isLineOfSightBlocked(
  physics: RapierContext,
  origin: Vec3,
  target: Vec3,
): boolean {
  const hit = raycast(physics, origin, target);
  if (!hit) return false; // nothing in the way
  return true;
}
