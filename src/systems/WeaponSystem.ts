/**
 * WeaponSystem — handles weapon state, firing, hitscan, projectile spawning,
 * and weapon switching for the player entity.
 *
 * Processing order (called after InputSystem, before MovementSystem):
 *   1. Handle weapon switching (next/prev weapon, weapon slots)
 *   2. Check for fire input
 *   3. If firing, cooldown ≤ 0, and ammo > 0:
 *      a. For hitscan weapons (pistol, shotgun):
 *         - Compute direction from Rotation (yaw/pitch)
 *         - Raycast from camera center
 *         - On hit: apply Damage to target, emit weapon_impact event
 *         - Shotgun: 5 pellets with spread
 *      b. For projectile weapons (chaingun, rocket):
 *         - Spawn projectile entity with Velocity, Damage, Collider, DespawnTimer
 *         - Emit weapon_fired event
 *   4. Decrement cooldown by deltaTime
 *   5. Update WeaponState component
 *
 * Lifecycle:
 *   WeaponSystem(world, physics, eid, dt);
 */

import { addComponent, addEntity } from 'bitecs';
import {
  InputState,
  WeaponState,
  Position,
  Rotation,
  Velocity,
  Collider,
  RigidBody,
  Damage,
  DespawnTimer,
  Renderable,
  RenderableKind,
  ColliderShape,
  WeaponKind,
} from '../ecs/Components';
import type { EcsWorld } from '../ecs/World';
import type { RapierContext, Vec3 } from '../physics/RapierWorld';
import { emitEvent } from '../events/GameEvents';
import { PLAYER_FLOOR_OFFSET } from '../constants';

// ── Weapon definitions ───────────────────────────────────────────────────────

export interface WeaponDef {
  kind: number;
  name: string;
  damage: number;
  cooldown: number;       // seconds between shots
  maxAmmo: number;
  hitscan: boolean;        // false = projectile weapon
  pellets: number;         // shotgun spread count (1 = single shot)
  spread: number;          // radians of random spread per pellet
  projectileSpeed: number;  // units/s for projectile weapons
  projectileRadius: number;
}

export const WEAPON_DEFS: WeaponDef[] = [
  // Fist (slot 0) — no ammo, melee only (no-op for now)
  { kind: WeaponKind.Fist, name: 'Fist', damage: 10, cooldown: 0.5, maxAmmo: Infinity, hitscan: true, pellets: 1, spread: 0, projectileSpeed: 0, projectileRadius: 0 },
  // Pistol (slot 1) — hitscan, single shot
  { kind: WeaponKind.Pistol, name: 'Pistol', damage: 15, cooldown: 0.4, maxAmmo: 20, hitscan: true, pellets: 1, spread: 0.01, projectileSpeed: 0, projectileRadius: 0 },
  // Shotgun (slot 2) — hitscan spread
  { kind: WeaponKind.Shotgun, name: 'Shotgun', damage: 10, cooldown: 0.8, maxAmmo: 8, hitscan: true, pellets: 5, spread: 0.07, projectileSpeed: 0, projectileRadius: 0 },
  // Chaingun (slot 3) — projectile, auto-fire while held
  { kind: WeaponKind.Chaingun, name: 'Chaingun', damage: 8, cooldown: 0.1, maxAmmo: 200, hitscan: false, pellets: 1, spread: 0.02, projectileSpeed: 1200, projectileRadius: 2 },
  // Rocket Launcher (slot 4) — projectile
  { kind: WeaponKind.RocketLauncher, name: 'Rocket Launcher', damage: 100, cooldown: 1.0, maxAmmo: 4, hitscan: false, pellets: 1, spread: 0, projectileSpeed: 800, projectileRadius: 4 },
];

/** Ordered weapon kind list for cycling. */
export const WEAPON_CYCLE_ORDER = [
  WeaponKind.Fist,
  WeaponKind.Pistol,
  WeaponKind.Shotgun,
  WeaponKind.Chaingun,
  WeaponKind.RocketLauncher,
];

/** Projectile despawn time (seconds). */
const PROJ_DESPAWN_TIME = 5;
/** Max hitscan raycast range (units). */
const HITSCAN_RANGE = 2048;

// ── System ───────────────────────────────────────────────────────────────────

export function WeaponSystem(
  world: EcsWorld,
  physics: RapierContext,
  playerEid: number,
  deltaTime: number,
): void {
  // Ensure player has WeaponState
  if (WeaponState.kind.length <= playerEid) {
    addComponent(world, playerEid, WeaponState);
    WeaponState.kind[playerEid] = WeaponKind.Pistol;
    WeaponState.ammo[playerEid] = 20;
    WeaponState.maxAmmo[playerEid] = 20;
    WeaponState.cooldown[playerEid] = 0;
    WeaponState.firing[playerEid] = false;
    WeaponState.reloading[playerEid] = false;
    WeaponState.reloadTimer[playerEid] = 0;
  }

  const eid = playerEid;

  // ── Read current state ──────────────────────────────────────────────────
  let cooldown = WeaponState.cooldown[eid] ?? 0;
  let currentKind = WeaponState.kind[eid] ?? WeaponKind.Pistol;
  let ammo = WeaponState.ammo[eid] ?? 0;

  // ── Weapon switching ────────────────────────────────────────────────────
  if (InputState.nextWeapon[eid]) {
    currentKind = cycleWeapon(currentKind, 1);
  }
  if (InputState.prevWeapon[eid]) {
    currentKind = cycleWeapon(currentKind, -1);
  }
  // Weapon slot hotkeys (Digit1-5 maps to Fist-RocketLauncher)
  applyWeaponSlot(eid, currentKind);

  // ── Decrement cooldown ──────────────────────────────────────────────────
  if (cooldown > 0) {
    cooldown -= deltaTime;
    if (cooldown < 0) cooldown = 0;
  }

  // ── Check fire input ────────────────────────────────────────────────────
  const fireHeld = InputState.fire[eid] ?? false;
  const weaponDef = getWeaponDef(currentKind);

  let fired = false;
  if (fireHeld && cooldown <= 0 && ammo > 0 && weaponDef) {
    // Fire the weapon
    if (weaponDef.hitscan) {
      handleHitscan(world, physics, eid, weaponDef);
    } else {
      handleProjectile(world, eid, weaponDef);
    }
    // Emit weapon_fired event
    const pos: Vec3 = { x: Position.x[eid] ?? 0, y: (Position.y[eid] ?? 0) + PLAYER_FLOOR_OFFSET, z: Position.z[eid] ?? 0 };
    const dir = getFireDirection(eid);
    emitEvent({
      type: 'weapon_fired',
      weapon: weaponDef.name,
      position: pos,
      direction: dir,
    });
    fired = true;
  }

  // ── Write back to WeaponState ───────────────────────────────────────────
  if (fired) {
    ammo -= 1;
    cooldown = weaponDef!.cooldown;
    WeaponState.firing[eid] = true;
  } else {
    WeaponState.firing[eid] = fireHeld;
  }
  WeaponState.kind[eid] = currentKind;
  WeaponState.ammo[eid] = ammo;
  WeaponState.cooldown[eid] = cooldown;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getWeaponDef(kind: number): WeaponDef | undefined {
  return WEAPON_DEFS.find(d => d.kind === kind);
}

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
 * Check and apply weapon slot hotkey presses.
 */
function applyWeaponSlot(eid: number, _currentKind: number): void {
  if (InputState.weaponSlot1[eid]) { WeaponState.kind[eid] = WeaponKind.Fist; return; }
  if (InputState.weaponSlot2[eid]) { WeaponState.kind[eid] = WeaponKind.Pistol; return; }
  if (InputState.weaponSlot3[eid]) { WeaponState.kind[eid] = WeaponKind.Shotgun; return; }
  if (InputState.weaponSlot4[eid]) { WeaponState.kind[eid] = WeaponKind.Chaingun; return; }
  if (InputState.weaponSlot5[eid]) { WeaponState.kind[eid] = WeaponKind.RocketLauncher; return; }
}

/**
 * Compute the fire direction from the player's rotation.
 */
function getFireDirection(eid: number): Vec3 {
  const yaw = Rotation.yaw[eid] ?? 0;
  const pitch = Rotation.pitch[eid] ?? 0;
  // Forward vector from yaw + pitch
  const cosPitch = Math.cos(pitch);
  return {
    x: -Math.sin(yaw) * cosPitch,
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * cosPitch,
  };
}

/**
 * Handle a hitscan weapon shot (pistol, shotgun).
 * Performs a raycast from the camera position in the fire direction.
 */
function handleHitscan(
  _world: EcsWorld,
  physics: RapierContext,
  eid: number,
  def: WeaponDef,
): void {
  const origin: Vec3 = {
    x: Position.x[eid] ?? 0,
    y: (Position.y[eid] ?? 0) + PLAYER_FLOOR_OFFSET,
    z: Position.z[eid] ?? 0,
  };

  for (let p = 0; p < def.pellets; p++) {
    // Apply spread
    let dir: Vec3;
    if (def.spread > 0 && def.pellets > 1) {
      const spreadPitch = (Math.random() - 0.5) * def.spread * 2;
      const spreadYaw = (Math.random() - 0.5) * def.spread * 2;
      const cosPitch = Math.cos(Rotation.pitch[eid] + spreadPitch);
      dir = {
        x: -Math.sin(Rotation.yaw[eid] + spreadYaw) * cosPitch,
        y: Math.sin(Rotation.pitch[eid] + spreadPitch),
        z: -Math.cos(Rotation.yaw[eid] + spreadYaw) * cosPitch,
      };
    } else {
      dir = getFireDirection(eid);
    }

    const hit = physics.raycast(origin, dir, HITSCAN_RANGE);
    if (!hit) continue;

    // Emit impact event for visual feedback
    emitEvent({
      type: 'weapon_impact',
      surface: 'wall',
      position: hit.point,
    });
  }
}

/**
 * Handle a projectile weapon shot (chaingun, rocket launcher).
 * Spawns an entity with Position, Velocity, Collider, RigidBody, Damage,
 * DespawnTimer, and Renderable.
 */
function handleProjectile(
  world: EcsWorld,
  eid: number,
  def: WeaponDef,
): void {
  const origin: Vec3 = {
    x: Position.x[eid] ?? 0,
    y: (Position.y[eid] ?? 0) + PLAYER_FLOOR_OFFSET,
    z: Position.z[eid] ?? 0,
  };
  const direction = getFireDirection(eid);

  // Apply slight random spread for chaingun
  let dir = direction;
  if (def.spread > 0) {
    const spreadPitch = (Math.random() - 0.5) * def.spread * 2;
    const spreadYaw = (Math.random() - 0.5) * def.spread * 2;
    const cosPitch = Math.cos(spreadPitch);
    dir = {
      x: -Math.sin(Rotation.yaw[eid] + spreadYaw) * cosPitch,
      y: Math.sin(Rotation.pitch[eid] + spreadPitch),
      z: -Math.cos(Rotation.yaw[eid] + spreadYaw) * cosPitch,
    };
  }

  // Spawn position: in front of the camera (to avoid self-collision)
  const spawnPos: Vec3 = {
    x: origin.x + dir.x * 48,
    y: origin.y + dir.y * 48,
    z: origin.z + dir.z * 48,
  };

  // Create the projectile entity
  const projEid = addEntity(world);
  addComponent(world, projEid, Position);
  addComponent(world, projEid, Velocity);
  addComponent(world, projEid, Collider);
  addComponent(world, projEid, RigidBody);
  addComponent(world, projEid, Damage);
  addComponent(world, projEid, DespawnTimer);
  addComponent(world, projEid, Renderable);

  // Position
  Position.x[projEid] = spawnPos.x;
  Position.y[projEid] = spawnPos.y;
  Position.z[projEid] = spawnPos.z;

  // Velocity — direction * speed
  Velocity.dx[projEid] = dir.x * def.projectileSpeed;
  Velocity.dy[projEid] = dir.y * def.projectileSpeed;
  Velocity.dz[projEid] = dir.z * def.projectileSpeed;

  // Collider (sphere)
  Collider.shape[projEid] = ColliderShape.Sphere;
  Collider.radius[projEid] = def.projectileRadius;
  Collider.height[projEid] = 0;

  // RigidBody (dynamic, no gravity for projectile)
  RigidBody.mass[projEid] = 1;
  RigidBody.grounded[projEid] = false;

  // Damage
  Damage.amount[projEid] = def.damage;
  Damage.source[projEid] = eid;
  Damage.knockbackX[projEid] = 0;
  Damage.knockbackY[projEid] = 0;
  Damage.knockbackZ[projEid] = 0;

  // Despawn — clean up after timeout
  DespawnTimer.remaining[projEid] = PROJ_DESPAWN_TIME;

  // Renderable placeholder
  Renderable.kind[projEid] = RenderableKind.Mesh;
  Renderable.resourceId[projEid] = 'projectile';
  Renderable.scale[projEid] = def.projectileRadius * 2;
  Renderable.brightness[projEid] = 1; // fullbright
}
