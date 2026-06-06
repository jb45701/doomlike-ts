/**
 * Game — main loop, lifecycle, and ECS world management.
 *
 * This is the heart of the game. It owns the ECS world, player entity,
 * renderer, physics world, level data, and the per-frame system pipeline.
 *
 * Lifecycle:
 *   const game = await createGame(canvas);
 *   game.start();
 *   // ... runs until stop()
 *   game.stop();
 *   game.dispose();
 */
import { addComponent } from 'bitecs';
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
  ColliderShape,
} from './ecs/Components';
import { InputSystem } from './systems/InputSystem';
import { MovementSystem } from './systems/MovementSystem';
import { PhysicsSystem, createPhysicsBodyMap } from './systems/PhysicsSystem';
import type { PhysicsBodyMap } from './systems/PhysicsSystem';
import { createRenderer } from './renderer/Renderer';
import type { RenderContext } from './renderer/Renderer';
import { createRapierWorld } from './physics/RapierWorld';
import type { RapierContext } from './physics/RapierWorld';
import { loadLevel, disposeLevel, createDefaultLevel } from './level/LevelLoader';
import type { LevelLoadResult, LevelData } from './level/LevelTypes';

/** Max frame delta to prevent spiral-of-death after a long pause (seconds). */
const MAX_DT = 0.1;

/** Player capsule radius. */
const PLAYER_RADIUS = 16;
/** Player capsule half-height. */
const PLAYER_HALF_HEIGHT = 20;

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

  // ── Physics body tracking ──────────────────────────────────────────────
  const physicsBodies = createPhysicsBodyMap();

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

    // 2. MovementSystem — reads InputState → updates Velocity
    //    (position integration skipped for physics-managed entities)
    MovementSystem(world, dt);

    // 3. PhysicsSystem — syncs ECS state → Rapier bodies, steps physics,
    //    reads back collision-resolved positions, updates grounded state
    PhysicsSystem(world, physics, physicsBodies, dt);

    // 4. End frame — snapshot prev-state for edge detection next tick
    InputManager.endFrame();

    // 5. Sync camera to player entity
    renderer.syncCamera(world);

    // 6. Render
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
  };

  return { world, player, renderer, physics, physicsBodies, level, running, lastTime, rafId, start, stop, dispose };
}
