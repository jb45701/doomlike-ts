/**
 * Renderer — Three.js scene setup, camera, sector geometry, and render loop.
 *
 * Owns the WebGLRenderer, Scene, and PerspectiveCamera.
 * Builds the starter sector (one rectangular room) on construction.
 *
 * Lifecycle:
 *   const r = new Renderer(canvas);
 *   r.syncCamera(px, py, pz, yaw, pitch);
 *   r.render();
 *   r.dispose();
 */
import * as THREE from 'three';

// ── Constants ────────────────────────────────────────────────────────────────

const ROOM_HALF = 128;
const FLOOR_Y = 0;
const CEILING_Y = 96;
const EYE_HEIGHT = 41;
const FOV = 90;
const NEAR = 1;
const FAR = 500;
const WALL_COLOR = 0x334466;
const FLOOR_COLOR = 0x333344;
const CEILING_COLOR = 0x222244;

// ── Sector helpers ───────────────────────────────────────────────────────────

function createWall(x1: number, z1: number, x2: number, z2: number): THREE.Mesh {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(len, CEILING_Y - FLOOR_Y),
    new THREE.MeshBasicMaterial({ color: WALL_COLOR, side: THREE.DoubleSide }),
  ).setPosition((x1 + x2) / 2, (FLOOR_Y + CEILING_Y) / 2, (z1 + z2) / 2)
   .setRotationFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, 0));
}

function buildSector(scene: THREE.Scene): void {
  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_HALF * 2, ROOM_HALF * 2),
    new THREE.MeshBasicMaterial({ color: FLOOR_COLOR, side: THREE.DoubleSide }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  scene.add(floor);

  // Ceiling
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_HALF * 2, ROOM_HALF * 2),
    new THREE.MeshBasicMaterial({ color: CEILING_COLOR, side: THREE.DoubleSide }),
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = CEILING_Y;
  scene.add(ceil);

  // Walls
  const h = ROOM_HALF;
  scene.add(createWall(-h, -h, h, -h));
  scene.add(createWall(h, -h, h, h));
  scene.add(createWall(h, h, -h, h));
  scene.add(createWall(-h, h, -h, -h));

  // Grid helper
  const grid = new THREE.GridHelper(ROOM_HALF * 2, 16, 0x555577, 0x444466);
  grid.position.y = FLOOR_Y + 0.1;
  scene.add(grid);
}

// ── Renderer class ───────────────────────────────────────────────────────────

export class Renderer {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  private gl: THREE.WebGLRenderer;
  private onResize: (() => void) | null;

  constructor(canvas: HTMLCanvasElement) {
    this.gl = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.gl.setSize(window.innerWidth, window.innerHeight);
    this.gl.setClearColor(0x111111);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);

    this.camera = new THREE.PerspectiveCamera(
      FOV, window.innerWidth / window.innerHeight, NEAR, FAR,
    );
    this.camera.position.set(0, EYE_HEIGHT, 0);
    this.camera.rotation.order = 'YXZ';

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 100);
    this.scene.add(dirLight);

    // Sector
    buildSector(this.scene);

    // Resize
    this.onResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.gl.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', this.onResize);
  }

  syncCamera(x: number, y: number, z: number, yaw: number, pitch: number): void {
    this.camera.position.set(x, y + EYE_HEIGHT, z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.x = pitch;
    this.camera.rotation.y = yaw;
  }

  render(): void {
    this.gl.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.onResize) {
      window.removeEventListener('resize', this.onResize);
      this.onResize = null;
    }
    this.gl.dispose();
    this.scene.clear();
  }
}
