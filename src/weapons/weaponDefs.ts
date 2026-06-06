/**
 * weaponDefs — Weapon definition data for the Doomlike FPS.
 *
 * Exports the WeaponDef interface, the WEAPON_DEFS array (5 weapons),
 * and the WEAPON_CYCLE_ORDER for weapon switching.
 *
 * Usage:
 *   import { WEAPON_DEFS, getWeaponDef } from '../weapons/weaponDefs';
 */

import { WeaponKind } from '../ecs/Components';

// ── Weapon definition ────────────────────────────────────────────────────────

export interface WeaponDef {
  kind: number;
  name: string;
  damage: number;
  cooldown: number;        // seconds between shots
  maxAmmo: number;
  hitscan: boolean;         // false = projectile weapon
  pellets: number;          // shotgun spread count (1 = single shot)
  spread: number;           // radians of random spread per pellet
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

/** Ordered weapon kind list for cycling (next/prev). */
export const WEAPON_CYCLE_ORDER = [
  WeaponKind.Fist,
  WeaponKind.Pistol,
  WeaponKind.Shotgun,
  WeaponKind.Chaingun,
  WeaponKind.RocketLauncher,
];

/**
 * Look up a weapon definition by kind.
 */
export function getWeaponDef(kind: number): WeaponDef | undefined {
  return WEAPON_DEFS.find(d => d.kind === kind);
}
