/**
 * Game — main loop, lifecycle, and ECS world management.
 *
 * This is the heart of the game. It owns the ECS world, player entity,
 * renderer, physics world, level data, and the per-frame system pipeline.
 *
 * Pipeline order each frame:
 *   1. InputSystem       — reads InputManager → writes InputState + Rotation
 *   2. WeaponSystem      — handles weapon switching and firing
 *   3. MovementSystem    — reads InputState → updates Velocity
 *   4. PhysicsSystem     — syncs ECS → Rapier, steps physics, reads back
 *   5. ProjectileSystem  — detects projectile collisions post-physics
 *   6. DamageSystem      — applies Damage components to Health
 *   7. DeathSystem       — handles entities with Health <= 0
 *   8. DespawnSystem     — removes timed-out entities
 *   9. syncEntityMeshes  — syncs entity positions to Three.js meshes
 *  10. endFrame          — snapshots prev-key state for edge detection
 *  11. syncCamera        — updates camera from player Position + Rotation
 *  12. render            — Three.js render
 *
 * Lifecycle:
 *   const game = await createGame(canvas);
 *   game.start();
 *   // ... runs until stop()
 *   game.stop();
 *   game.dispose();
 */
import { addComponent, hasComponent } from 'bitecs';
import * as THREE from 'three';
import * as InputManager from './input/InputManager';
import { createEcsWorld, createEntity } from './ecs/World';
import type { EcsWorld } from './ecs/World';
import {
  PlayerTag,
  Position,
  Rotation,
  Velocity,
  InputState,
  Collider,
  RigidBody,
  Health,
  WeaponState,
  WeaponKind,
  ColliderShape,
  Renderable,
} from './ecs/Components';
import { queryProjectiles } from './ecs/queries';
import { InputSystem } from './systems/InputSystem';
import { WeaponSystem } from './systems/WeaponSystem';
import { MovementSystem } from './systems/MovementSystem';
import { PhysicsSystem, createPhysicsBodyMap } from './systems/PhysicsSystem';
import type { PhysicsBodyMap } from './systems/PhysicsSystem';
import { ProjectileSystem } from './systems/ProjectileSystem';
import { DamageSystem } from './systems/DamageSystem';
import { DeathSystem } from './systems/DeathSystem';
import { DespawnSystem } from './systems/DespawnSystem';
import { createRenderer } from './renderer/Renderer';
import type { RenderContext } from './renderer/Renderer';
import { createRapierWorld } from './physics/RapierWorld';
import type { RapierContext } from './physics/RapierWorld';
import { loadLevel, disposeLevel, createDefaultLevel } from './level/LevelLoader';
import type { LevelLoadResult, LevelData } from './level/LevelTypes';
import { clearEvents } from './events/GameEvents';
import {
  PLAYER_RADIUS,
  PLAYER_HALF_HEIGHT,
} from './constants';

/** Max frame delta to prevent spiral-of-death after a long pause (seconds). */
const MAX_DT = 0.1;

// ── Types ───────────────────────────────────────────────────────────────────

export interface GameState {
  world: EcsWorld;
  player: number;
  renderer: RenderContext;
  physics: RapierContext;
  physicsBodies: PhysicsBodyMap;
  level: LevelLoadResult;
  running: boolean;
  lastTime: number;
  rafId: number | null;
  start: () => void;
  stop: () => void;
  dispose: () => void;
}

// ── Factory ─────────────────────────────────────────────────────────────────

export async function createGame(canvas: HTMLCanvasElement): Promise<GameState> {
  // ── ECS world ──────────────────────────────────────────────────────────
  const world = createEcsWorld();

  // ── Renderer ───────────────────────────────────────────────────────────
  const renderer = createRenderer(canvas);

  // ── Physics world ──────────────────────────────────────────────────────
  const physics = await createRapierWorld();

  // ── Load level ─────────────────────────────────────────────────────────
  const levelData: LevelData = createDefaultLevel();
  const level = loadLevel(physics, renderer.scene, levelData);

  // ── Player entity ──────────────────────────────────────────────────────
  const player = createEntity(world);
  addComponent(world, player, PlayerTag);
  addComponent(world, player, Position);
  addComponent(world, player, Rotation);
  addComponent(world, player, Velocity);
  addComponent(world, player, InputState);
  addComponent(world, player, Collider);
  addComponent(world, player, RigidBody);
  addComponent(world, player, Health);
  addComponent(world, player, WeaponState);

  // Initial component values — placed at level's player start
  Position.x[player] = level.playerStart.x;
  Position.y[player] = level.playerStart.y;
  Position.z[player] = level.playerStart.z;
  Rotation.yaw[player] = level.playerStart.angle;
  Rotation.pitch[player] = 0;
  Velocity.dx[player] = 0;
  Velocity.dy[player] = 0;
  Velocity.dz[player] = 0;

  // Collider: capsule shape at player position
  Collider.shape[player] = ColliderShape.Capsule;
  Collider.radius[player] = PLAYER_RADIUS;
  Collider.height[player] = PLAYER_HALF_HEIGHT;

  RigidBody.mass[player] = 1;
  RigidBody.grounded[player] = true;
  Health.current[player] = 100;
  Health.max[player] = 100;
  Health.armor[player] = 0;

  // WeaponState: start with a pistol
  WeaponState.kind[player] = WeaponKind.Pistol;
  WeaponState.ammo[player] = 20;
  WeaponState.maxAmmo[player] = 20;
  WeaponState.cooldown[player] = 0;
  WeaponState.firing[player] = false;
  WeaponState.reloading[player] = false;
  WeaponState.reloadTimer[player] = 0;

  // ── Physics body tracking ──────────────────────────────────────────────
  const physicsBodies = createPhysicsBodyMap();

  // ── Entity mesh tracking ───────────────────────────────────────────────
  // Map of entity ID → Three.js mesh for dynamic entity rendering
  const entityMeshes = new Map<number, THREE.Mesh>();

  // ── Input ──────────────────────────────────────────────────────────────
  InputManager.init(canvas);

  // ── State ──────────────────────────────────────────────────────────────
  let running = false;
  let lastTime = performance.now();
  let rafId: number | null = null;

  // ── Tick ───────────────────────────────────────────────────────────────
  function tick(now: number): void {
    if (!running) return;
    rafId = requestAnimationFrame(tick);

    const dt = Math.min((now - lastTime) / 1000, MAX_DT);
    lastTime = now;

    // 1. InputSystem — reads InputManager → writes InputState + Rotation
    InputSystem(world, dt);

    // 2. WeaponSystem — handles weapon switching and firing
    WeaponSystem(world, physics, player, dt);

    // 3. MovementSystem — reads InputState → updates Velocity
    //    (position integration skipped for physics-managed entities)
    MovementSystem(world, dt);

    // 4. PhysicsSystem — syncs ECS state → Rapier bodies, steps physics,
    //    reads back collision-resolved positions, updates grounded state
    PhysicsSystem(world, physics, physicsBodies, dt);

    // 5. ProjectileSystem — detects projectile collisions post-physics
    ProjectileSystem(world, physics, physicsBodies);

    // 6. DamageSystem — applies Damage components to Health
    DamageSystem(world);

    // 7. DeathSystem — handles entities with Health <= 0
    DeathSystem(world);

    // 8. DespawnSystem — removes timed-out entities
    DespawnSystem(world, physics, physicsBodies, dt);

    // 9. Sync entity meshes — create/update Three.js meshes for projectiles
    syncEntityMeshes(world, renderer.scene, entityMeshes);

    // 10. End frame — snapshot prev-state for edge detection next tick
    InputManager.endFrame();

    // 11. Clear leftover game events (no consumers wired yet; future Audio,
    //     UISystem, and particle systems will drain relevant events before this)
    clearEvents();

    // 12. Sync camera to player entity
    renderer.syncCamera(world);

    // 13. Render
    renderer.render();
  }

  // ── Public API ─────────────────────────────────────────────────────────
  const start = (): void => {
    if (running) return;
    running = true;
    lastTime = performance.now();
    rafId = requestAnimationFrame(tick);
  };

  const stop = (): void => {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const dispose = (): void => {
    stop();
    disposeLevel(level, physics);
    InputManager.dispose();
    renderer.dispose();
    physics.dispose();
    // Clean up entity meshes
    for (const mesh of entityMeshes.values()) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    entityMeshes.clear();
  };

  return { world, player, renderer, physics, physicsBodies, level, running, lastTime, rafId, start, stop, dispose };
}

// ── Entity mesh sync ────────────────────────────────────────────────────────

/**
 * Sync entity meshes with the Three.js scene.
 *
 * Creates sphere meshes for projectile entities and updates their transforms
 * each frame. Cleans up meshes for entities that no longer exist.
 */
function syncEntityMeshes(
  world: EcsWorld,
  scene: THREE.Scene,
  meshMap: Map<number, THREE.Mesh>,
): void {
  // ── Clean up stale meshes ──────────────────────────────────────────────
  // Uses hasComponent() rather than checking raw array values because bitecs
  // does NOT zero typed arrays on removeComponent() — stale values persist.
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
