/**
 * LevelIO — Save/load JSON and undo/redo for the Doomlike map editor.
 *
 * Uses a snapshot-based history: every mutation pushed to the history stores
 * a deep copy of the full LevelData. Simple and correct for editor-sized levels
 * (typically < 100 sectors, snapshot < 50 KB).
 *
 * Lifecycle:
 *   const history = createEditorHistory(initialLevel);
 *   // After each mutation:
 *   history.push(clonedLevel);
 *   // On undo/redo:
 *   const restored = history.undo() ?? history.redo();
 *
 * Save:
 *   saveLevel(level, filename) — triggers browser download
 *
 * Load:
 *   const level = await loadLevelFromFile(file) — reads File → parsed LevelData
 */
import type { LevelData } from '../level/LevelTypes';

// ── History (snapshot-based undo/redo) ───────────────────────────────────────

export interface EditorHistory {
  /** Push a new snapshot onto the stack (called after every mutation). */
  push(snapshot: LevelData): void;
  /** Undo one step. Returns the restored snapshot, or null if nothing to undo. */
  undo(): LevelData | null;
  /** Redo one step. Returns the restored snapshot, or null if nothing to redo. */
  redo(): LevelData | null;
  /** Whether undo is available. */
  canUndo: () => boolean;
  /** Whether redo is available. */
  canRedo: () => boolean;
  /** Clear history (called on new level or open). */
  clear(snapshot?: LevelData): void;
  /** Current depth. */
  depth: () => { undo: number; redo: number };
}

/** Maximum number of undo steps to keep (memory guard). */
const MAX_HISTORY = 50;

/** Deep-clone a LevelData object (JSON roundtrip — safe for our plain data). */
export function cloneLevel(level: LevelData): LevelData {
  return JSON.parse(JSON.stringify(level));
}

export function createEditorHistory(initialLevel: LevelData): EditorHistory {
  const undoStack: LevelData[] = [cloneLevel(initialLevel)];
  const redoStack: LevelData[] = [];

  return {
    push(snapshot: LevelData) {
      undoStack.push(cloneLevel(snapshot));
      if (undoStack.length > MAX_HISTORY + 1) {
        undoStack.shift();
      }
      redoStack.length = 0;
    },

    undo(): LevelData | null {
      if (undoStack.length <= 1) return null;
      const current = undoStack.pop()!;
      redoStack.push(current);
      return cloneLevel(undoStack[undoStack.length - 1]);
    },

    redo(): LevelData | null {
      if (redoStack.length === 0) return null;
      const next = redoStack.pop()!;
      undoStack.push(cloneLevel(next));
      return cloneLevel(next);
    },

    canUndo() { return undoStack.length > 1; },
    canRedo() { return redoStack.length > 0; },

    clear(snapshot?: LevelData) {
      undoStack.length = 0;
      redoStack.length = 0;
      if (snapshot) undoStack.push(cloneLevel(snapshot));
    },

    depth() { return { undo: undoStack.length - 1, redo: redoStack.length }; },
  };
}

// ── Module-level convenience API ──────────────────────────────────────────────
// EditorPanel and EditorCanvas use a module-level pattern. This wrapper
// bridges the factory pattern to the simple pushUndo()/undo()/redo() calls.

let _history: EditorHistory | null = null;
let _levelRef: { level: LevelData } | null = null;
let _onChange: (() => void) | null = null;

/**
 * Initialise the module-level helpers with a reference to the editor's
 * mutable LevelData object. Must be called once from editor.ts.
 */
export function initLevelIO(levelRef: { level: LevelData }, onChange: () => void): void {
  _levelRef = levelRef;
  _onChange = onChange;
  _history = createEditorHistory(levelRef.level);
}

/** Push the current state as an undo snapshot. Call BEFORE each mutation. */
export function pushUndo(): void {
  if (!_levelRef || !_history) return;
  _history.push(_levelRef.level);
}

/** Undo: restores previous state and triggers re-render. */
export function undo(): boolean {
  if (!_history || !_levelRef) return false;
  const restored = _history.undo();
  if (!restored) return false;
  Object.assign(_levelRef.level, restored);
  _onChange?.();
  return true;
}

/** Redo: restores next state and triggers re-render. */
export function redo(): boolean {
  if (!_history || !_levelRef) return false;
  const restored = _history.redo();
  if (!restored) return false;
  Object.assign(_levelRef.level, restored);
  _onChange?.();
  return true;
}

/** Reset history (on new level / open). */
export function resetHistory(): void {
  if (!_levelRef || !_history) return;
  _history.clear(_levelRef.level);
}

// ── Save ─────────────────────────────────────────────────────────────────────

/**
 * Serialize a level to JSON and trigger a browser download.
 * Uses native Blob + object URL to avoid any library dependency.
 */
export function saveLevel(level: LevelData, filename?: string): void {
  const name = filename ?? `${level.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  const json = JSON.stringify(level, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ── Load ─────────────────────────────────────────────────────────────────────

/**
 * Read a File (from a file input or drag-drop) and parse it as LevelData JSON.
 * Returns null if the file is invalid.
 */
export function loadLevelFromFile(file: File): Promise<LevelData | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!isValidLevelData(data)) {
          console.warn('[LevelIO] Invalid level data schema');
          resolve(null);
          return;
        }
        resolve(data as LevelData);
      } catch {
        console.warn('[LevelIO] Failed to parse level JSON');
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

/** Open file picker and load a .json level file. */
export function loadLevelFile(): Promise<LevelData | null> {
  return new Promise((resolve) => {
    const input = document.getElementById('file-input') as HTMLInputElement;
    if (!input) { resolve(null); return; }
    const handler = () => {
      input.removeEventListener('change', handler);
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      loadLevelFromFile(file).then(resolve);
      input.value = '';
    };
    input.addEventListener('change', handler);
    input.click();
  });
}

/**
 * Replace the editor state with a loaded LevelData.
 * Resets history and pushes the new state as the initial snapshot.
 */
export function applyLevel(data: LevelData): void {
  if (!_levelRef) return;
  resetHistory();
  Object.assign(_levelRef.level, data);
  _onChange?.();
}

// ── Default level factory ─────────────────────────────────────────────────────

/** Create the default starting level (one 512×512 room). */
export function createDefaultLevel(name = 'Untitled'): LevelData {
  const hw = 256;
  return {
    name,
    author: 'Editor',
    skyTexture: 'skies/default',
    musicTrack: '',
    ambientLight: 0.6,
    sectors: [
      {
        id: 0,
        floorHeight: 0,
        ceilingHeight: 128,
        floorTexture: 'textures/floors/gray',
        ceilingTexture: 'textures/ceilings/white',
        lightLevel: 200,
        walls: [
          { start: { x: -hw, y: -hw }, end: { x:  hw, y: -hw }, texture: 'textures/walls/brick' },
          { start: { x:  hw, y: -hw }, end: { x:  hw, y:  hw }, texture: 'textures/walls/brick' },
          { start: { x:  hw, y:  hw }, end: { x: -hw, y:  hw }, texture: 'textures/walls/brick' },
          { start: { x: -hw, y:  hw }, end: { x: -hw, y: -hw }, texture: 'textures/walls/brick' },
        ],
      },
    ],
    things: [],
    playerStart: { position: { x: 0, y: 0, z: 0 }, angle: 0 },
  };
}

// ── Schema validation (basic sanity checks) ──────────────────────────────────

function isValidLevelData(data: unknown): data is LevelData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d.name !== 'string') return false;
  if (!Array.isArray(d.sectors)) return false;
  if (!d.playerStart || typeof d.playerStart !== 'object') return false;
  return true;
}
