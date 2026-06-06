/**
 * editor.ts — Map editor entry point.
 *
 * Initialises all editor subsystems and wires up the toolbar.
 */
import type { LevelData } from '../level/LevelTypes';
import { initLevelIO, saveLevel, loadLevelFile, applyLevel, createDefaultLevel, undo, redo, pushUndo } from './LevelIO';
import { createEditorCanvas } from './EditorCanvas';
import { createEditorPanel } from './EditorPanel';
import { createAssetBrowser } from './AssetBrowser';

const levelData: { level: LevelData } = { level: createDefaultLevel('Untitled') };

// LevelIO must be first — guarded, subsequent calls are no-ops
initLevelIO(levelData, () => render());

// EditorPanel
const panel = createEditorPanel({
  onBeforePropertyChange: () => { pushUndo(); },
  onPropertyChanged: () => { render(); },
});

// EditorCanvas
const canvas = document.getElementById('editor-canvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Missing #editor-canvas');

const ec = createEditorCanvas(canvas, levelData, {
  onSelectSector(idx: number) { panel.showSelection({ kind: 'sector', sectorIndex: idx }); },
  onSelectWall(si: number, wi: number) { panel.showSelection({ kind: 'wall', sectorIndex: si, wallIndex: wi }); },
  onSelectThing(idx: number) { panel.showSelection({ kind: 'thing', thingIndex: idx }); },
  onDeselectAll() { panel.showSelection(null); },
  onChange() { panel.setLevel(levelData.level); },
});

function render() { ec.render(); }

// Asset browser
const ab = createAssetBrowser();
ab.onAssetSelected = (path: string, _cat: string) => {
  navigator.clipboard.writeText(path).catch(() => {});
  console.log(`[Editor] Texture copied: ${path}`);
};

panel.setLevel(levelData.level);

// ── Toolbar wiring ──────────────────────────────────────────────────────────

document.getElementById('btn-new')?.addEventListener('click', () => {
  if (!confirm('Create new level? Unsaved changes will be lost.')) return;
  levelData.level = createDefaultLevel();
  panel.setLevel(levelData.level);
  applyLevel(levelData.level);
  panel.showSelection(null);
  ec.render();
});

document.getElementById('btn-open')?.addEventListener('click', async () => {
  const data = await loadLevelFile();
  if (data) {
    levelData.level = data;
    panel.setLevel(data);
    applyLevel(data);
    panel.showSelection(null);
    ec.render();
  }
});

document.getElementById('btn-save')?.addEventListener('click', () => saveLevel(levelData.level));

document.getElementById('btn-undo')?.addEventListener('click', () => {
  if (undo()) { panel.setLevel(levelData.level); panel.showSelection(null); ec.render(); }
});

document.getElementById('btn-redo')?.addEventListener('click', () => {
  if (redo()) { panel.setLevel(levelData.level); panel.showSelection(null); ec.render(); }
});

const btnDraw = document.getElementById('btn-draw')!;
const btnSelect = document.getElementById('btn-select')!;

function activateTool(tool: 'draw' | 'select') {
  btnDraw.classList.toggle('active', tool === 'draw');
  btnSelect.classList.toggle('active', tool === 'select');
  ec.setTool(tool);
}

btnDraw.addEventListener('click', () => activateTool('draw'));
btnSelect.addEventListener('click', () => activateTool('select'));

document.getElementById('chk-snap')?.addEventListener('change', (e) => {
  ec.setSnap((e.target as HTMLInputElement).checked);
});

document.getElementById('grid-size')?.addEventListener('change', (e) => {
  ec.setGridSize(parseInt((e.target as HTMLSelectElement).value, 10) || 32);
});

// ── Keyboard shortcuts ──────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    if (e.shiftKey) document.getElementById('btn-redo')?.click();
    else document.getElementById('btn-undo')?.click();
  } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    document.getElementById('btn-save')?.click();
  } else if (e.key === 'd') { activateTool('draw'); }
  else if (e.key === 's' && !(e.ctrlKey || e.metaKey)) { activateTool('select'); }
  else if (e.key === 'Escape') { panel.showSelection(null); }
});
