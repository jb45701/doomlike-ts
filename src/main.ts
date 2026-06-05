/**
 * main.ts — Game bootstrap and main loop.
 *
 * Initialises the ECS world, creates the player entity, sets up
 * Three.js rendering, and runs the system pipeline each frame.
 *
 * System order (per frame):
 *   1. InputSystem   — reads InputManager → writes InputState + Rotation
 *   2. MovementSystem — reads InputState → updates Velocity + Position
 *   3. Camera sync    — reads player Position + Rotation → sets Three.js camera
 *   4. Render         — Three.js renders the scene
 *
 * Lifecycle:
 *   endFrame() snapshots prev-state for edge detection next frame.
 */
import * as THREE from 'three';
import { addComponent } from 'bitecs';
import * as InputManager from './input/InputManager';
import { createEcsWorld, createEntity } from './ecs/World';
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

// ── Bootstrap ───────────────────────────────────────────────────────────────

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

const renderer = new THREE.WebGLRenderer({
  canvas, antialias: false, powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x111111);

InputManager.init(canvas);

// ── Scene ───────────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  90, window.innerWidth / window.innerHeight, 1, 500,
);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(100, 200, 100);
scene.add(dirLight);

// Temporary floor + objects until LevelLoader exists
const floorGeo = new THREE.PlaneGeometry(512, 512);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 1 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

const grid = new THREE.GridHelper(512, 32, 0x666688, 0x444466);
grid.position.y = 0.01;
scene.add(grid);

const boxGeo = new THREE.BoxGeometry(32, 32, 32);
const boxMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
const box = new THREE.Mesh(boxGeo, boxMat);
box.position.set(64, 16, -128);
scene.add(box);

// ── ECS world ───────────────────────────────────────────────────────────────

const world = createEcsWorld();

// Create the player entity
const player = createEntity(world);
addComponent(world, player, PlayerTag);
addComponent(world, player, Position);
addComponent(world, player, Rotation);
addComponent(world, player, Velocity);
addComponent(world, player, InputState);
addComponent(world, player, RigidBody);
addComponent(world, player, Health);

// Initialise component values
Position.x[player] = 0;
Position.y[player] = 41;  // eye height
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

// Sync initial camera to player
camera.position.set(Position.x[player], Position.y[player], Position.z[player]);

// ── Delta time tracker ──────────────────────────────────────────────────────

let lastTime = performance.now();

// ── Game loop ───────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function tick() {
  requestAnimationFrame(tick);

  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms to avoid spiral-of-death
  lastTime = now;

  // 1. InputSystem — reads InputManager → writes InputState + Rotation
  InputSystem(world, dt);

  // 2. MovementSystem — reads InputState → updates Velocity + Position
  MovementSystem(world, dt);

  // 3. End frame — snapshot prev-state for edge detection next tick
  InputManager.endFrame();

  // 4. Sync camera to player entity
  camera.position.set(Position.x[player], Position.y[player], Position.z[player]);

  // Apply rotation: pitch around X, yaw around Y (Euler order YX)
  camera.rotation.order = 'YXZ';
  camera.rotation.x = Rotation.pitch[player] ?? 0;
  camera.rotation.y = Rotation.yaw[player] ?? 0;

  // 5. Render
  renderer.render(scene, camera);
}

tick();
