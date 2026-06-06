/**
 * UISystem — reads player state and updates HTML HUD overlay.
 *
 * Runs after all game state is settled for the frame. Reads Health and
 * WeaponState directly from the ECS player entity and updates DOM elements.
 * Also consumes game events for transient effects (damage flash).
 *
 * Usage:
 *   import { UISystem } from './systems/UISystem';
 *   UISystem(world, dt);  // once per frame after syncCamera
 */
import type { EcsWorld } from '../ecs/World';
import {
  Health,
  WeaponState,
} from '../ecs/Components';
import { queryPlayerEntity } from '../ecs/queries';
import { getWeaponDef } from '../weapons/weaponDefs';
import { consumeEvents } from '../events/GameEvents';

// ── DOM element cache (looked up once on init) ──────────────────────────────

let _initDone = false;
let _hudEl: HTMLElement | null = null;
let _healthValue: HTMLElement | null = null;
let _healthBar: HTMLElement | null = null;
let _armorValue: HTMLElement | null = null;
let _healthDisplay: HTMLElement | null = null;
let _ammoValue: HTMLElement | null = null;
let _ammoMaxValue: HTMLElement | null = null;
let _ammoDisplay: HTMLElement | null = null;
let _weaponName: HTMLElement | null = null;
let _damageFlash: HTMLElement | null = null;
let _faceDisplay: HTMLElement | null = null;

/** Flash fade timeout handle to cancel when flashing again. */
let _flashTimeout: ReturnType<typeof setTimeout> | null = null;

/** Cooldown timer for the face's "hit" expression (seconds). */
let _faceTimer = 0;

// ── Face expression states ───────────────────────────────────────────────────

const FACE_STATES: Record<string, string> = {
  idle: ':)',
  shooting: ':|',
  damaged: '>((',
  lowHealth: 'D:',
};

/**
 * Lightweight DOM queries — call once, cache refs.
 */
function ensureInit(): void {
  if (_initDone) return;
  _initDone = true;
  _hudEl = document.getElementById('hud');
  _healthDisplay = document.getElementById('health-display');
  _healthValue = document.getElementById('health-value');
  _healthBar = document.getElementById('health-bar');
  _armorValue = document.getElementById('armor-value');
  _ammoDisplay = document.getElementById('ammo-display');
  _ammoValue = document.getElementById('ammo-value');
  _ammoMaxValue = document.getElementById('ammo-max-value');
  _weaponName = document.getElementById('weapon-name');
  _damageFlash = document.getElementById('damage-flash');
  _faceDisplay = document.getElementById('face-display');
}

// ── Damage flash ────────────────────────────────────────────────────────────

/**
 * Flash the screen red when the player takes damage.
 * Uses CSS transitions for smooth fade-out.
 */
function doDamageFlash(): void {
  const flash = _damageFlash;
  if (!flash) return;

  // Cancel any pending fade so we can flash again
  if (_flashTimeout !== null) {
    clearTimeout(_flashTimeout);
    _flashTimeout = null;
  }

  // Remove existing classes, then add flash (instant red)
  flash.classList.remove('fade');
  flash.classList.add('flash');

  // After a tick, switch to fade (triggers CSS transition back to transparent)
  _flashTimeout = setTimeout(() => {
    flash.classList.remove('flash');
    flash.classList.add('fade');
    _flashTimeout = null;
  }, 50);
}

// ── System ──────────────────────────────────────────────────────────────────

/**
 * Main UISystem entry — call once per frame after the game state is settled.
 */
export function UISystem(world: EcsWorld, dt: number): void {
  ensureInit();

  const playerEids = queryPlayerEntity(world);
  if (playerEids.length === 0) return;
  const eid = playerEids[0];

  // ── HUD visibility (show when pointer is locked) ────────────────────
  const isLocked = !!document.pointerLockElement;
  if (_hudEl) {
    _hudEl.classList.toggle('active', isLocked);
  }

  if (!isLocked) return;

  // ── Health ──────────────────────────────────────────────────────────
  const hp = Health.current[eid] ?? 100;
  const hpMax = Health.max[eid] ?? 100;
  const armor = Health.armor[eid] ?? 0;

  if (_healthValue) _healthValue.textContent = String(Math.max(0, Math.ceil(hp)));
  if (_healthBar) _healthBar.style.width = `${Math.max(0, Math.min(100, (hp / hpMax) * 100))}%`;
  if (_armorValue) {
    _armorValue.textContent = armor > 0 ? `Armor: ${Math.ceil(armor)}` : '';
  }
  if (_healthDisplay) {
    _healthDisplay.classList.toggle('health-low', hp <= 20);
  }

  // ── Ammo ────────────────────────────────────────────────────────────
  const ammo = WeaponState.ammo[eid] ?? 0;
  const maxAmmo = WeaponState.maxAmmo[eid] ?? 0;

  if (_ammoValue) _ammoValue.textContent = String(ammo);
  if (_ammoMaxValue) _ammoMaxValue.textContent = String(maxAmmo);
  if (_ammoDisplay) {
    _ammoDisplay.classList.toggle('ammo-empty', ammo === 0);
  }

  // ── Weapon name ─────────────────────────────────────────────────────
  const kind = WeaponState.kind[eid] ?? 0;
  const def = getWeaponDef(kind);
  if (_weaponName && def) {
    _weaponName.textContent = def.name.toUpperCase();
  }

  // ── Process game events (before face decision) ──────────────────────
  const dmgEvents = consumeEvents('player_damaged');
  if (dmgEvents.length > 0) {
    doDamageFlash();
    _faceTimer = 0.4; // show damaged face for 0.4s
  }

  // ── Face expression ─────────────────────────────────────────────────
  _faceTimer = Math.max(0, _faceTimer - dt);
  let faceKey = 'idle';
  if (hp <= 20) {
    faceKey = 'lowHealth';
  } else if (_faceTimer > 0) {
    faceKey = 'damaged';
  } else if (WeaponState.firing[eid] && def && def.cooldown > 0 && WeaponState.ammo[eid] > 0) {
    faceKey = 'shooting';
  }
  if (_faceDisplay) {
    _faceDisplay.textContent = FACE_STATES[faceKey] ?? ':)';
  }
}

// ── Cleanup ─────────────────────────────────────────────────────────────────

/**
 * Dispose the UISystem — cancels pending timeouts.
 */
export function disposeUI(): void {
  if (_flashTimeout !== null) {
    clearTimeout(_flashTimeout);
    _flashTimeout = null;
  }
}
