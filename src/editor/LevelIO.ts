/**
 * LevelIO — History management, save/load, and default level factory
 * for the Doomlike map editor.
 *
 * Two layers:
 *   1. createEditorHistory() — snapshot-based undo/redo (pure factory)
 *   2. Module-level convenience bridge — pushUndo()/undo()/redo()
 *      for EditorCanvas and EditorPanel. Call initLevelIO() once at startup.
 */
import type { LevelData } from '../level/LevelTypes';

// ── History (snapshot-based undo/redo) ────────────────────────────────────────

export interface EditorHistory {
  push(snapshot: LevelData): void;
  undo(): LevelData | null;
  redo(): LevelData | null;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(snapshot?: LevelData): void;
}

const MAX_HISTORY = 50;

export function cloneLevel(level: LevelData): LevelData {
  return JSON.parse(JSON.stringify(level));
}

export function createEditorHistory(initialLevel: LevelData): EditorHistory {
  const undoStack: LevelData[] = [cloneLevel(initialLevel)];
  const redoStack: LevelData[] = [];
  return {
    push(s: LevelData) { undoStack.push(cloneLevel(s)); if (undoStack.length > MAX_HISTORY + 1) undoStack.shift(); redoStack.length = 0; },
    undo(): LevelData | null { if (undoStack.length <= 1) return null; redoStack.push(undoStack.pop()!); return cloneLevel(undoStack[undoStack.length - 1]); },
    redo(): LevelData | null { if (redoStack.length === 0) return null; const n = redoStack.pop()!; undoStack.push(cloneLevel(n)); return cloneLevel(n); },
    canUndo() { return undoStack.length > 1; },
    canRedo() { return redoStack.length > 0; },
    clear(s?: LevelData) { undoStack.length = 0; redoStack.length = 0; if (s) undoStack.push(cloneLevel(s)); },
  };
}

// ── Module-level convenience API ─────────────────────────────────────────────

let _history: EditorHistory | null = null;
let _levelRef: { level: LevelData } | null = null;
let _onChange: (() => void) | null = null;

/** Call ONCE at startup. Guarded — subsequent calls are no-ops. */
export function initLevelIO(levelRef: { level: LevelData }, onChange: () => void): void {
  if (_history) return;
  _levelRef = levelRef;
  _onChange = onChange;
  _history = createEditorHistory(levelRef.level);
}

/** Push current state as undo snapshot. Call BEFORE each mutation. */
export function pushUndo(): void {
  if (!_levelRef || !_history) return;
  _history.push(_levelRef.level);
}

/** Undo one step. Returns true if state changed. */
export function undo(): boolean {
  if (!_history || !_levelRef) return false;
  const restored = _history.undo();
  if (!restored) return false;
  Object.assign(_levelRef.level, restored);
  _onChange?.();
  return true;
}

/** Redo one step. Returns true if state changed. */
export function redo(): boolean {
  if (!_history || !_levelRef) return false;
  const restored = _history.redo();
  if (!restored) return false;
  Object.assign(_levelRef.level, restored);
  _onChange?.();
  return true;
}

/** Clear history (on new/open). */
export function resetHistory(): void {
  if (!_levelRef || !_history) return;
  _history.clear(_levelRef.level);
}

/** Replace editor state from loaded level. Resets history. */
export function applyLevel(data: LevelData): void {
  if (!_levelRef) return;
  resetHistory();
  Object.assign(_levelRef.level, data);
  _onChange?.();
}

// ── Save ──────────────────────────────────────────────────────────────────────

export function saveLevel(level: LevelData, filename?: string): void {
  const name = filename ?? `${level.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  const json = JSON.stringify(level, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.style.display = 'none';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Load ──────────────────────────────────────────────────────────────────────

export function loadLevelFromFile(file: File): Promise<LevelData | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!data || typeof data !== 'object' || typeof (data as any).name !== 'string' || !Array.isArray((data as any).sectors) || !(data as any).playerStart) {
          console.warn('[LevelIO] Invalid level data schema'); resolve(null); return;
        }
        resolve(data as LevelData);
      } catch { console.warn('[LevelIO] Failed to parse level JSON'); resolve(null); }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

export function loadLevelFile(): Promise<LevelData | null> {
  return new Promise((resolve) => {
    const input = document.getElementById('file-input') as HTMLInputElement;
    if (!input) { resolve(null); return; }
    const handler = () => { input.removeEventListener('change', handler); const file = input.files?.[0]; if (!file) { resolve(null); return; } loadLevelFromFile(file).then(resolve); input.value = ''; };
    input.addEventListener('change', handler);
    input.click();
  });
}

// ── Default level factory ────────────────────────────────────────────────────

export function createDefaultLevel(name = 'Untitled'): LevelData {
  const hw = 256;
  return {
    name, author: 'Editor', skyTexture: 'skies/default', musicTrack: '', ambientLight: 0.6,
    sectors: [{ id: 0, floorHeight: 0, ceilingHeight: 128, floorTexture: 'textures/floors/gray', ceilingTexture: 'textures/ceilings/white', lightLevel: 200, walls: [
      { start: { x: -hw, y: -hw }, end: { x:  hw, y: -hw }, texture: 'textures/walls/brick' },
      { start: { x:  hw, y: -hw }, end: { x:  hw, y:  hw }, texture: 'textures/walls/brick' },
      { start: { x:  hw, y:  hw }, end: { x: -hw, y:  hw }, texture: 'textures/walls/brick' },
      { start: { x: -hw, y:  hw }, end: { x: -hw, y: -hw }, texture: 'textures/walls/brick' },
    ] }],
    things: [],
    playerStart: { position: { x: 0, y: 0, z: 0 }, angle: 0 },
  };
}
