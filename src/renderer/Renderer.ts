/**
 * Renderer — Three.js scene setup, camera, and render loop.
 *
 * Owns the Three.js scene, camera, and WebGLRenderer.
 * Sector geometry is loaded by LevelLoader in Game.ts — this module
 * only manages the camera sync and rendering pipeline.
 *
 * Lifecycle:
 *   const renderer = createRenderer(canvas);
 *   renderer.syncCamera(world);
 *   renderer.render();
 *   renderer.dispose();
 */
import * as THREE from 'three';
import type { EcsWorld } from '../ecs/World';
import { Position, Rotation } from '../ecs/Components';
import { queryPlayerEntity } from '../ecs/queries';

/** Player eye height above the foot position. */
const EYE_HEIGHT = 41;

/** Camera field of view (degrees). */
const FOV = 90;

/** Camera near clip plane. */
const NEAR = 1;

/** Camera far clip plane. */
const FAR = 500;

// ── Types ───────────────────────────────────────────────────────────────────

export interface RenderContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  dispose: () => void;
  syncCamera: (world: EcsWorld) => void;
  render: () => void;
}

// ── Factory ─────────────────────────────────────────────────────────────────

export function createRenderer(canvas: HTMLCanvasElement): RenderContext {
  // ── WebGL renderer ──────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x111111);

  // ── Scene ───────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(100, 200, 100);
  scene.add(dirLight);

  // Grid helper for spatial reference (sector geometry is loaded by LevelLoader)
  const grid = new THREE.GridHelper(256, 16, 0x555577, 0x444466);
  grid.position.y = 0;
  scene.add(grid);

  // ── Camera ──────────────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(
    FOV, window.innerWidth / window.innerHeight, NEAR, FAR,
  );
  camera.position.set(0, EYE_HEIGHT, 0);

  // ── Resize handler ──────────────────────────────────────────────────────
  const onResize = (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  // ── Public API ──────────────────────────────────────────────────────────
  const syncCamera = (world: EcsWorld): void => {
    const entities = queryPlayerEntity(world);
    if (entities.length === 0) return;
    const eid = entities[0];

    camera.position.set(
      Position.x[eid] ?? 0,
      (Position.y[eid] ?? 0) + EYE_HEIGHT,
      Position.z[eid] ?? 0,
    );

    camera.rotation.order = 'YXZ';
    camera.rotation.x = Rotation.pitch[eid] ?? 0;
    camera.rotation.y = Rotation.yaw[eid] ?? 0;
  };

  const render = (): void => {
    renderer.render(scene, camera);
  };

  const dispose = (): void => {
    window.removeEventListener('resize', onResize);
    renderer.dispose();
    scene.clear();
  };

  return { scene, camera, renderer, dispose, syncCamera, render };
}
