/**
 * SectorMeshes — Three.js mesh creation helpers for level sector geometry.
 *
 * Provides functions to create visual meshes for walls, floors, and ceilings
 * from sector data. These are separate from physics collision generation
 * (handled by CollisionShapes) so that the LevelLoader stays focused on
 * orchestration rather than geometry math.
 *
 * Lifecycle:
 *   const wallMesh = createWallMesh(start, end, floorY, ceilY, color);
 *   const floorMesh = createFloorMesh(floorY, minX, maxX, minZ, maxZ, color);
 *   const ceilMesh = createCeilingMesh(ceilY, minX, maxX, minZ, maxZ, color);
 */
import * as THREE from 'three';
import type { Sector } from './LevelTypes';

// ── Colours ─────────────────────────────────────────────────────────────────

const WALL_COLOR = 0x445566;
const FLOOR_COLOR = 0x333344;
const CEILING_COLOR = 0x222244;

// ── Wall mesh ────────────────────────────────────────────────────────────────

/**
 * Create a THREE.Mesh for a wall segment between two XZ points.
 * Returns null for degenerate walls (length < 0.001).
 */
export function createWallMesh(
  start: { x: number; y: number },
  end: { x: number; y: number },
  floorY: number,
  ceilY: number,
  color: number = WALL_COLOR,
): THREE.Mesh | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 0.001) {
    return null;
  }

  const angle = Math.atan2(dy, dx);
  const height = ceilY - floorY;
  const midX = (start.x + end.x) / 2;
  const midZ = (start.y + end.y) / 2;

  const geo = new THREE.PlaneGeometry(length, height);
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(midX, (floorY + ceilY) / 2, midZ);
  mesh.rotation.y = -angle + Math.PI / 2;

  return mesh;
}

// ── Floor mesh ───────────────────────────────────────────────────────────────

/**
 * Create a flat horizontal plane mesh for a sector floor.
 */
export function createFloorMesh(
  floorY: number,
  minX: number, maxX: number,
  minZ: number, maxZ: number,
  color: number = FLOOR_COLOR,
): THREE.Mesh {
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const geo = new THREE.PlaneGeometry(width, depth);
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((minX + maxX) / 2, floorY, (minZ + maxZ) / 2);
  return mesh;
}

// ── Ceiling mesh ─────────────────────────────────────────────────────────────

/**
 * Create a flat horizontal plane mesh for a sector ceiling.
 * Faces downward (rotation.x = +PI/2).
 */
export function createCeilingMesh(
  ceilY: number,
  minX: number, maxX: number,
  minZ: number, maxZ: number,
  color: number = CEILING_COLOR,
): THREE.Mesh {
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const geo = new THREE.PlaneGeometry(width, depth);
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set((minX + maxX) / 2, ceilY, (minZ + maxZ) / 2);
  return mesh;
}

// ── Sector bounds ────────────────────────────────────────────────────────────

/**
 * Compute the bounding box of a sector's wall vertices on the XZ plane.
 */
export function computeSectorBounds(sector: Sector): {
  minX: number; maxX: number;
  minZ: number; maxZ: number;
} {
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const wall of sector.walls) {
    if (wall.start.x < minX) minX = wall.start.x;
    if (wall.start.x > maxX) maxX = wall.start.x;
    if (wall.end.x < minX) minX = wall.end.x;
    if (wall.end.x > maxX) maxX = wall.end.x;
    if (wall.start.y < minZ) minZ = wall.start.y;
    if (wall.start.y > maxZ) maxZ = wall.start.y;
    if (wall.end.y < minZ) minZ = wall.end.y;
    if (wall.end.y > maxZ) maxZ = wall.end.y;
  }

  return { minX, maxX, minZ, maxZ };
}
