/**
 * constants — Shared game-wide constants for the Doomlike FPS.
 *
 * Single source of truth for player collider dimensions, physics timestep,
 * and other numeric constants used across multiple modules.
 *
 * Usage:
 *   import { PLAYER_RADIUS, PLAYER_HALF_HEIGHT, FIXED_DT, GRAVITY } from './constants';
 */

// ── Player collider ──────────────────────────────────────────────────────────

/** Player capsule radius (units). */
export const PLAYER_RADIUS = 16;

/** Player capsule half-height along the Y axis (the cylindrical portion). */
export const PLAYER_HALF_HEIGHT = 20;

/**
 * Distance from capsule center Y to the capsule's lowest point.
 * Equal to PLAYER_HALF_HEIGHT + PLAYER_RADIUS = 36.
 * Used when placing the player on a floor surface: player Y = floorY + PLAYER_FLOOR_OFFSET.
 */
export const PLAYER_FLOOR_OFFSET = PLAYER_HALF_HEIGHT + PLAYER_RADIUS;

// ── Physics ──────────────────────────────────────────────────────────────────

/** Fixed physics timestep (seconds). */
export const FIXED_DT = 1 / 60;

/** Maximum number of physics substeps per frame to prevent spiral-of-death. */
export const MAX_SUBSTEPS = 4;

/** Downward gravitational acceleration (units/s²). */
export const GRAVITY_Y = -800;

// ── Combat ───────────────────────────────────────────────────────────────────

/** Default projectile despawn time (seconds). */
export const PROJECTILE_DESPAWN_TIME = 5;
