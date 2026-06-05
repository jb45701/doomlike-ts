/**
<<<<<<< Updated upstream
 * Renderer — Three.js scene setup, camera, sector geometry, and render loop.
=======
 * Renderer -- Three.js scene setup, camera, sector geometry, and render loop.
>>>>>>> Stashed changes
 *
 * Owns the Three.js scene, camera, and WebGLRenderer.
 * Provides methods to sync camera transform from player entity components
 * and to render the scene each frame.
 *
 * Lifecycle:
 *   const renderer = createRenderer(canvas);
<<<<<<< Updated upstream
 *   renderer.syncCamera(position, rotation);
 *   renderer.render(deltaTime);
=======
 *   renderer.syncCamera(world);
 *   renderer.render();
>>>>>>> Stashed changes
 *   renderer.dispose();
 */
import * as THREE from 'three';
import type { EcsWorld } from '../ecs/World';
import { Position, Rotation } from '../ecs/Components';
import { queryPlayerEntity } from '../ecs/queries';

<<<<<<< Updated upstream
// ── Sector constants ────────────────────────────────────────────────────────
=======
// -- Sector constants --------------------------------------------------------
>>>>>>> Stashed changes

/** Half-width of the default room on X and Z axes. */
const ROOM_HALF = 128;

/** Floor Y position. */
const FLOOR_Y = 0;

/** Ceiling Y position (height of room). */
const CEILING_Y = 96;

<<<<<<< Updated upstream
/** Player eye height above the Y center of the collision capsule. */
=======
/** Player eye height above the foot position. */
>>>>>>> Stashed changes
const EYE_HEIGHT = 41;

/** Camera field of view (degrees). */
const FOV = 90;

/** Camera near clip plane. */
const NEAR = 1;

/** Camera far clip plane. */
const FAR = 500;

/** Ambient light intensity. */
const AMBIENT_INTENSITY = 0.6;

/** Directional light intensity. */
const DIR_LIGHT_INTENSITY = 0.8;

/** Wall color. */
const WALL_COLOR = 0x334466;

/** Floor color. */
const FLOOR_COLOR = 0x333344;

/** Ceiling color. */
const CEILING_COLOR = 0x222244;

<<<<<<< Updated upstream
// ── Types ───────────────────────────────────────────────────────────────────
=======
// -- Types -------------------------------------------------------------------
>>>>>>> Stashed changes

export interface RenderContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  dispose: () => void;
  syncCamera: (world: EcsWorld) => void;
  render: () => void;
}

<<<<<<< Updated upstream
// ── Helpers ─────────────────────────────────────────────────────────────────
=======
// -- Helpers -----------------------------------------------------------------
>>>>>>> Stashed changes

/**
 * Create a rectangular wall quad between two floor-level points.
 */
function createWall(
  x1: number, z1: number,
  x2: number, z2: number,
  color: number,
): THREE.Mesh {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);

  const geo = new THREE.PlaneGeometry(length, CEILING_Y - FLOOR_Y);
  const mat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);

  // Position at wall midpoint, centred vertically
  mesh.position.set((x1 + x2) / 2, (FLOOR_Y + CEILING_Y) / 2, (z1 + z2) / 2);
  mesh.rotation.y = -angle + Math.PI / 2;

  return mesh;
}

/**
 * Build a hardcoded rectangular sector (floor, ceiling, 4 walls).
 */
function buildSector(scene: THREE.Scene): void {
  // Floor
  const floorGeo = new THREE.PlaneGeometry(ROOM_HALF * 2, ROOM_HALF * 2);
  const floorMat = new THREE.MeshBasicMaterial({ color: FLOOR_COLOR, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  scene.add(floor);

  // Ceiling
  const ceilGeo = new THREE.PlaneGeometry(ROOM_HALF * 2, ROOM_HALF * 2);
  const ceilMat = new THREE.MeshBasicMaterial({ color: CEILING_COLOR, side: THREE.DoubleSide });
  const ceil = new THREE.Mesh(ceilGeo, ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = CEILING_Y;
  scene.add(ceil);

  // Walls (4 sides of the rectangular sector)
  const h = ROOM_HALF;
  scene.add(createWall(-h, -h,  h, -h, WALL_COLOR)); // north
  scene.add(createWall( h, -h,  h,  h, WALL_COLOR)); // east
  scene.add(createWall( h,  h, -h,  h, WALL_COLOR)); // south
  scene.add(createWall(-h,  h, -h, -h, WALL_COLOR)); // west

  // Grid helper (subtle, above floor)
  const grid = new THREE.GridHelper(ROOM_HALF * 2, 16, 0x555577, 0x444466);
  grid.position.y = FLOOR_Y + 0.1;
  scene.add(grid);
}

<<<<<<< Updated upstream
// ── Factory ─────────────────────────────────────────────────────────────────

export function createRenderer(canvas: HTMLCanvasElement): RenderContext {
  // ── WebGL renderer ──────────────────────────────────────────────────────
=======
// -- Factory -----------------------------------------------------------------

export function createRenderer(canvas: HTMLCanvasElement): RenderContext {
  // -- WebGL renderer -------------------------------------------------------
>>>>>>> Stashed changes
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x111111);

<<<<<<< Updated upstream
  // ── Scene ───────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // ── Camera ──────────────────────────────────────────────────────────────
=======
  // -- Scene ----------------------------------------------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // -- Camera ---------------------------------------------------------------
>>>>>>> Stashed changes
  const camera = new THREE.PerspectiveCamera(
    FOV, window.innerWidth / window.innerHeight, NEAR, FAR,
  );
  camera.position.set(0, EYE_HEIGHT, 0);

<<<<<<< Updated upstream
  // ── Lighting (ambient + directional) ────────────────────────────────────
=======
  // -- Lighting (ambient + directional) -------------------------------------
>>>>>>> Stashed changes
  const ambient = new THREE.AmbientLight(0xffffff, AMBIENT_INTENSITY);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, DIR_LIGHT_INTENSITY);
  dirLight.position.set(100, 200, 100);
  scene.add(dirLight);

<<<<<<< Updated upstream
  // ── Sector geometry ─────────────────────────────────────────────────────
  buildSector(scene);

  // ── Resize handler ──────────────────────────────────────────────────────
=======
  // -- Sector geometry ------------------------------------------------------
  buildSector(scene);

  // -- Resize handler -------------------------------------------------------
>>>>>>> Stashed changes
  const onResize = (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

<<<<<<< Updated upstream
  // ── Public API ──────────────────────────────────────────────────────────
=======
  // -- Public API -----------------------------------------------------------
>>>>>>> Stashed changes
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
