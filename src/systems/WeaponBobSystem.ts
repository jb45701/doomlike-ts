/**
 * WeaponBobSystem — computes sin-wave weapon bobbing from player velocity.
 *
 * Updates the weapon placeholder sprite position in the DOM based on the
 * player's horizontal speed. When stationary, the bob returns to center.
 *
 * Stores bob state in module-level variables and updates the DOM directly.
 * This keeps the effect purely visual and decoupled from ECS.
 *
 * Usage:
 *   import { updateWeaponBob } from './systems/WeaponBobSystem';
 *   updateWeaponBob(world, dt);  // once per frame
 */
import type { EcsWorld } from '../ecs/World';
import { Velocity } from '../ecs/Components';
import { queryPlayerEntity } from '../ecs/queries';

// ── Constants ───────────────────────────────────────────────────────────────

/** Base bob oscillation frequency (cycles per second at reference speed). */
const BOB_FREQUENCY = 10;

/** Maximum bob amplitude in CSS pixels (peak-to-peak). */
const BOB_AMPLITUDE = 6;

/** Speed at which bob reaches full amplitude (units/sec). */
const REFERENCE_SPEED = 200;

// ── Module-level state ──────────────────────────────────────────────────────

/** Accumulated bob phase (radians). */
let _bobPhase = 0;

/** Current computed bob offset in CSS pixels. */
let _offsetX = 0;
let _offsetY = 0;

/** Cached DOM reference (initialised lazily). */
let _bobEl: HTMLElement | null = null;

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Update the weapon bob offset for the current frame.
 * Call once per frame after MovementSystem and PhysicsSystem.
 */
export function updateWeaponBob(world: EcsWorld, dt: number): void {
  // Lazy initialise DOM reference
  if (_bobEl === null) {
    _bobEl = document.getElementById('weapon-sprite');
  }

  const playerEids = queryPlayerEntity(world);
  if (playerEids.length === 0) return;
  const eid = playerEids[0];

  // Read horizontal velocity (ignore vertical)
  const vx = Velocity.dx[eid] ?? 0;
  const vz = Velocity.dz[eid] ?? 0;
  const speed = Math.sqrt(vx * vx + vz * vz);

  if (speed > 5) {
    // Advance phase — frequency scales with speed
    const speedFactor = Math.min(speed / REFERENCE_SPEED, 1.5);
    _bobPhase += dt * BOB_FREQUENCY * speedFactor;

    // Horizontal bob: slower oscillation (phase * 0.5) for a sway feel
    _offsetX = Math.sin(_bobPhase * 0.5) * BOB_AMPLITUDE * speedFactor;

    // Vertical bob: absolute-sine for a bounce feel (always positive = up)
    _offsetY = Math.abs(Math.sin(_bobPhase)) * BOB_AMPLITUDE * speedFactor;
  } else {
    // Decay bob back to center when stationary
    _bobPhase = 0;
    _offsetX *= 0.85;
    _offsetY *= 0.85;
    if (Math.abs(_offsetX) < 0.5) _offsetX = 0;
    if (Math.abs(_offsetY) < 0.5) _offsetY = 0;
  }

  // Apply to DOM
  if (_bobEl) {
    _bobEl.style.transform = `translate(${_offsetX.toFixed(1)}px, ${_offsetY.toFixed(1)}px)`;
  }
}
