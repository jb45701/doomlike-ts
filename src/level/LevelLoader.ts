/**
 * LevelLoader — parses LevelData JSON and creates Rapier colliders + Three.js meshes.
 *
 * On load:
 *   1. Creates Rapier colliders for all walls (box shapes along each wall segment)
 *   2. Creates floor/ceiling static bodies
 *   3. Creates Three.js meshes for sector geometry (delegated to SectorMeshes)
 *   4. Returns the player start position
 *
 * Lifecycle:
 *   const result = loadLevel(physics, scene, levelData);
 *   // On cleanup: disposeLevel(result, physics);
 */
import * as THREE from 'three';
import type { RapierContext } from '../physics/RapierWorld';
import type { LevelData, LevelLoadResult } from './LevelTypes';
import {
  createWallCollider,
  createFloorCollider,
} from '../physics/CollisionShapes';
import { PLAYER_FLOOR_OFFSET } from '../constants';
import {
  createWallMesh,
  createFloorMesh,
  createCeilingMesh,
  computeSectorBounds,
} from './SectorMeshes';

// ── Constants ────────────────────────────────────────────────────────────────

/** Half-size of the default test room. */
const DEFAULT_ROOM_HALF = 128;

// ── Default level factory ───────────────────────────────────────────────────

/**
 * Create a default single-room level (256×256, floor at Y=0, ceiling at Y=96).
 * Useful as a fallback or starting point for testing.
 */
export function createDefaultLevel(): LevelData {
  const h = DEFAULT_ROOM_HALF;
  return {
    name: 'Default Room',
    author: 'System',
    skyTexture: 'skies/default',
    musicTrack: '',
    ambientLight: 0.6,
    playerStart: {
      // Spawn player above the floor so the capsule bottom clears the ground.
      // PLAYER_FLOOR_OFFSET = halfHeight + radius = 36; +5 gives clearance.
      position: { x: 0, y: PLAYER_FLOOR_OFFSET + 5, z: 0 },
      angle: 0,
    },
    sectors: [
      {
        id: 0,
        floorHeight: 0,
        ceilingHeight: 96,
        floorTexture: 'floors/default',
        ceilingTexture: 'ceilings/default',
        lightLevel: 192,
        walls: [
          { start: { x: -h, y: -h }, end: { x:  h, y: -h }, texture: 'walls/default' },
          { start: { x:  h, y: -h }, end: { x:  h, y:  h }, texture: 'walls/default' },
          { start: { x:  h, y:  h }, end: { x: -h, y:  h }, texture: 'walls/default' },
          { start: { x: -h, y:  h }, end: { x: -h, y: -h }, texture: 'walls/default' },
        ],
      },
    ],
    things: [],
  };
}

// ── Main loader ──────────────────────────────────────────────────────────────

export function loadLevel(
  physics: RapierContext,
  scene: THREE.Scene,
  levelData: LevelData,
): LevelLoadResult {
  const meshes: THREE.Mesh[] = [];
  const colliderHandles: number[] = [];

  for (const sector of levelData.sectors) {
    const bound = computeSectorBounds(sector);
    const floorY = sector.floorHeight;
    const ceilY = sector.ceilingHeight;

    // Floor mesh
    const floorMesh = createFloorMesh(
      floorY, bound.minX, bound.maxX, bound.minZ, bound.maxZ,
    );
    scene.add(floorMesh);
    meshes.push(floorMesh);

    // Ceiling mesh
    const ceilMesh = createCeilingMesh(
      ceilY, bound.minX, bound.maxX, bound.minZ, bound.maxZ,
    );
    scene.add(ceilMesh);
    meshes.push(ceilMesh);

    // Floor collider (thin box across the whole sector)
    const floorHandle = createFloorCollider(
      physics, bound.minX, bound.maxX, bound.minZ, bound.maxZ, floorY - 1,
    );
    colliderHandles.push(floorHandle);

    // Ceiling collider
    const ceilHandle = createFloorCollider(
      physics, bound.minX, bound.maxX, bound.minZ, bound.maxZ, ceilY + 1,
    );
    colliderHandles.push(ceilHandle);

    // Wall meshes + colliders
    for (const wall of sector.walls) {
      const mesh = createWallMesh(wall.start, wall.end, floorY, ceilY);
      if (!mesh) continue;
      scene.add(mesh);
      meshes.push(mesh);

      const wallHandle = createWallCollider(
        physics,
        { x: wall.start.x, z: wall.start.y },
        { x: wall.end.x, z: wall.end.y },
        ceilY - floorY,
        floorY,
      );
      colliderHandles.push(wallHandle);
    }
  }

  return {
    meshes,
    colliderHandles,
    playerStart: {
      x: levelData.playerStart.position.x,
      y: levelData.playerStart.position.y,
      z: levelData.playerStart.position.z,
      angle: levelData.playerStart.angle,
    },
  };
}

// ── Cleanup ──────────────────────────────────────────────────────────────────

export function disposeLevel(
  level: LevelLoadResult,
  physics: RapierContext,
): void {
  for (const m of level.meshes) {
    const mesh = m as THREE.Mesh;
    if (mesh.parent) {
      mesh.parent.remove(mesh);
    }
    mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) {
      for (const mat of mesh.material) {
        mat.dispose();
      }
    } else {
      mesh.material.dispose();
    }
  }

  // Remove colliders from physics world
  for (const handle of level.colliderHandles) {
    physics.removeCollider(handle);
  }
}
