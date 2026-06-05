import { addComponent } from 'bitecs';
import * as InputManager from './input/InputManager';
import { createEcsWorld, createEntity } from './ecs/World';
import { PlayerTag, Position, Rotation, Velocity, InputState, RigidBody, Health } from './ecs/Components';
import { InputSystem } from './systems/InputSystem';
import { MovementSystem } from './systems/MovementSystem';
import { createRenderer } from './renderer/Renderer';
/** Max frame delta to prevent spiral-of-death after a long pause (seconds). */
const MAX_DT = 0.1;

export interface GameContext {
  start: () => void;
  stop: () => void;
  dispose: () => void;
}

export function createGame(canvas: HTMLCanvasElement): GameContext {
  const world = createEcsWorld();
  const player = createEntity(world);
  addComponent(world, player, PlayerTag);
  addComponent(world, player, Position);
  addComponent(world, player, Rotation);
  addComponent(world, player, Velocity);
  addComponent(world, player, InputState);
  addComponent(world, player, RigidBody);
  addComponent(world, player, Health);
  Position.x[player] = 0; Position.y[player] = 0; Position.z[player] = 0;
  Rotation.yaw[player] = 0; Rotation.pitch[player] = 0;
  Velocity.dx[player] = 0; Velocity.dy[player] = 0; Velocity.dz[player] = 0;
  RigidBody.mass[player] = 1; RigidBody.grounded[player] = true;
  Health.current[player] = 100; Health.max[player] = 100; Health.armor[player] = 0;

  const renderer = createRenderer(canvas);
  InputManager.init(canvas);

  let lastTime = performance.now();
  let rafId = 0;
  let running = false;

  function tick(): void {
    if (!running) return;
    rafId = requestAnimationFrame(tick);
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, MAX_DT);
    lastTime = now;
    InputSystem(world, dt);
    MovementSystem(world, dt);
    InputManager.endFrame();
    renderer.syncCamera(world);
    renderer.render();
  }

  function start(): void {
    if (running) return;
    running = true;
    lastTime = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function stop(): void {
    if (!running) return;
    running = false;
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function dispose(): void {
    stop();
    renderer.dispose();
    InputManager.dispose();
  }

  return { start, stop, dispose };
}
