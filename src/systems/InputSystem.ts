/**
 * InputSystem — reads raw input from InputManager, writes InputState + Rotation.
 *
 * Processing order (per frame):
 *   1. Read mouse delta via InputManager.resetMouseDelta()
 *   2. Store delta in InputState.mouseX/Y for other systems
 *   3. Apply yaw/pitch rotation from mouse movement (sensitivity-scaled)
 *   4. Clamp pitch to ±89° to prevent camera flip
 *   5. Map keyboard/mouse state to InputState boolean fields
 *
 * Lifecycle:
 *   InputSystem(world, deltaTime);
 */
import type { World } from 'bitecs';
import { hasComponent, addComponent } from 'bitecs';
import {
  InputState,
  Rotation,
  PlayerTag,
  Position,
} from '../ecs/Components';
import { queryPlayerEntity } from '../ecs/queries';
import * as InputManager from '../input/InputManager';

/** Mouse sensitivity in radians per pixel. */
const SENSITIVITY = 0.002;

/** Half-pi constant for pitch clamping. */
const HALF_PI = Math.PI / 2;

export function InputSystem(world: World, _deltaTime: number): void {
  const entities = queryPlayerEntity(world);
  if (entities.length === 0) return;

  const eid = entities[0];

  // ── Ensure InputState is present ──────────────────────────────────────
  if (!hasComponent(world, InputState, eid)) {
    addComponent(world, InputState, eid);
  }

  // ── Mouse delta — read and store ──────────────────────────────────────
  const delta = InputManager.resetMouseDelta();

  InputState.mouseX[eid] = delta.x;
  InputState.mouseY[eid] = delta.y;

  // ── Rotation from mouse ───────────────────────────────────────────────
  Rotation.yaw[eid]   ??= 0;
  Rotation.pitch[eid] ??= 0;
  Rotation.roll[eid]  ??= 0;

  Rotation.yaw[eid]   -= delta.x * SENSITIVITY;
  Rotation.pitch[eid] -= delta.y * SENSITIVITY;

  // Clamp pitch to just shy of ±90° so the camera never flips
  Rotation.pitch[eid] = Math.max(
    -HALF_PI + 0.01,
    Math.min(HALF_PI - 0.01, Rotation.pitch[eid]),
  );

  // Normalise yaw to [-PI, PI]
  Rotation.yaw[eid] %= Math.PI * 2;
  if (Rotation.yaw[eid] > Math.PI)  Rotation.yaw[eid] -= Math.PI * 2;
  if (Rotation.yaw[eid] < -Math.PI) Rotation.yaw[eid] += Math.PI * 2;

  // ── Keyboard / mouse mapping ──────────────────────────────────────────
  InputState.forward[eid]      = InputManager.isKeyDown('KeyW');
  InputState.back[eid]         = InputManager.isKeyDown('KeyS');
  InputState.left[eid]         = InputManager.isKeyDown('KeyA');
  InputState.right[eid]        = InputManager.isKeyDown('KeyD');
  InputState.jump[eid]         = InputManager.isKeyDown('Space');
  InputState.crouch[eid]       = InputManager.isKeyDown('ShiftLeft')
                                  || InputManager.isKeyDown('ShiftRight');
  InputState.fire[eid]         = InputManager.isMouseButtonDown(0);
  InputState.altFire[eid]      = InputManager.isMouseButtonDown(2);
  InputState.use[eid]          = InputManager.wasKeyPressed('KeyE');

  // Weapon switching
  InputState.nextWeapon[eid]   = InputManager.wasKeyPressed('KeyQ');
  InputState.prevWeapon[eid]   = InputManager.wasKeyPressed('Digit1'); // MWheel handled separately
  InputState.weaponSlot1[eid]  = InputManager.wasKeyPressed('Digit1');
  InputState.weaponSlot2[eid]  = InputManager.wasKeyPressed('Digit2');
  InputState.weaponSlot3[eid]  = InputManager.wasKeyPressed('Digit3');
  InputState.weaponSlot4[eid]  = InputManager.wasKeyPressed('Digit4');
  InputState.weaponSlot5[eid]  = InputManager.wasKeyPressed('Digit5');
  InputState.weaponSlot6[eid]  = InputManager.wasKeyPressed('Digit6');
  InputState.weaponSlot7[eid]  = InputManager.wasKeyPressed('Digit7');
}
