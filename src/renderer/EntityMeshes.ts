/**
 * EntityMeshes — Three.js mesh management for ECS entities.
 *
 * Provides a sync step that creates sphere meshes for projectile entities,
 * updates their transforms each frame, and cleans up meshes for entities
 * that no longer exist.
 *
 * Lifecycle:
 *   const mgr = createEntityMeshManager(scene);
 *   mgr.sync(world);
 *   mgr.dispose();
 */

import { hasComponent } from 'bitecs';
import * as THREE from 'three';
import {
  PlayerTag,
  Position,
  Renderable,
} from '../ecs/Components';
import type { EcsWorld } from '../ecs/World';
import { queryProjectiles } from '../ecs/queries';

// ── Types ───────────────────────────────────────────────────────────────────

export interface EntityMeshManager {
  /** Sync entity positions to meshes: cleanup stale, create new, update existing. */
  sync: (world: EcsWorld) => void;
  /** Dispose all tracked meshes and clear the map. */
  dispose: () => void;
}

// ── Factory ─────────────────────────────────────────────────────────────────

export function createEntityMeshManager(scene: THREE.Scene): EntityMeshManager {
  const meshMap = new Map<number, THREE.Mesh>();

  function sync(world: EcsWorld): void {
    // ── Clean up stale meshes ──────────────────────────────────────────────
    for (const [eid, mesh] of meshMap) {
      if (!hasComponent(world, eid, Position)) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        meshMap.delete(eid);
      }
    }

    // ── Update existing meshes + create new ones ───────────────────────────
    const projEntities = queryProjectiles(world);
    for (const eid of projEntities) {
      if (hasComponent(world, eid, PlayerTag)) continue; // skip player

      const posX = Position.x[eid] ?? 0;
      const posY = Position.y[eid] ?? 0;
      const posZ = Position.z[eid] ?? 0;

      if (meshMap.has(eid)) {
        // Update existing mesh position
        const mesh = meshMap.get(eid)!;
        mesh.position.set(posX, posY, posZ);
      } else {
        // New projectile — create a sphere mesh
        const radius = Renderable.scale[eid] ? Renderable.scale[eid] / 2 : 2;
        const geometry = new THREE.SphereGeometry(radius, 8, 8);
        const material = new THREE.MeshBasicMaterial({
          color: 0xff8800,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(posX, posY, posZ);
        scene.add(mesh);
        meshMap.set(eid, mesh);
      }
    }
  }

  function dispose(): void {
    for (const mesh of meshMap.values()) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    meshMap.clear();
  }

  return { sync, dispose };
}
