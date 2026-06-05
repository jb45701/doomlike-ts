/**
 * InputManager — global input state tracker.
 *
 * Tracks raw keyboard/mouse state for the game loop. The InputSystem
 * reads from this singleton each frame and writes to the ECS InputState
 * component on the player entity.
 *
 * Lifecycle:
 *   init(canvas);
 *   // ... each frame ...
 *   const delta = resetMouseDelta();
 *   inputSystem(world);
 *   endFrame();
 *   // ... on shutdown ...
 *   dispose();
 *
 * All event listeners are attached on init() and removed on dispose().
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface MouseDelta {
  x: number;
  y: number;
}

// ── State ───────────────────────────────────────────────────────────────────

/** Keys currently held down (updated on keydown/keyup). */
const _keysDown = new Set<string>();

/** Snapshot of keysDown at the end of the previous frame. */
const _prevKeysDown = new Set<string>();

/** Mouse buttons currently held down (0=left, 1=middle, 2=right). */
const _mouseButtonsDown = new Set<number>();

/** Snapshot of mouseButtonsDown at the end of the previous frame. */
const _prevMouseButtonsDown = new Set<number>();

/** Accumulated mouse delta since last reset. */
let _mouseDeltaX = 0;
let _mouseDeltaY = 0;

/** Whether pointer lock is currently active. */
let _isPointerLocked = false;

/** The game canvas element — used for pointer lock requests. */
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

/**
 * Initialise the InputManager.
 * Attaches all event listeners to the document and canvas.
 * Must be called once before any input tracking is active.
 *
 * @param canvas - The HTML canvas element for pointer lock
 */
export function init(canvas: HTMLCanvasElement): void {
  if (_canvas) {
    console.warn('[InputManager] Already initialised — call dispose() first');
    return;
  }
  _canvas = canvas;

  // ── Keyboard ────────────────────────────────────────────
  _onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return; // ignore repeats (held key)
    _keysDown.add(e.code);
  };
  document.addEventListener('keydown', _onKeyDown);

  _onKeyUp = (e: KeyboardEvent) => {
    _keysDown.delete(e.code);
  };
  document.addEventListener('keyup', _onKeyUp);

  // ── Mouse buttons ───────────────────────────────────────
  _onMouseDown = (e: MouseEvent) => {
    _mouseButtonsDown.add(e.button);
  };
  document.addEventListener('mousedown', _onMouseDown);

  _onMouseUp = (e: MouseEvent) => {
    _mouseButtonsDown.delete(e.button);
  };
  document.addEventListener('mouseup', _onMouseUp);

  // ── Mouse movement ──────────────────────────────────────
  _onMouseMove = (e: MouseEvent) => {
    if (_isPointerLocked) {
      // Only accumulate delta when pointer is locked (FPS look mode)
      _mouseDeltaX += e.movementX;
      _mouseDeltaY += e.movementY;
    }
  };
  document.addEventListener('mousemove', _onMouseMove);

  // ── Pointer lock ────────────────────────────────────────
  _onPointerLockChange = () => {
    _isPointerLocked = document.pointerLockElement === _canvas;
    // Toggle overlay visibility
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

  // ── Visibility change (tab focus lost) ──────────────────
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

/**
 * Tear down the InputManager.
 * Removes all event listeners and resets internal state.
 * Safe to call multiple times.
 */
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

/**
 * Request pointer lock on the game canvas.
 * Typically called when the player clicks the start overlay.
 */
export function requestPointerLock(): void {
  if (_canvas) {
    _canvas.requestPointerLock();
  }
}

/**
 * Returns true if the key is currently held down.
 * @param key - KeyboardEvent.code value (e.g. 'KeyW', 'Space', 'ShiftLeft')
 */
export function isKeyDown(key: string): boolean {
  return _keysDown.has(key);
}

/**
 * Returns true on the *first frame* the key was pressed.
 * Only true once per press — you must release and press again.
 * @param key - KeyboardEvent.code value
 */
export function wasKeyPressed(key: string): boolean {
  return _keysDown.has(key) && !_prevKeysDown.has(key);
}

/**
 * Returns true if the mouse button is currently held down.
 * @param button - MouseEvent.button value (0=left, 1=middle, 2=right)
 */
export function isMouseButtonDown(button: number): boolean {
  return _mouseButtonsDown.has(button);
}

/**
 * Returns true on the *first frame* the mouse button was pressed.
 * @param button - MouseEvent.button value (0=left, 1=middle, 2=right)
 */
export function wasMouseButtonPressed(button: number): boolean {
  return _mouseButtonsDown.has(button) && !_prevMouseButtonsDown.has(button);
}

/**
 * Returns the accumulated mouse delta since the last call
 * and resets the accumulator. Called once per frame by the
 * game loop after the InputSystem has read the values.
 */
export function resetMouseDelta(): MouseDelta {
  const delta: MouseDelta = { x: _mouseDeltaX, y: _mouseDeltaY };
  _mouseDeltaX = 0;
  _mouseDeltaY = 0;
  return delta;
}

/**
 * Returns the current pointer lock state.
 */
export function isPointerLocked(): boolean {
  return _isPointerLocked;
}

// ── Internal frame management ──────────────────────────────────────────────

/**
 * Called at the end of each frame by the game loop.
 * Snapshots current key/mouse state so wasKeyPressed /
 * wasMouseButtonPressed correctly detects new presses next frame.
 */
export function endFrame(): void {
  // Snapshot current keys for edge detection next frame
  _prevKeysDown.clear();
  for (const k of _keysDown) {
    _prevKeysDown.add(k);
  }

  _prevMouseButtonsDown.clear();
  for (const b of _mouseButtonsDown) {
    _prevMouseButtonsDown.add(b);
  }
}
