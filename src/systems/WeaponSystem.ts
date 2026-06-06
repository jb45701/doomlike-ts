/**
 * WeaponSystem — handles weapon state, firing, and weapon switching
 * for the player entity.
 *
 * Delegates hitscan and projectile firing to weaponFire.ts helpers.
 * Weapon definition data lives in weaponDefs.ts.
 *
 * Processing order (called after InputSystem, before MovementSystem):
 *   1. Handle weapon switching (next/prev weapon, weapon slots)
 *   2. Decrement cooldown by deltaTime
 *   3. Check for fire input — if firing, cooldown ≤ 0, and ammo > 0:
 *      a. Delegate to handleHitscan or handleProjectile
 *      b. Emit weapon_fired event
 *      c. Decrement ammo, set cooldown
 *   4. Update WeaponState component fields
 *
 * Lifecycle:
 *   WeaponSystem(world, physics, playerEid, dt);
 */

import {
  InputState,
  WeaponState,
  Position,
  WeaponKind,
} from '../ecs/Components';
import type { EcsWorld } from '../ecs/World';
import type { RapierContext, Vec3 } from '../physics/RapierWorld';
import { emitEvent } from '../events/GameEvents';
import { PLAYER_EYE_HEIGHT } from '../constants';
import { WEAPON_CYCLE_ORDER, getWeaponDef } from '../weapons/weaponDefs';
import { handleHitscan, handleProjectile, getFireDirection } from '../weapons/weaponFire';

// ── System ───────────────────────────────────────────────────────────────────

export function WeaponSystem(
  world: EcsWorld,
  physics: RapierContext,
  playerEid: number,
  deltaTime: number,
): void {
  const eid = playerEid;

  // ── Read current state ──────────────────────────────────────────────────
  let currentKind = WeaponState.kind[eid] ?? WeaponKind.Pistol;

  // ── Weapon switching ────────────────────────────────────────────────────
  if (InputState.nextWeapon[eid]) {
    currentKind = cycleWeapon(currentKind, 1);
  }
  if (InputState.prevWeapon[eid]) {
    currentKind = cycleWeapon(currentKind, -1);
  }
  // Weapon slot hotkeys (Digit1-5 maps to Fist-RocketLauncher)
  const slotKind = resolveWeaponSlot(eid);
  if (slotKind !== undefined) {
    currentKind = slotKind;
  }

  // ── Decrement cooldown ──────────────────────────────────────────────────
  let cooldown = WeaponState.cooldown[eid] ?? 0;
  if (cooldown > 0) {
    cooldown -= deltaTime;
    if (cooldown < 0) cooldown = 0;
  }

  // ── Check fire input ────────────────────────────────────────────────────
  const fireHeld = InputState.fire[eid] ?? false;
  let ammo = WeaponState.ammo[eid] ?? 0;
  const weaponDef = getWeaponDef(currentKind);

  // Fire decision: trigger held, cooldown expired, has ammo, valid weapon
  const canFire = fireHeld && cooldown <= 0 && ammo > 0 && weaponDef !== undefined;

  if (canFire) {
    // Execute fire — one coherent action
    if (weaponDef.hitscan) {
      handleHitscan(world, physics, eid, weaponDef);
    } else {
      handleProjectile(world, eid, weaponDef);
    }

    // Emit weapon_fired event
    const pos: Vec3 = {
      x: Position.x[eid] ?? 0,
      y: (Position.y[eid] ?? 0) + PLAYER_EYE_HEIGHT,
      z: Position.z[eid] ?? 0,
    };
    const dir = getFireDirection(eid);
    emitEvent({
      type: 'weapon_fired',
      weapon: weaponDef.name,
      position: pos,
      direction: dir,
    });

    // Commit state changes atomically with the fire action
    ammo -= 1;
    cooldown = weaponDef.cooldown;
    WeaponState.firing[eid] = true;
  } else {
    WeaponState.firing[eid] = fireHeld;
  }

  // ── Write back to WeaponState ───────────────────────────────────────────
  WeaponState.kind[eid] = currentKind;
  WeaponState.ammo[eid] = ammo;
  WeaponState.cooldown[eid] = cooldown;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Cycle to the next or previous valid weapon in the order list.
 */
function cycleWeapon(currentKind: number, direction: number): number {
  const idx = WEAPON_CYCLE_ORDER.indexOf(currentKind as never);
  if (idx === -1) return WEAPON_CYCLE_ORDER[0];
  const next = (idx + direction + WEAPON_CYCLE_ORDER.length) % WEAPON_CYCLE_ORDER.length;
  return WEAPON_CYCLE_ORDER[next];
}

/**
 * Check weapon slot hotkeys and return the weapon kind, or undefined if none pressed.
 */
function resolveWeaponSlot(eid: number): number | undefined {
  if (InputState.weaponSlot1[eid]) return WeaponKind.Fist;
  if (InputState.weaponSlot2[eid]) return WeaponKind.Pistol;
  if (InputState.weaponSlot3[eid]) return WeaponKind.Shotgun;
  if (InputState.weaponSlot4[eid]) return WeaponKind.Chaingun;
  if (InputState.weaponSlot5[eid]) return WeaponKind.RocketLauncher;
  return undefined;
}
