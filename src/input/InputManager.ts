/**
 * InputManager — global input state tracker for the Doomlike FPS.
 *
 * Responsibilities:
 * - Track keyboard state (held keys via keydown/keyup)
 * - Pointer lock management (request on overlay click, release on Escape)
 * - Mouse delta accumulation (mousemove events when pointer is locked)
 *
 * Lifecycle:
 *   init(canvas);
 *   ...
 *   const state = getState();  // resets mouse delta
 *   if (state.keys.has('KeyW')) { ... }
 *   ...
 *   dispose();
 *
 * The InputManager is standalone — no ECS or Three.js dependency.
 * InputSystem (in src/systems/) will read this and write to ECS components.
 */

export interface InputSnapshot {
  /** Set of currently held key codes (e.g. 'KeyW', 'Space', 'ShiftLeft'). */
  readonly keys: ReadonlySet<string>;
  /** Accumulated mouse X delta since last getState() call (pixels). */
  readonly mouseX: number;
  /** Accumulated mouse Y delta since last getState() call (pixels). */
  readonly mouseY: number;
  /** Whether the pointer is currently locked to the canvas. */
  readonly isLocked: boolean;
}

// ── State ───────────────────────────────────────────────
const keys = new Set<string>();
let mouseDeltaX = 0;
let mouseDeltaY = 0;
let isLocked = false;
let _canvas: HTMLCanvasElement | null = null;

let overlay: HTMLElement | null = null;

// Bound handlers stored for removal on dispose
let boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;
let boundOnKeyUp: ((e: KeyboardEvent) => void) | null = null;
let boundOnMouseMove: ((e: MouseEvent) => void) | null = null;
let boundOnPointerLockChange: (() => void) | null = null;
let boundOnPointerLockError: (() => void) | null = null;
let boundOnOverlayClick: (() => void) | null = null;
let boundOnVisibilityChange: (() => void) | null = null;

/**
 * Initialize input listeners.
 * Call once after the canvas is in the DOM.
 */
export function init(canvas: HTMLCanvasElement): void {
  if (_canvas) return;
  _canvas = canvas;
  overlay = document.getElementById('overlay');

  boundOnKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    keys.add(e.code);
  };
  document.addEventListener('keydown', boundOnKeyDown);

  boundOnKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
  document.addEventListener('keyup', boundOnKeyUp);

  boundOnMouseMove = (e: MouseEvent) => {
    if (isLocked) {
      mouseDeltaX += e.movementX;
      mouseDeltaY += e.movementY;
    }
  };
  document.addEventListener('mousemove', boundOnMouseMove);

  boundOnPointerLockChange = () => {
    isLocked = document.pointerLockElement === _canvas;
    if (overlay) {
      overlay.classList.toggle('hidden', isLocked);
    }
  };
  document.addEventListener('pointerlockchange', boundOnPointerLockChange);

  boundOnPointerLockError = () => { isLocked = false; };
  document.addEventListener('pointerlockerror', boundOnPointerLockError);

  boundOnOverlayClick = () => {
    if (_canvas) _canvas.requestPointerLock();
  };
  if (overlay) {
    overlay.addEventListener('click', boundOnOverlayClick);
  }

  boundOnVisibilityChange = () => {
    if (document.hidden) {
      keys.clear();
      mouseDeltaX = 0;
      mouseDeltaY = 0;
    }
  };
  document.addEventListener('visibilitychange', boundOnVisibilityChange);
}

/**
 * Get a snapshot of the current input state.
 * Resets accumulated mouse delta to zero after reading.
 * Call once per frame, typically at the start of InputSystem.
 */
export function getState(): InputSnapshot {
  const state: InputSnapshot = {
    keys: new Set(keys),
    mouseX: mouseDeltaX,
    mouseY: mouseDeltaY,
    isLocked,
  };
  mouseDeltaX = 0;
  mouseDeltaY = 0;
  return state;
}

/**
 * Check if a specific key is currently held down.
 */
export function isKeyDown(code: string): boolean {
  return keys.has(code);
}

/** Whether the pointer is currently locked to the canvas. */
export function isPointerLocked(): boolean {
  return isLocked;
}

/**
 * Request pointer lock on the canvas.
 * Called automatically on overlay click; can also be called manually.
 */
export function requestPointerLock(): void {
  if (_canvas) _canvas.requestPointerLock();
}

/**
 * Called at the end of each frame.
 * Snapshots state for edge detection on the next frame.
 * Currently a no-op — edge detection will be added when needed.
 */
export function endFrame(): void {
  // Reserved for frame-edge detection
}

/**
 * Remove all event listeners and reset internal state.
 * Call when the game is shutting down or the canvas is being replaced.
 */
export function dispose(): void {
  if (_canvas && document.pointerLockElement === _canvas) {
    document.exitPointerLock();
  }

  if (boundOnKeyDown) document.removeEventListener('keydown', boundOnKeyDown);
  if (boundOnKeyUp) document.removeEventListener('keyup', boundOnKeyUp);
  if (boundOnMouseMove) document.removeEventListener('mousemove', boundOnMouseMove);
  if (boundOnPointerLockChange) document.removeEventListener('pointerlockchange', boundOnPointerLockChange);
  if (boundOnPointerLockError) document.removeEventListener('pointerlockerror', boundOnPointerLockError);
  if (boundOnVisibilityChange) document.removeEventListener('visibilitychange', boundOnVisibilityChange);
  if (overlay && boundOnOverlayClick) overlay.removeEventListener('click', boundOnOverlayClick);

  if (overlay) overlay.classList.remove('hidden');

  boundOnKeyDown = boundOnKeyUp = boundOnMouseMove = null;
  boundOnPointerLockChange = boundOnPointerLockError = null;
  boundOnOverlayClick = boundOnVisibilityChange = null;

  keys.clear();
  mouseDeltaX = 0;
  mouseDeltaY = 0;
  isLocked = false;
  _canvas = null;
  overlay = null;
}
