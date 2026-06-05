/**
 * InputManager — global input state tracker.
 *
 * Tracks raw keyboard/mouse state for the game loop. The InputSystem
 * reads from this module each frame and writes to the ECS InputState
 * component on the player entity.
 *
 * Lifecycle:
 *   import { init, resetMouseDelta, endFrame, dispose } from './input/InputManager';
 *   init(canvas);
 *   // ... each frame ...
 *   resetMouseDelta();
 *   endFrame();
 *   // ... on shutdown ...
 *   dispose();
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface MouseDelta {
  x: number;
  y: number;
}

// ── State ───────────────────────────────────────────────────────────────────

const _keysDown = new Set<string>();
const _prevKeysDown = new Set<string>();
const _mouseButtonsDown = new Set<number>();
const _prevMouseButtonsDown = new Set<number>();

let _mouseDeltaX = 0;
let _mouseDeltaY = 0;
let _isPointerLocked = false;
let _canvas: HTMLCanvasElement | null = null;

// ── Bound handlers (kept for dispose()) ────────────────────────────────────

let _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
let _onKeyUp: ((e: KeyboardEvent) => void) | null = null;
let _onMouseDown: ((e: MouseEvent) => void) | null = null;
let _onMouseUp: ((e: MouseEvent) => void) | null = null;
let _onMouseMove: ((e: MouseEvent) => void) | null = null;
let _onPointerLockChange: (() => void) | null = null;
let _onPointerLockError: (() => void) | null = null;
let _onVisibilityChange: (() => void) | null = null;

// ── Public API ──────────────────────────────────────────────────────────────

export function init(canvas: HTMLCanvasElement): void {
  if (_canvas) {
    console.warn('[InputManager] Already initialised — call dispose() first');
    return;
  }
  _canvas = canvas;

  _onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    _keysDown.add(e.code);
  };
  document.addEventListener('keydown', _onKeyDown);

  _onKeyUp = (e: KeyboardEvent) => {
    _keysDown.delete(e.code);
  };
  document.addEventListener('keyup', _onKeyUp);

  _onMouseDown = (e: MouseEvent) => {
    _mouseButtonsDown.add(e.button);
  };
  document.addEventListener('mousedown', _onMouseDown);

  _onMouseUp = (e: MouseEvent) => {
    _mouseButtonsDown.delete(e.button);
  };
  document.addEventListener('mouseup', _onMouseUp);

  _onMouseMove = (e: MouseEvent) => {
    if (_isPointerLocked) {
      _mouseDeltaX += e.movementX;
      _mouseDeltaY += e.movementY;
    }
  };
  document.addEventListener('mousemove', _onMouseMove);

  _onPointerLockChange = () => {
    _isPointerLocked = document.pointerLockElement === _canvas;
    const overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.classList.toggle('hidden', _isPointerLocked);
    }
  };
  document.addEventListener('pointerlockchange', _onPointerLockChange);

  _onPointerLockError = () => {
    console.warn('[InputManager] Pointer lock request denied');
  };
  document.addEventListener('pointerlockerror', _onPointerLockError);

  _onVisibilityChange = () => {
    if (document.hidden) {
      _keysDown.clear();
      _mouseButtonsDown.clear();
      _mouseDeltaX = 0;
      _mouseDeltaY = 0;
    }
  };
  document.addEventListener('visibilitychange', _onVisibilityChange);
}

export function dispose(): void {
  if (_onKeyDown) document.removeEventListener('keydown', _onKeyDown);
  if (_onKeyUp) document.removeEventListener('keyup', _onKeyUp);
  if (_onMouseDown) document.removeEventListener('mousedown', _onMouseDown);
  if (_onMouseUp) document.removeEventListener('mouseup', _onMouseUp);
  if (_onMouseMove) document.removeEventListener('mousemove', _onMouseMove);
  if (_onPointerLockChange) document.removeEventListener('pointerlockchange', _onPointerLockChange);
  if (_onPointerLockError) document.removeEventListener('pointerlockerror', _onPointerLockError);
  if (_onVisibilityChange) document.removeEventListener('visibilitychange', _onVisibilityChange);

  _onKeyDown = null;
  _onKeyUp = null;
  _onMouseDown = null;
  _onMouseUp = null;
  _onMouseMove = null;
  _onPointerLockChange = null;
  _onPointerLockError = null;
  _onVisibilityChange = null;

  _keysDown.clear();
  _prevKeysDown.clear();
  _mouseButtonsDown.clear();
  _prevMouseButtonsDown.clear();
  _mouseDeltaX = 0;
  _mouseDeltaY = 0;
  _isPointerLocked = false;
  _canvas = null;
}

export function requestPointerLock(): void {
  if (_canvas) {
    _canvas.requestPointerLock();
  }
}

export function isKeyDown(key: string): boolean {
  return _keysDown.has(key);
}

export function wasKeyPressed(key: string): boolean {
  return _keysDown.has(key) && !_prevKeysDown.has(key);
}

export function isMouseButtonDown(button: number): boolean {
  return _mouseButtonsDown.has(button);
}

export function wasMouseButtonPressed(button: number): boolean {
  return _mouseButtonsDown.has(button) && !_prevMouseButtonsDown.has(button);
}

export function resetMouseDelta(): MouseDelta {
  const delta: MouseDelta = { x: _mouseDeltaX, y: _mouseDeltaY };
  _mouseDeltaX = 0;
  _mouseDeltaY = 0;
  return delta;
}

export function isPointerLocked(): boolean {
  return _isPointerLocked;
}

export function endFrame(): void {
  _prevKeysDown.clear();
  for (const k of _keysDown) {
    _prevKeysDown.add(k);
  }

  _prevMouseButtonsDown.clear();
  for (const b of _mouseButtonsDown) {
    _prevMouseButtonsDown.add(b);
  }
}
