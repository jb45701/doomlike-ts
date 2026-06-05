/**
 * Game — main loop, lifecycle, and ECS world management.
 *
 * This is the heart of the game. It owns the ECS world, player entity,
 * and the per-frame system pipeline.
 *
 * Lifecycle:
 *   const game = createGame(canvas);
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
  RigidBody,
  Health,
} from './ecs/Components';
import { InputSystem } from './systems/InputSystem';
import { MovementSystem } from './systems/MovementSystem';
import { createRenderer } from './renderer/Renderer';
import type { RenderContext } from './renderer/Renderer';

/** Max frame delta to prevent spiral-of-death after a long pause (seconds). */
const MAX_DT = 0.05;

// ── Types ───────────────────────────────────────────────────────────────────

export interface GameState {
  world: EcsWorld;
  player: number;
  renderer: RenderContext;
  running: boolean;
  lastTime: number;
  rafId: number | null;
  start: () => void;
  stop: () => void;
  dispose: () => void;
}

// ── Factory ─────────────────────────────────────────────────────────────────

export function createGame(canvas: HTMLCanvasElement): GameState {
  // ── ECS world ──────────────────────────────────────────────────────────
  const world = createEcsWorld();

  // ── Renderer ───────────────────────────────────────────────────────────
  const renderer = createRenderer(canvas);

  // ── Player entity ──────────────────────────────────────────────────────
  const player = createEntity(world);
  addComponent(world, player, PlayerTag);
  addComponent(world, player, Position);
  addComponent(world, player, Rotation);
  addComponent(world, player, Velocity);
  addComponent(world, player, InputState);
  addComponent(world, player, RigidBody);
  addComponent(world, player, Health);

  // Initial component values
  Position.x[player] = 0;
  Position.y[player] = 0;
  Position.z[player] = 0;
  Rotation.yaw[player] = 0;
  Rotation.pitch[player] = 0;
  Velocity.dx[player] = 0;
  Velocity.dy[player] = 0;
  Velocity.dz[player] = 0;
  RigidBody.mass[player] = 1;
  RigidBody.grounded[player] = true;
  Health.current[player] = 100;
  Health.max[player] = 100;
  Health.armor[player] = 0;

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

    // 2. MovementSystem — reads InputState → updates Velocity + Position
    MovementSystem(world, dt);

    // 3. End frame — snapshot prev-state for edge detection next tick
    InputManager.endFrame();

    // 4. Sync camera to player entity
    renderer.syncCamera(world);

    // 5. Render
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
    InputManager.dispose();
    renderer.dispose();
  };

  return { world, player, renderer, running, lastTime, rafId, start, stop, dispose };
}
