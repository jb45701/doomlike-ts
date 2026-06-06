/**
 * EditorCamera — Camera transform helpers for the 2D canvas editor.
 */
export interface EditorCamera { x: number; y: number; zoom: number; }
export function screenToWorld(sx: number, sy: number, cam: EditorCamera, cw: number, ch: number): { x: number; y: number } {
  return { x: (sx - cw / 2) / cam.zoom + cam.x, y: (sy - ch / 2) / cam.zoom + cam.y }; }
export function worldToScreenX(wx: number, cam: EditorCamera, cw: number): number { return (wx - cam.x) * cam.zoom + cw / 2; }
export function worldToScreenY(wy: number, cam: EditorCamera, ch: number): number { return (wy - cam.y) * cam.zoom + ch / 2; }
export function snap(v: number, grid: number): number { return Math.round(v / grid) * grid; }
export function panStart(cam: EditorCamera, e: { clientX: number; clientY: number }): { x: number; y: number; camX: number; camY: number } {
  return { x: e.clientX, y: e.clientY, camX: cam.x, camY: cam.y }; }
export function panMove(
  _start: { x: number; y: number; camX: number; camY: number },
  e: { clientX: number; clientY: number },
  zoom: number
): { camX: number; camY: number } {
  return { camX: _start.camX - (e.clientX - _start.x) / zoom, camY: _start.camY - (e.clientY - _start.y) / zoom }; }
export function zoomAtCursor(
  cam: EditorCamera,
  cursor: { x: number; y: number },
  canvasW: number, canvasH: number,
  deltaY: number
): { camX: number; camY: number; zoom: number } {
  const before = screenToWorld(cursor.x, cursor.y, cam, canvasW, canvasH);
  const z = Math.max(0.1, Math.min(20, cam.zoom * (1 - deltaY * 0.001)));
  const after = screenToWorld(cursor.x, cursor.y, cam, canvasW, canvasH);
  return { camX: cam.x + before.x - after.x, camY: cam.y + before.y - after.y, zoom: z };
}
