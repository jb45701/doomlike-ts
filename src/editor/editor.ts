/**
 * editor.ts — Map editor entry point.
 *
 * Initialises all editor subsystems and wires up the toolbar.
 * Provides the shared LevelData reference that all modules mutate.
 */
import type { LevelData } from '../level/LevelTypes';
import { initLevelIO, saveLevel, loadLevelFile, applyLevel, createDefaultLevel, undo, redo } from './LevelIO';
import { initEditorCanvas } from './EditorCanvas';
import { createEditorPanel } from './EditorPanel';
import { createAssetBrowser } from './AssetBrowser';

// ── Shared level data (mutable ref object) ───────────────────────────────────

const levelData: { level: LevelData } = {
  level: createDefaultLevel('Untitled'),
};

// ── Initialise subsystems ────────────────────────────────────────────────────

// LevelIO must be first — other modules depend on pushUndo()
initLevelIO(levelData, () => render());

// EditorPanel — properties sidebar with text inputs bound to selection
const panel = createEditorPanel({
  onPropertyChanged: () => {
    // Property changed → push undo snapshot + re-render canvas
    initLevelIO(levelData, () => render()); // re-attach to latest level ref
    render();
  },
});

// EditorCanvas — 2D canvas view
const canvas = document.getElementById('editor-canvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Missing #editor-canvas');

initEditorCanvas(canvas, levelData, {
  onSelectSector(idx: number) {
    panel.showSelection({ kind: 'sector', sectorIndex: idx });
  },
  onSelectWall(sectorIdx: number, wallIdx: number) {
    panel.showSelection({ kind: 'wall', sectorIndex: sectorIdx, wallIndex: wallIdx });
  },
  onSelectThing(idx: number) {
    panel.showSelection({ kind: 'thing', thingIndex: idx });
  },
  onDeselectAll() {
    panel.showSelection(null);
  },
  onChange() {
    panel.setLevel(levelData.level);
  },
});

// Asset browser — texture picker
const assetBrowser = createAssetBrowser();
assetBrowser.onAssetSelected = (path: string, _category: string) => {
  navigator.clipboard.writeText(path).catch(() => {});
  console.log(`[Editor] Texture picked: ${path} (copied to clipboard)`);
};

// Set initial level in panel
panel.setLevel(levelData.level);

// ── Render helper ────────────────────────────────────────────────────────────

function render(): void {
  // Trigger canvas redraw (EditorCanvas.render is called from within its own
  // tick on each external event; this forces an update after undo/load/etc.)
  // We import and re-call initEditorCanvas's render indirectly via onChange
  // callback. For direct calls we dispatch a custom event.
  window.dispatchEvent(new CustomEvent('editor:render'));
}

// ── Toolbar wiring ──────────────────────────────────────────────────────────

document.getElementById('btn-new')?.addEventListener('click', () => {
  if (!confirm('Create new level? Unsaved changes will be lost.')) return;
  levelData.level = createDefaultLevel();
  panel.setLevel(levelData.level);
  applyLevel(levelData.level);
  updateTitle();
  panel.showSelection(null);
  render();
});

document.getElementById('btn-open')?.addEventListener('click', async () => {
  const data = await loadLevelFile();
  if (data) {
    levelData.level = data;
    panel.setLevel(data);
    applyLevel(data);
    updateTitle();
    panel.showSelection(null);
    render();
  }
});

document.getElementById('btn-save')?.addEventListener('click', () => {
  saveLevel(levelData.level);
});

document.getElementById('btn-undo')?.addEventListener('click', () => {
  if (undo()) {
    panel.setLevel(levelData.level);
    panel.showSelection(null);
    render();
  }
});

document.getElementById('btn-redo')?.addEventListener('click', () => {
  if (redo()) {
    panel.setLevel(levelData.level);
    panel.showSelection(null);
    render();
  }
});

// Tool buttons
const btnDraw = document.getElementById('btn-draw')!;
const btnSelect = document.getElementById('btn-select')!;

function setTool(tool: 'draw' | 'select'): void {
  btnDraw.classList.toggle('active', tool === 'draw');
  btnSelect.classList.toggle('active', tool === 'select');
  // Set tool via custom event — EditorCanvas listens for mode changes
  window.dispatchEvent(new CustomEvent('editor:set-tool', { detail: { tool } }));
}

btnDraw.addEventListener('click', () => setTool('draw'));
btnSelect.addEventListener('click', () => setTool('select'));

// Grid snap toggle
document.getElementById('chk-snap')?.addEventListener('change', (e) => {
  window.dispatchEvent(new CustomEvent('editor:set-snap', {
    detail: { enabled: (e.target as HTMLInputElement).checked },
  }));
});

// Grid size
document.getElementById('grid-size')?.addEventListener('change', (e) => {
  window.dispatchEvent(new CustomEvent('editor:set-grid-size', {
    detail: { size: parseInt((e.target as HTMLInputElement).value, 10) || 32 },
  }));
});

// ── Keyboard shortcuts ──────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    if (e.shiftKey) {
      // Ctrl+Shift+Z = redo
      e.preventDefault();
      document.getElementById('btn-redo')?.click();
    } else {
      // Ctrl+Z = undo
      e.preventDefault();
      document.getElementById('btn-undo')?.click();
    }
  } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    document.getElementById('btn-save')?.click();
  }
});

// ── Title ───────────────────────────────────────────────────────────────────

function updateTitle(): void {
  const el = document.getElementById('level-name');
  if (el) el.textContent = levelData.level.name || 'Untitled';
}
updateTitle();
