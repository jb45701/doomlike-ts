import type { LevelData, Sector, Thing, Vec2 } from '../level/LevelTypes';
import type { EditorCamera } from './EditorCamera';
import { worldToScreenX, worldToScreenY } from './EditorCamera';

export const WALL_COLOR = '#aaa';
export const VERTEX_RADIUS = 4;
export const VERTEX_COLOR = '#e94560';
export const DRAW_LINE_COLOR = '#ffcc00';

export interface DrawContext {
  ctx: CanvasRenderingContext2D; w: number; h: number; cam: EditorCamera;
  level: LevelData; tool: 'draw' | 'select'; drawVertices: Vec2[];
  drawPreview: { x: number; y: number } | null; gridSize: number;
}

export function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, cam: EditorCamera, grid: number): void {
  const cl = cam.x - w/2/cam.zoom, ct = cam.y - h/2/cam.zoom, cr = cl + w/cam.zoom, cb = ct + h/cam.zoom, maj = grid * 4;
  for (let x = Math.floor(cl/grid)*grid; x <= cr; x += grid) { const sx = worldToScreenX(x,cam,w); const im = Math.abs(x%maj)<0.001; ctx.strokeStyle=im?'#3a3a4e':'#2a2a3e'; ctx.lineWidth=im?1:0.5; ctx.beginPath(); ctx.moveTo(sx,0); ctx.lineTo(sx,h); ctx.stroke(); }
  for (let y = Math.floor(ct/grid)*grid; y <= cb; y += grid) { const sy = worldToScreenY(y,cam,h); const im = Math.abs(y%maj)<0.001; ctx.strokeStyle=im?'#3a3a4e':'#2a2a3e'; ctx.lineWidth=im?1:0.5; ctx.beginPath(); ctx.moveTo(0,sy); ctx.lineTo(w,sy); ctx.stroke(); }
}

export function drawSector(ctx: CanvasRenderingContext2D, sector: Sector, cam: EditorCamera, cw: number, ch: number): void {
  if (sector.walls.length < 3) return;
  const verts = sector.walls.map(w => ({ sx: worldToScreenX(w.start.x,cam,cw), sy: worldToScreenY(w.start.y,cam,ch) }));
  ctx.fillStyle = 'rgba(100,100,130,0.12)'; ctx.beginPath(); ctx.moveTo(verts[0].sx,verts[0].sy);
  for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].sx,verts[i].sy); ctx.closePath(); ctx.fill();
  for (const w of sector.walls) { ctx.strokeStyle = WALL_COLOR; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(worldToScreenX(w.start.x,cam,cw),worldToScreenY(w.start.y,cam,ch)); ctx.lineTo(worldToScreenX(w.end.x,cam,cw),worldToScreenY(w.end.y,cam,ch)); ctx.stroke(); }
}

export function drawPortalLine(ctx: CanvasRenderingContext2D, sx: number, sy: number, ex: number, ey: number): void {
  ctx.strokeStyle = 'rgba(200,200,255,0.3)'; ctx.lineWidth = 2; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(ex,ey); ctx.stroke(); ctx.setLineDash([]);
}

export function drawThing(ctx: CanvasRenderingContext2D, thing: Thing, cam: EditorCamera, cw: number, ch: number): void {
  const sx = worldToScreenX(thing.position.x,cam,cw), sy = worldToScreenY(thing.position.z,cam,ch);
  ctx.fillStyle = '#4488ff'; ctx.beginPath(); ctx.moveTo(sx,sy-5); ctx.lineTo(sx+5,sy); ctx.lineTo(sx,sy+5); ctx.lineTo(sx-5,sy); ctx.closePath(); ctx.fill();
  const l = thing.type.replace(/^(enemy_|weapon_|key_|ammo_|armor_)/,'').substring(0,6); ctx.fillStyle='#aaa'; ctx.font='9px monospace'; ctx.fillText(l,sx+7,sy+3);
}

export function drawPlayerStart(ctx: CanvasRenderingContext2D, wx: number, wz: number, cam: EditorCamera, cw: number, ch: number): void {
  const sx = worldToScreenX(wx,cam,cw), sy = worldToScreenY(wz,cam,ch); ctx.fillStyle='#44ff44'; ctx.beginPath(); ctx.arc(sx,sy,6,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='10px monospace'; ctx.fillText('P',sx-3,sy+4);
}

export function drawDrawOverlay(ctx: CanvasRenderingContext2D, verts: Vec2[], preview: { x: number; y: number } | null, cam: EditorCamera, cw: number, ch: number, gridSize: number): void {
  for (const v of verts) { const sx=worldToScreenX(v.x,cam,cw), sy=worldToScreenY(v.y,cam,ch); ctx.fillStyle='#e94560'; ctx.beginPath(); ctx.arc(sx,sy,4,0,Math.PI*2); ctx.fill(); }
  if (verts.length===0||!preview) return;
  const last=verts[verts.length-1],lsx=worldToScreenX(last.x,cam,cw),lsy=worldToScreenY(last.y,cam,ch),psx=worldToScreenX(preview.x,cam,cw),psy=worldToScreenY(preview.y,cam,ch);
  ctx.strokeStyle='#ffcc00'; ctx.lineWidth=1; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(lsx,lsy); ctx.lineTo(psx,psy); ctx.stroke(); ctx.setLineDash([]);
  if (verts.length>=3) { const first=verts[0]; if (Math.hypot(preview.x-first.x,preview.y-first.y)<gridSize*1.5) { const fsx=worldToScreenX(first.x,cam,cw),fsy=worldToScreenY(first.y,cam,ch); ctx.strokeStyle='#44ff44'; ctx.lineWidth=2; ctx.setLineDash([2,4]); ctx.beginPath(); ctx.moveTo(lsx,lsy); ctx.lineTo(fsx,fsy); ctx.stroke(); ctx.setLineDash([]); } }
}

export function renderEditor(dc: DrawContext): void {
  const {ctx,w,h,cam,level,tool,drawVertices,drawPreview,gridSize}=dc; ctx.clearRect(0,0,w,h);
  drawGrid(ctx,w,h,cam,gridSize);
  for (const s of level.sectors) drawSector(ctx,s,cam,w,h);
  for (const s of level.sectors) for (const wall of s.walls) { if (wall.portal) drawPortalLine(ctx, worldToScreenX(wall.start.x,cam,w), worldToScreenY(wall.start.y,cam,h), worldToScreenX(wall.end.x,cam,w), worldToScreenY(wall.end.y,cam,h)); }
  for (let i=0;i<level.things.length;i++) drawThing(ctx,level.things[i],cam,w,h);
  if (level.playerStart) drawPlayerStart(ctx,level.playerStart.position.x,level.playerStart.position.z,cam,w,h);
  if (tool==='draw') drawDrawOverlay(ctx,drawVertices,drawPreview,cam,w,h,gridSize);
}
