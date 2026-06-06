/**
 * EditorCanvas — 2D top-down canvas view for the map editor.
 *
 * Supports:
 *   - Draw mode: click to place wall vertices, connect to form sectors
 *   - Select mode: click to pick sectors / walls
 *   - Grid overlay with snap-to-grid
 *   - Pan (middle-mouse drag) and zoom (scroll wheel)
 *   - Sector fill with floor-color preview
 *   - Thing display as labelled dots
 *   - Portal visualisation (dotted lines between connected sectors)
 *
 * The canvas uses a camera transform (pan + zoom) for world→screen mapping.
 */

import type { LevelData, Vec2 } from '../level/LevelTypes';
import { pushUndo } from './LevelIO';

// ── Selection type (shared with EditorPanel) ──────────────────────────────────

export type Selection =
  | { kind: 'sector'; sectorIndex: number }
  | { kind: 'wall'; sectorIndex: number; wallIndex: number }
  | { kind: 'thing'; thingIndex: number }
  | { kind: 'vertex' }
  | null;

// ── Drawing constants ─────────────────────────────────────────────────────────

const WALL_COLOR = '#aaa';
const GRID_COLOR = '#2a2a3e';
const GRID_MAJOR = '#3a3a4e';
const SECTOR_FILL = 'rgba(100,100,130,0.12)';
const VERTEX_RADIUS = 4;
const VERTEX_COLOR = '#e94560';
const THING_COLOR = '#4488ff';
const PORTAL_LINE = 'rgba(200,200,255,0.3)';
const DRAW_LINE_COLOR = '#ffcc00';
const PLAYER_START_COLOR = '#44ff44';

// ── Screen / world coordinate helpers ─────────────────────────────────────────

function screenToWorld(
  sx: number, sy: number,
  camX: number, camY: number, zoom: number,
  canvasW: number, canvasH: number
): { x: number; y: number } {
  return {
    x: (sx - canvasW / 2) / zoom + camX,
    y: (sy - canvasH / 2) / zoom + camY,
  };
}

/** Snap a value to the nearest grid increment. */
function snap(v: number, grid: number): number {
  return Math.round(v / grid) * grid;
}

// ── Point-in-polygon test (ray casting) ───────────────────────────────────────

function pointInPolygon(px: number, py: number, verts: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i].x, yi = verts[i].y;
    const xj = verts[j].x, yj = verts[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Distance from point (px,py) to line segment (x1,y1)-(x2,y2). */
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ── Hit testing ───────────────────────────────────────────────────────────────

type HitResult =
  | { kind: 'sector'; sectorIdx: number }
  | { kind: 'wall'; sectorIdx: number; wallIdx: number }
  | { kind: 'thing'; thingIdx: number }
  | null;

const HIT_THRESHOLD = 8; // pixels

/**
 * Find what the user clicked on, given world coordinates.
 * Checks things (small radius), then wall segments, then sector interiors.
 */
function hitTest(wx: number, wy: number, level: LevelData, zoom: number): HitResult {
  // Things (small dot, so we need to be close)
  for (let i = level.things.length - 1; i >= 0; i--) {
    const t = level.things[i];
    const dx = wx - t.position.x;
    const dy = wy - t.position.z;
    if (Math.hypot(dx, dy) < HIT_THRESHOLD / zoom + 20) {
      return { kind: 'thing', thingIdx: i };
    }
  }

  // Walls (closest segment)
  let bestDist = Infinity;
  let best: HitResult = null;

  for (let si = 0; si < level.sectors.length; si++) {
    const walls = level.sectors[si].walls;
    for (let wi = 0; wi < walls.length; wi++) {
      const w = walls[wi];
      const d = distToSegment(wx, wy, w.start.x, w.start.y, w.end.x, w.end.y);
      if (d < HIT_THRESHOLD / zoom && d < bestDist) {
        bestDist = d;
        best = { kind: 'wall', sectorIdx: si, wallIdx: wi };
      }
    }
  }

  if (best) return best;

  // Sector interiors (bottom-up so top in list takes priority)
  for (let si = level.sectors.length - 1; si >= 0; si--) {
    const walls = level.sectors[si].walls;
    const verts = walls.map((w) => ({ x: w.start.x, y: w.start.y }));
    if (pointInPolygon(wx, wy, verts)) {
      return { kind: 'sector', sectorIdx: si };
    }
  }

  return null;
}

// ── Editor state ───────────────────────────────────────────────────────────────

interface EditorCamera {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasState {
  /** Currently active tool mode. */
  tool: 'draw' | 'select';
  /** Grid snap setting. */
  snapEnabled: boolean;
  /** Grid cell size in world units. */
  gridSize: number;
}

// ── Module state ──────────────────────────────────────────────────────────────

let _canvas: HTMLCanvasElement | null = null;
let _ctx: CanvasRenderingContext2D | null = null;
let _level: LevelData | null = null;
let _cam: EditorCamera = { x: 0, y: 0, zoom: 1 };
let _state: CanvasState = { tool: 'draw', snapEnabled: true, gridSize: 32 };

/** Currently placed vertices in draw mode (world coords). */
let _drawVertices: Vec2[] = [];
let _drawPreview: { x: number; y: number } | null = null; // cursor pos

/** Panning state. */
let _panning = false;
let _panStart: { x: number; y: number; camX: number; camY: number } | null = null;

/** Callbacks. */
let _onSelectSector: ((idx: number) => void) | null = null;
let _onSelectWall: ((sectorIdx: number, wallIdx: number) => void) | null = null;
let _onSelectThing: ((idx: number) => void) | null = null;
let _onDeselectAll: (() => void) | null = null;
let _onChange: (() => void) | null = null;

// ── Public API ────────────────────────────────────────────────────────────────

export function initEditorCanvas(
  canvas: HTMLCanvasElement,
  levelRef: { level: LevelData },
  callbacks: {
    onSelectSector: (idx: number) => void;
    onSelectWall: (sectorIdx: number, wallIdx: number) => void;
    onSelectThing: (idx: number) => void;
    onDeselectAll: () => void;
    onChange: () => void;
  }
): void {
  _canvas = canvas;
  _level = levelRef.level;
  _ctx = canvas.getContext('2d')!;
  _onSelectSector = callbacks.onSelectSector;
  _onSelectWall = callbacks.onSelectWall;
  _onSelectThing = callbacks.onSelectThing;
  _onDeselectAll = callbacks.onDeselectAll;
  _onChange = callbacks.onChange;

  // Resize handler
  const resize = () => {
    const parent = canvas.parentElement!;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    render();
  };
  window.addEventListener('resize', resize);

  // Observe the panel for layout changes (after initial render)
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas.parentElement!);

  // Initial size
  resize();

  // ── Mouse events ──────────────────────────────────

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function setTool(tool: 'draw' | 'select'): void {
  _state.tool = tool;
  if (tool !== 'draw') {
    _drawVertices = [];
    _drawPreview = null;
  }
  _canvas && render();
}

export function setSnap(enabled: boolean): void {
  _state.snapEnabled = enabled;
}

export function setGridSize(size: number): void {
  _state.gridSize = Math.max(8, Math.min(256, size));
}

export function zoomToFit(): void {
  // Reset camera to a reasonable view
  _cam = { x: 0, y: 0, zoom: 2 };
  render();
}

export function render(): void {
  if (!_ctx || !_canvas || !_level) return;
  const ctx = _ctx;
  const w = _canvas.width;
  const h = _canvas.height;

  ctx.clearRect(0, 0, w, h);

  // ── Grid ─────────────────────────────────────────
  drawGrid(ctx, w, h);

  // ── Sectors ──────────────────────────────────────
  for (let si = 0; si < _level.sectors.length; si++) {
    drawSector(ctx, _level.sectors[si], si);
  }

  // ── Portals ──────────────────────────────────────
  for (const s of _level.sectors) {
    for (const wall of s.walls) {
      if (wall.portal) {
        const sx = worldToScreenX(wall.start.x, w, h);
        const sy = worldToScreenY(wall.start.y, w, h);
        const ex = worldToScreenX(wall.end.x, w, h);
        const ey = worldToScreenY(wall.end.y, w, h);
        ctx.strokeStyle = PORTAL_LINE;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // ── Things ───────────────────────────────────────
  for (let ti = 0; ti < _level.things.length; ti++) {
    drawThing(ctx, _level.things[ti], ti);
  }

  // ── Player start ─────────────────────────────────
  if (_level.playerStart) {
    const ps = _level.playerStart;
    const sx = worldToScreenX(ps.position.x, w, h);
    const sy = worldToScreenY(ps.position.z, w, h);
    ctx.fillStyle = PLAYER_START_COLOR;
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText('P', sx - 3, sy + 4);
  }

  // ── Draw mode vertices ───────────────────────────
  if (_state.tool === 'draw') {
    for (const v of _drawVertices) {
      const sx = worldToScreenX(v.x, w, h);
      const sy = worldToScreenY(v.y, w, h);
      ctx.fillStyle = VERTEX_COLOR;
      ctx.beginPath();
      ctx.arc(sx, sy, VERTEX_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    // Preview line from last vertex to cursor
    if (_drawVertices.length > 0 && _drawPreview) {
      const last = _drawVertices[_drawVertices.length - 1];
      const sx = worldToScreenX(last.x, w, h);
      const sy = worldToScreenY(last.y, w, h);
      const ex = worldToScreenX(_drawPreview.x, w, h);
      const ey = worldToScreenY(_drawPreview.y, w, h);
      ctx.strokeStyle = DRAW_LINE_COLOR;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Close-preview: connecting first and last vertex?
    if (_drawVertices.length >= 3 && _drawPreview) {
      const first = _drawVertices[0];
      const last = _drawVertices[_drawVertices.length - 1];
      const fx = worldToScreenX(first.x, w, h);
      const fy = worldToScreenY(first.y, w, h);
      const lx = worldToScreenX(last.x, w, h);
      const ly = worldToScreenY(last.y, w, h);
      // If cursor is near the first vertex, show the closing line
      if (_drawPreview && Math.hypot(_drawPreview.x - first.x, _drawPreview.y - first.y) < _state.gridSize * 1.5) {
        ctx.strokeStyle = '#44ff44';
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(fx, fy);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function worldToScreenX(worldX: number, cw: number, _ch: number): number {
  return (worldX - _cam.x) * _cam.zoom + cw / 2;
}

function worldToScreenY(worldY: number, _cw: number, ch: number): number {
  return (worldY - _cam.y) * _cam.zoom + ch / 2;
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const grid = _state.gridSize;

  // Calculate visible range
  const camLeft = _cam.x - w / 2 / _cam.zoom;
  const camTop = _cam.y - h / 2 / _cam.zoom;
  const camRight = camLeft + w / _cam.zoom;
  const camBottom = camTop + h / _cam.zoom;

  // Major grid every 4 cells
  const major = grid * 4;

  for (let x = Math.floor(camLeft / grid) * grid; x <= camRight; x += grid) {
    const sx = worldToScreenX(x, w, h);
    const isMajor = Math.abs(x % major) < 0.001;
    ctx.strokeStyle = isMajor ? GRID_MAJOR : GRID_COLOR;
    ctx.lineWidth = isMajor ? 1 : 0.5;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, h);
    ctx.stroke();
  }

  for (let y = Math.floor(camTop / grid) * grid; y <= camBottom; y += grid) {
    const sy = worldToScreenY(y, w, h);
    const isMajor = Math.abs(y % major) < 0.001;
    ctx.strokeStyle = isMajor ? GRID_MAJOR : GRID_COLOR;
    ctx.lineWidth = isMajor ? 1 : 0.5;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(w, sy);
    ctx.stroke();
  }
}

function drawSector(ctx: CanvasRenderingContext2D, sector: any, _sectorIdx: number): void {
  const walls = sector.walls;
  if (walls.length < 3) return;

  const w = _canvas!.width;
  const h = _canvas!.height;

  // Build screen-space polygon
  const verts = walls.map((wall: any) => ({
    sx: worldToScreenX(wall.start.x, w, h),
    sy: worldToScreenY(wall.start.y, w, h),
  }));

  // Fill polygon
  ctx.fillStyle = SECTOR_FILL;
  ctx.beginPath();
  ctx.moveTo(verts[0].sx, verts[0].sy);
  for (let i = 1; i < verts.length; i++) {
    ctx.lineTo(verts[i].sx, verts[i].sy);
  }
  ctx.closePath();
  ctx.fill();

  // Outline walls
  for (let wi = 0; wi < walls.length; wi++) {
    const wall = walls[wi];
    const sx = worldToScreenX(wall.start.x, w, h);
    const sy = worldToScreenY(wall.start.y, w, h);
    const ex = worldToScreenX(wall.end.x, w, h);
    const ey = worldToScreenY(wall.end.y, w, h);

    ctx.strokeStyle = WALL_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }
}

function drawThing(ctx: CanvasRenderingContext2D, thing: any, _thingIdx: number): void {
  const w = _canvas!.width;
  const h = _canvas!.height;
  const sx = worldToScreenX(thing.position.x, w, h);
  const sy = worldToScreenY(thing.position.z, w, h);

  // Draw a small diamond shape
  ctx.fillStyle = THING_COLOR;
  ctx.beginPath();
  ctx.moveTo(sx, sy - 5);
  ctx.lineTo(sx + 5, sy);
  ctx.lineTo(sx, sy + 5);
  ctx.lineTo(sx - 5, sy);
  ctx.closePath();
  ctx.fill();

  // Short label
  const label = thing.type.replace(/^(enemy_|weapon_|key_|ammo_|armor_)/, '').substring(0, 6);
  ctx.fillStyle = '#aaa';
  ctx.font = '9px monospace';
  ctx.fillText(label, sx + 7, sy + 3);
}

// ── Mouse event handlers ──────────────────────────────────────────────────────

function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
  const rect = _canvas!.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function onMouseDown(e: MouseEvent): void {
  if (!_canvas || !_level) return;

  const { x, y } = getCanvasCoords(e);
  const world = screenToWorld(x, y, _cam.x, _cam.y, _cam.zoom, _canvas.width, _canvas.height);

  // Middle mouse pan
  if (e.button === 1) {
    e.preventDefault();
    _panning = true;
    _panStart = { x: e.clientX, y: e.clientY, camX: _cam.x, camY: _cam.y };
    _canvas.style.cursor = 'grabbing';
    return;
  }

  // Right-click: cancel draw
  if (e.button === 2) {
    if (_state.tool === 'draw' && _drawVertices.length > 0) {
      _drawVertices = [];
      _drawPreview = null;
      render();
    }
    return;
  }

  if (e.button !== 0) return; // left button only

  if (_state.tool === 'draw') {
    handleDrawClick(world.x, world.y);
  } else {
    handleSelectClick(world.x, world.y);
  }
}

function onMouseMove(e: MouseEvent): void {
  if (!_canvas || !_level) return;

  // Panning
  if (_panning && _panStart) {
    const dx = (e.clientX - _panStart.x) / _cam.zoom;
    const dy = (e.clientY - _panStart.y) / _cam.zoom;
    _cam.x = _panStart.camX - dx;
    _cam.y = _panStart.camY - dy;
    render();
    return;
  }

  const { x, y } = getCanvasCoords(e);
  const world = screenToWorld(x, y, _cam.x, _cam.y, _cam.zoom, _canvas.width, _canvas.height);

  // Update draw preview
  if (_state.tool === 'draw') {
    _drawPreview = _state.snapEnabled
      ? { x: snap(world.x, _state.gridSize), y: snap(world.y, _state.gridSize) }
      : { x: world.x, y: world.y };
    render();
    return;
  }

  // Select mode: cursor feedback
  if (_state.tool === 'select') {
    const hit = hitTest(world.x, world.y, _level, _cam.zoom);
    _canvas.style.cursor = hit ? 'pointer' : 'crosshair';
  }
}

function onMouseUp(e: MouseEvent): void {
  if (e.button === 1 && _panning) {
    _panning = false;
    _panStart = null;
    if (_canvas) _canvas.style.cursor = 'crosshair';
  }
}

function onWheel(e: WheelEvent): void {
  e.preventDefault();
  const { x, y } = getCanvasCoords(e);

  // Zoom towards the mouse cursor position
  const worldBefore = screenToWorld(x, y, _cam.x, _cam.y, _cam.zoom, _canvas!.width, _canvas!.height);

  const delta = -e.deltaY * 0.001;
  _cam.zoom = Math.max(0.1, Math.min(20, _cam.zoom * (1 + delta)));

  const worldAfter = screenToWorld(x, y, _cam.x, _cam.y, _cam.zoom, _canvas!.width, _canvas!.height);
  _cam.x += worldBefore.x - worldAfter.x;
  _cam.y += worldBefore.y - worldAfter.y;

  render();
}

// ── Draw mode logic ───────────────────────────────────────────────────────────

function handleDrawClick(wx: number, wy: number): void {
  if (!_level) return;

  let px = wx, py = wy;
  if (_state.snapEnabled) {
    px = snap(wx, _state.gridSize);
    py = snap(wy, _state.gridSize);
  }

  // Check if clicking near the first vertex to close the sector
  if (_drawVertices.length >= 3) {
    const first = _drawVertices[0];
    if (Math.hypot(px - first.x, py - first.y) < _state.gridSize * 1.5) {
      // Close the sector
      finishSector();
      return;
    }
  }

  // Don't place duplicate points
  if (_drawVertices.length > 0) {
    const last = _drawVertices[_drawVertices.length - 1];
    if (Math.abs(px - last.x) < 0.001 && Math.abs(py - last.y) < 0.001) return;
  }

  _drawVertices.push({ x: px, y: py });
  render();

  // Auto-complete if this makes 3 vertices? No, wait for explicit close.
}

function finishSector(): void {
  if (_drawVertices.length < 3 || !_level) return;

  pushUndo();

  const walls = [];
  for (let i = 0; i < _drawVertices.length; i++) {
    const next = (i + 1) % _drawVertices.length;
    walls.push({
      start: { x: _drawVertices[i].x, y: _drawVertices[i].y },
      end: { x: _drawVertices[next].x, y: _drawVertices[next].y },
      texture: 'textures/walls/brick',
    });
  }

  // Find the next available sector ID
  const maxId = _level.sectors.reduce((m, s) => Math.max(m, s.id), -1);

  _level.sectors.push({
    id: maxId + 1,
    floorHeight: 0,
    ceilingHeight: 128,
    floorTexture: 'textures/floors/gray',
    ceilingTexture: 'textures/ceilings/white',
    lightLevel: 200,
    walls,
  });

  _drawVertices = [];
  _drawPreview = null;
  _onChange?.();
  render();
}

// ── Select mode logic ─────────────────────────────────────────────────────────

function handleSelectClick(wx: number, wy: number): void {
  if (!_level) return;
  const hit = hitTest(wx, wy, _level, _cam.zoom);

  if (hit?.kind === 'sector') {
    _onSelectSector?.(hit.sectorIdx);
  } else if (hit?.kind === 'wall') {
    _onSelectWall?.(hit.sectorIdx, hit.wallIdx);
  } else if (hit?.kind === 'thing') {
    _onSelectThing?.(hit.thingIdx);
  } else {
    _onDeselectAll?.();
  }
}
