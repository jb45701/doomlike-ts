import * as THREE from 'three';
import * as InputManager from './input/InputManager';
import { createEcsWorld, createEntity } from './ecs/World';
import { addComponent } from 'bitecs';
import { Position, Rotation, Velocity, InputState, PlayerTag } from './ecs/Components';
import { InputSystem } from './systems/InputSystem';
import { MovementSystem } from './systems/MovementSystem';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

const renderer = new THREE.WebGLRenderer({
  canvas, antialias: false, powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x111111);

InputManager.init(canvas);

// ── ECS setup ──────────────────────────────────────────────────────────────
const world = createEcsWorld();
const player = createEntity(world);

addComponent(world, player, Position);
Position.x[player] = 0;
Position.y[player] = 41;   // eye height
Position.z[player] = 0;

addComponent(world, player, Rotation);
Rotation.yaw[player] = 0;
Rotation.pitch[player] = 0;
Rotation.roll[player] = 0;

addComponent(world, player, Velocity);

addComponent(world, player, InputState);

addComponent(world, player, PlayerTag);

// ── Scene ──────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(90,
  window.innerWidth / window.innerHeight, 1, 500);
camera.position.set(0, 41, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(100, 200, 100);
scene.add(dirLight);

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

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Game loop ──────────────────────────────────────────────────────────────
let lastTime = performance.now();

function tick() {
  requestAnimationFrame(tick);

  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1); // cap dt to 100ms
  lastTime = now;

  // Systems run in order: InputSystem → MovementSystem → RenderSystem
  InputSystem(world, dt);
  MovementSystem(world, dt);

  InputManager.endFrame();
  renderer.render(scene, camera);
}

tick();
