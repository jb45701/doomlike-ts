import * as THREE from 'three';

// ── Renderer Setup ──────────────────────────────────────
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x111111);

// ── Scene & Camera ──────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  90, // FOV
  window.innerWidth / window.innerHeight,
  1,  // near
  500 // far
);
camera.position.set(0, 41, 0); // eye height ~41 units

// ── Lighting ────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(100, 200, 100);
scene.add(dirLight);

// ── Test geometry ───────────────────────────────────────
// Colored floor plane to show something visible
const floorGeo = new THREE.PlaneGeometry(512, 512);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x333344,
  roughness: 1,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

// Grid helper for orientation
const grid = new THREE.GridHelper(512, 32, 0x666688, 0x444466);
grid.position.y = 0.01;
scene.add(grid);

// A colored box for visual interest
const boxGeo = new THREE.BoxGeometry(32, 32, 32);
const boxMat = new THREE.MeshStandardMaterial({ color: 0xff4444 });
const box = new THREE.Mesh(boxGeo, boxMat);
box.position.set(64, 16, -128);
scene.add(box);

// ── Pointer Lock ────────────────────────────────────────
const overlay = document.getElementById('overlay')!;

overlay.addEventListener('click', () => {
  canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  overlay.classList.toggle('hidden', document.pointerLockElement === canvas);
});

// ── Resize ──────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// ── Game Loop ───────────────────────────────────────────
function tick() {
  requestAnimationFrame(tick);

  // Future: clock.getDelta() for deltaTime — used when ECS systems run

  renderer.render(scene, camera);
}

tick();
