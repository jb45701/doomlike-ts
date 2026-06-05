/**
 * InputManager — global input state tracker for the Doomlike FPS.
 *
 * A singleton module that tracks raw keyboard and mouse state.
 * The InputSystem reads from this each frame and writes to ECS components.
 *
 * Lifecycle:
 *   import { init, endFrame, dispose } from './input/InputManager';
 *   init(canvas);
 *   // ... each frame ...
 *   endFrame();  // snapshots key state for edge detection
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

let _mouseDeltaX = 0;
let _mouseDeltaY = 0;
let _isPointerLocked = false;
let _canvas: HTMLCanvasElement | null = null;

// ── Bound handlers (kept for dispose()) ────────────────────────────────────

let _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
let _onKeyUp: ((e: KeyboardEvent) => void) | null = null;
let _onMouseMove: ((e: MouseEvent) => void) | null = null;
let _onPointerLockChange: (() => void) | null = null;
let _onPointerLockError: (() => void) | null = null;
let _onVisibilityChange: (() => void) | null = null;

// ── Public API ──────────────────────────────────────────────────────────────

/** Attach event listeners to the document and canvas. Call once on startup. */
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
      _prevKeysDown.clear();
      _mouseDeltaX = 0;
      _mouseDeltaY = 0;
    }
  };
  document.addEventListener('visibilitychange', _onVisibilityChange);
}

/** Remove all event listeners and reset state. Safe to call multiple times. */
export function dispose(): void {
  if (_onKeyDown) document.removeEventListener('keydown', _onKeyDown);
  if (_onKeyUp) document.removeEventListener('keyup', _onKeyUp);
  if (_onMouseMove) document.removeEventListener('mousemove', _onMouseMove);
  if (_onPointerLockChange) document.removeEventListener('pointerlockchange', _onPointerLockChange);
  if (_onPointerLockError) document.removeEventListener('pointerlockerror', _onPointerLockError);
  if (_onVisibilityChange) document.removeEventListener('visibilitychange', _onVisibilityChange);

  _onKeyDown = null;
  _onKeyUp = null;
  _onMouseMove = null;
  _onPointerLockChange = null;
  _onPointerLockError = null;
  _onVisibilityChange = null;

  _keysDown.clear();
  _prevKeysDown.clear();
  _mouseDeltaX = 0;
  _mouseDeltaY = 0;
  _isPointerLocked = false;
  _canvas = null;
}

/** Request pointer lock on the game canvas. */
export function requestPointerLock(): void {
  if (_canvas) {
    _canvas.requestPointerLock();
  }
}

/** Returns true if the given key is currently held down. */
export function isKeyDown(key: string): boolean {
  return _keysDown.has(key);
}

/**
 * Returns true on the *first frame* the key was pressed.
 * Only true once per press — must release and press again.
 */
export function wasKeyPressed(key: string): boolean {
  return _keysDown.has(key) && !_prevKeysDown.has(key);
}

/**
 * Returns the accumulated mouse delta since the last call
 * and resets the accumulator to zero.
 */
export function resetMouseDelta(): MouseDelta {
  const delta: MouseDelta = { x: _mouseDeltaX, y: _mouseDeltaY };
  _mouseDeltaX = 0;
  _mouseDeltaY = 0;
  return delta;
}

/** Returns whether pointer lock is currently active. */
export function isPointerLocked(): boolean {
  return _isPointerLocked;
}

/**
 * Called at the end of each frame by the game loop.
 * Snapshots current key state so wasKeyPressed() detects new presses
 * correctly on the next frame.
 */
export function endFrame(): void {
  _prevKeysDown.clear();
  for (const k of _keysDown) {
    _prevKeysDown.add(k);
  }
}
