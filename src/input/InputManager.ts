/**
 * InputManager — global input state tracker for the Doomlike FPS.
 *
 * Responsibilities:
 * - Track keyboard state (held keys via keydown/keyup)
 * - Track mouse button state (left/middle/right)
 * - Pointer lock management (request on overlay click, release on Escape)
 * - Mouse delta accumulation (mousemove events when pointer is locked)
 *
 * Lifecycle:
 *   InputManager.init(canvas);
 *   const state = InputManager.getState();
 *   InputManager.endFrame();
 *   InputManager.dispose();
 */

export interface MouseDelta { x: number; y: number; }

export interface InputSnapshot {
  readonly keys: ReadonlySet<string>;
  readonly mouseX: number;
  readonly mouseY: number;
  readonly isLocked: boolean;
}

const _keysDown = new Set<string>();
const _prevKeysDown = new Set<string>();
const _mouseButtons = new Set<number>();
const _prevMouseButtons = new Set<number>();
let _mouseDeltaX = 0;
let _mouseDeltaY = 0;
let _isPointerLocked = false;
let _canvas: HTMLCanvasElement | null = null;

let _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
let _onKeyUp: ((e: KeyboardEvent) => void) | null = null;
let _onMouseDown: ((e: MouseEvent) => void) | null = null;
let _onMouseUp: ((e: MouseEvent) => void) | null = null;
let _onMouseMove: ((e: MouseEvent) => void) | null = null;
let _onPointerLockChange: (() => void) | null = null;
let _onPointerLockError: (() => void) | null = null;
let _onOverlayClick: (() => void) | null = null;
let _onVisibilityChange: (() => void) | null = null;
export function init(canvas: HTMLCanvasElement): void {
  if (_canvas) { console.warn('[InputManager] Already initialised'); return; }
  _canvas = canvas;

  _onKeyDown = (e) => { if (!e.repeat) _keysDown.add(e.code); };
  document.addEventListener('keydown', _onKeyDown);

  _onKeyUp = (e) => { _keysDown.delete(e.code); };
  document.addEventListener('keyup', _onKeyUp);

  _onMouseDown = (e) => { _mouseButtons.add(e.button); };
  document.addEventListener('mousedown', _onMouseDown);

  _onMouseUp = (e) => { _mouseButtons.delete(e.button); };
  document.addEventListener('mouseup', _onMouseUp);

  _onMouseMove = (e) => {
    if (_isPointerLocked) { _mouseDeltaX += e.movementX; _mouseDeltaY += e.movementY; }
  };
  document.addEventListener('mousemove', _onMouseMove);

  _onPointerLockChange = () => {
    _isPointerLocked = document.pointerLockElement === _canvas;
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.toggle('hidden', _isPointerLocked);
  };
  document.addEventListener('pointerlockchange', _onPointerLockChange);

  _onPointerLockError = () => { console.warn('[InputManager] Pointer lock denied'); };
  document.addEventListener('pointerlockerror', _onPointerLockError);

  /* Wire overlay click to initiate pointer lock */
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.addEventListener('click', () => canvas.requestPointerLock());

  _onVisibilityChange = () => {
    if (document.hidden) { _keysDown.clear(); _mouseDeltaX = 0; _mouseDeltaY = 0; }
  };
  document.addEventListener('visibilitychange', _onVisibilityChange);

  _isPointerLocked = document.pointerLockElement === canvas;
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
  _onKeyDown = null; _onKeyUp = null;
  _onMouseDown = null; _onMouseUp = null; _onMouseMove = null;
  _onPointerLockChange = null; _onPointerLockError = null; _onVisibilityChange = null;
  _keysDown.clear(); _prevKeysDown.clear();
  _mouseButtons.clear(); _prevMouseButtons.clear();
  _mouseDeltaX = 0; _mouseDeltaY = 0;
  _isPointerLocked = false; _canvas = null;
}

export function requestPointerLock(): void {
  if (_canvas) _canvas.requestPointerLock();
}

export function getState(): InputSnapshot {
  return {
    keys: new Set(_keysDown),
    mouseX: _mouseDeltaX,
    mouseY: _mouseDeltaY,
    isLocked: _isPointerLocked,
  };
}

export function isKeyDown(key: string): boolean { return _keysDown.has(key); }

export function wasKeyPressed(key: string): boolean {
  return _keysDown.has(key) && !_prevKeysDown.has(key);
}

export function isMouseButtonDown(button: number): boolean {
  return _mouseButtons.has(button);
}

export function wasMouseButtonPressed(button: number): boolean {
  return _mouseButtons.has(button) && !_prevMouseButtons.has(button);
}

export function resetMouseDelta(): MouseDelta {
  const d = { x: _mouseDeltaX, y: _mouseDeltaY };
  _mouseDeltaX = 0; _mouseDeltaY = 0;
  return d;
}

export function isPointerLocked(): boolean { return _isPointerLocked; }

export function endFrame(): void {
  _prevKeysDown.clear();
  for (const k of _keysDown) _prevKeysDown.add(k);
  _prevMouseButtons.clear();
  for (const b of _mouseButtons) _prevMouseButtons.add(b);
}
