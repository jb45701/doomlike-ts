/**
 * editor.ts — Map editor entry point.
 *
 * Initialises all editor subsystems and wires up the toolbar.
 * Provides the shared LevelData reference that all modules mutate.
 */
import type { LevelData } from '../level/LevelTypes';
import { initLevelIO, saveLevel, loadLevelFile, applyLevel, createDefaultLevel, undo, redo } from './LevelIO';
import { initEditorCanvas, setTool, setSnap, setGridSize, render } from './EditorCanvas';
import { createEditorPanel } from './EditorPanel';
import { createAssetBrowser } from './AssetBrowser';

// ── Shared level data (mutable ref object) ───────────────────────────────────

const levelData: { level: LevelData } = {
  level: createDefaultLevel('Untitled'),
};

// ── Initialise subsystems ────────────────────────────────────────────────────

// LevelIO must be first — other modules depend on pushUndo()
initLevelIO(levelData, () => {});

// EditorPanel — properties sidebar with text inputs bound to selection
const panel = createEditorPanel({
  onPropertyChanged: () => {
    initLevelIO(levelData, () => {}); // re-attach to latest level ref
    pushHistoryAndRender();
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

// Asset browser — texture picker (just sets onAssetSelected callback)
const assetBrowser = createAssetBrowser();
assetBrowser.onAssetSelected = (path: string, _category: string) => {
  navigator.clipboard.writeText(path).catch(() => {});
  console.log(`[Editor] Texture copied: ${path}`);
};

// Set initial level in panel
panel.setLevel(levelData.level);

// ── Push history snapshot + render ───────────────────────────────────────────

function pushHistoryAndRender(): void {
  initLevelIO(levelData, () => {});
  render();
}

// ── Toolbar wiring ──────────────────────────────────────────────────────────

document.getElementById('btn-new')?.addEventListener('click', () => {
  if (!confirm('Create new level? Unsaved changes will be lost.')) return;
  levelData.level = createDefaultLevel();
  initLevelIO(levelData, () => {});
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
    initLevelIO(levelData, () => {});
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
    initLevelIO(levelData, () => {});
    panel.setLevel(levelData.level);
    panel.showSelection(null);
    render();
  }
});

document.getElementById('btn-redo')?.addEventListener('click', () => {
  if (redo()) {
    initLevelIO(levelData, () => {});
    panel.setLevel(levelData.level);
    panel.showSelection(null);
    render();
  }
});

// Tool buttons
const btnDraw = document.getElementById('tool-draw')!;
const btnSelect = document.getElementById('tool-select')!;

function activateTool(tool: 'draw' | 'select'): void {
  btnDraw.classList.toggle('active', tool === 'draw');
  btnSelect.classList.toggle('active', tool === 'select');
  setTool(tool);
}

btnDraw.addEventListener('click', () => activateTool('draw'));
btnSelect.addEventListener('click', () => activateTool('select'));

// Grid snap toggle
document.getElementById('chk-snap')?.addEventListener('change', (e) => {
  setSnap((e.target as HTMLInputElement).checked);
});

// Snap (grid) size
document.getElementById('grid-size')?.addEventListener('change', (e) => {
  setGridSize(parseInt((e.target as HTMLSelectElement).value, 10) || 32);
});

// ── Keyboard shortcuts ──────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      document.getElementById('btn-redo')?.click();
    } else {
      document.getElementById('btn-undo')?.click();
    }
  } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    document.getElementById('btn-save')?.click();
  } else if (e.key === 'd') {
    activateTool('draw');
  } else if (e.key === 's' && !(e.ctrlKey || e.metaKey)) {
    activateTool('select');
  } else if (e.key === 'Escape') {
    panel.showSelection(null);
  }
});

// ── Title ───────────────────────────────────────────────────────────────────

function updateTitle(): void {
  const brand = document.querySelector('.brand');
  if (brand) brand.textContent = `MAP EDITOR — ${levelData.level.name || 'Untitled'}`;
}
updateTitle();
