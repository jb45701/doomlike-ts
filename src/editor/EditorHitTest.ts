import type { LevelData, Vec2 } from '../level/LevelTypes';
const HIT_THRESHOLD = 8;
const THING_HIT_BONUS_PX = 20;
export type HitResult = { kind: 'sector'; sectorIdx: number } | { kind: 'wall'; sectorIdx: number; wallIdx: number } | { kind: 'thing'; thingIdx: number } | null;
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1, lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
function pointInPolygon(px: number, py: number, verts: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i].x, yi = verts[i].y, xj = verts[j].x, yj = verts[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function hitTest(wx: number, wy: number, level: LevelData, zoom: number): HitResult {
  for (let i = level.things.length - 1; i >= 0; i--) {
    const t = level.things[i];
    if (Math.hypot(wx - t.position.x, wy - t.position.z) < HIT_THRESHOLD / zoom + THING_HIT_BONUS_PX) return { kind: 'thing', thingIdx: i };
  }
  let bestDist = Infinity, best: HitResult = null;
  for (let si = 0; si < level.sectors.length; si++) for (let wi = 0; wi < level.sectors[si].walls.length; wi++) {
    const w = level.sectors[si].walls[wi], d = distToSegment(wx, wy, w.start.x, w.start.y, w.end.x, w.end.y);
    if (d < 8 / zoom && d < bestDist) { bestDist = d; best = { kind: 'wall', sectorIdx: si, wallIdx: wi }; }
  }
  if (best) return best;
  for (let si = level.sectors.length - 1; si >= 0; si--) {
    if (pointInPolygon(wx, wy, level.sectors[si].walls.map((w) => ({ x: w.start.x, y: w.start.y })))) return { kind: 'sector', sectorIdx: si };
  }
  return null;
}
