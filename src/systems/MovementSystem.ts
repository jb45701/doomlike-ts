/**
 * MovementSystem — applies acceleration, friction, gravity, and jump.
 *
 * Reads InputState + Position + Velocity on the player entity.
 * Optionally reads Rotation.yaw for direction-relative movement.
 * Optionally reads RigidBody.grounded for ground detection.
 *
 * Processing order (per frame, called after InputSystem):
 *   1. Gather movement input (forward/back/left/right)
 *   2. Rotate input direction by entity yaw
 *   3. Normalise diagonal input so strafe-run is not faster
 *   4. Apply acceleration toward desired direction
 *   5. Apply friction when no horizontal input
 *   6. Apply gravity when not grounded (if RigidBody present)
 *   7. Apply jump impulse when grounded + jump pressed
 *   8. Cap fall speed to terminal velocity
 *   9. Integrate velocity into position
 *
 * Lifecycle:
 *   MovementSystem(world, deltaTime);
 */
import type { EcsWorld } from '../ecs/World';
import { query, hasComponent } from 'bitecs';
import {
  InputState,
  Position,
  Velocity,
  Rotation,
  Collider,
  RigidBody,
  PlayerTag,
} from '../ecs/Components';

/** Horizontal acceleration while input is held (units/s²). */
const ACCELERATION = 2500;

/** Deceleration when no horizontal input (units/s²). */
const FRICTION = 4000;

/** Maximum horizontal speed (units/s). */
const MAX_SPEED = 400;

/** Downward acceleration (units/s²). */
const GRAVITY = -800;

/** Instant upward velocity on jump (units/s). */
const JUMP_IMPULSE = 300;

/** Maximum downward speed magnitude (units/s) — clamps gravity acceleration to prevent unbounded fall. */
const TERMINAL_VELOCITY = 2000;

export function MovementSystem(world: EcsWorld, deltaTime: number): void {
  const entities = query(world, [PlayerTag, InputState, Position, Velocity]);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];

    // ── Read input ────────────────────────────────────────────────────
    const fwd = InputState.forward[eid] ?? false;
    const bck = InputState.back[eid] ?? false;
    const lft = InputState.left[eid] ?? false;
    const rgt = InputState.right[eid] ?? false;
    const jump = InputState.jump[eid] ?? false;

    // ── Movement direction in world-space ─────────────────────────────
    let localX = 0;
    let localZ = 0;
    if (fwd) localZ -= 1;
    if (bck) localZ += 1;
    if (lft) localX -= 1;
    if (rgt) localX += 1;

    // Normalise diagonal input so strafe-run isn't √2 faster
    const len = Math.sqrt(localX * localX + localZ * localZ);
    if (len > 0) {
      localX /= len;
      localZ /= len;
    }

    // ── Rotate movement by player yaw ─────────────────────────────────
    const yaw = Rotation.yaw[eid] ?? 0;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const wishDirX = localX * cos - localZ * sin;
    const wishDirZ = localX * sin + localZ * cos;

    // ── Grounded detection ────────────────────────────────────────────
    let grounded = false;
    if (hasComponent(world, eid, RigidBody)) {
      grounded = RigidBody.grounded[eid] ?? false;
    } else {
      // Without a physics system treat the entity as grounded (debug/freecam)
      grounded = true;
    }

    // ── Horizontal acceleration / friction ────────────────────────────
    const hasHorizontalInput = len > 0;

    // Read current velocities (default to 0)
    const vx = Velocity.dx[eid] ?? 0;
    const vz = Velocity.dz[eid] ?? 0;

    let newVx: number;
    let newVz: number;

    if (hasHorizontalInput) {
      // Accelerate toward wish direction
      newVx = vx + wishDirX * ACCELERATION * deltaTime;
      newVz = vz + wishDirZ * ACCELERATION * deltaTime;

      // Clamp horizontal speed to max
      const hSpeed = Math.sqrt(newVx * newVx + newVz * newVz);
      if (hSpeed > MAX_SPEED) {
        const scale = MAX_SPEED / hSpeed;
        newVx *= scale;
        newVz *= scale;
      }
    } else {
      // Friction — decelerate toward zero
      const speed = Math.sqrt(vx * vx + vz * vz);
      if (speed > 0) {
        const frictionAmount = FRICTION * deltaTime;
        if (frictionAmount >= speed) {
          newVx = 0;
          newVz = 0;
        } else {
          const scale = (speed - frictionAmount) / speed;
          newVx = vx * scale;
          newVz = vz * scale;
        }
      } else {
        newVx = 0;
        newVz = 0;
      }
    }

    // ── Vertical (gravity / jump) ─────────────────────────────────────
    let newVy = Velocity.dy[eid] ?? 0;

    if (jump && grounded) {
      newVy = JUMP_IMPULSE;
      // Mark as airborne immediately so intermediate systems don't
      // see stale grounded state before PhysicsSystem updates it.
      RigidBody.grounded[eid] = false;
    }

    if (!grounded) {
      newVy += GRAVITY * deltaTime;
      // Cap fall speed to prevent unbounded acceleration
      newVy = Math.max(newVy, -TERMINAL_VELOCITY);
    }

    // ── Apply velocities to velocity store ────────────────────────────
    Velocity.dx[eid] = newVx;
    Velocity.dy[eid] = newVy;
    Velocity.dz[eid] = newVz;

    // ── Integrate position ────────────────────────────────────────────
    // Entities with a physics collider skip this step — PhysicsSystem
    // syncs velocity → Rapier, steps the simulation, then reads back
    // the collision-resolved position from the Rapier world.
    const hasPhysics = hasComponent(world, eid, Collider) && hasComponent(world, eid, RigidBody);

    if (!hasPhysics) {
      Position.x[eid] = (Position.x[eid] ?? 0) + newVx * deltaTime;
      Position.y[eid] = (Position.y[eid] ?? 0) + newVy * deltaTime;
      Position.z[eid] = (Position.z[eid] ?? 0) + newVz * deltaTime;
    }
  }
}
