import * as THREE from 'three';
import type { EcsWorld } from '../ecs/World';
import { Position, Rotation } from '../ecs/Components';
import { queryPlayerEntity } from '../ecs/queries';

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

function createWall(x1: number, z1: number, x2: number, z2: number, color: number): THREE.Mesh {
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(len, CEILING_Y - FLOOR_Y),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
  );
  mesh.position.set((x1 + x2) / 2, (FLOOR_Y + CEILING_Y) / 2, (z1 + z2) / 2);
  mesh.rotation.y = -angle + Math.PI / 2;
  return mesh;
}

function buildSector(scene: THREE.Scene): void {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_HALF * 2, ROOM_HALF * 2),
    new THREE.MeshBasicMaterial({ color: FLOOR_COLOR, side: THREE.DoubleSide }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  scene.add(floor);

  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_HALF * 2, ROOM_HALF * 2),
    new THREE.MeshBasicMaterial({ color: CEILING_COLOR, side: THREE.DoubleSide }),
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = CEILING_Y;
  scene.add(ceil);

  const h = ROOM_HALF;
  scene.add(createWall(-h, -h, h, -h, WALL_COLOR));
  scene.add(createWall(h, -h, h, h, WALL_COLOR));
  scene.add(createWall(h, h, -h, h, WALL_COLOR));
  scene.add(createWall(-h, h, -h, -h, WALL_COLOR));

  const grid = new THREE.GridHelper(ROOM_HALF * 2, 16, 0x555577, 0x444466);
  grid.position.y = FLOOR_Y + 0.1;
  scene.add(grid);
}

export interface RenderContext {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  syncCamera: (world: EcsWorld) => void;
  render: () => void;
  dispose: () => void;
}

export function createRenderer(canvas: HTMLCanvasElement): RenderContext {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x111111);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, NEAR, FAR);
  camera.position.set(0, EYE_HEIGHT, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(100, 200, 100);
  scene.add(dirLight);

  buildSector(scene);

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  const syncCamera = (world: EcsWorld): void => {
    const entities = queryPlayerEntity(world);
    if (entities.length === 0) return;
    const eid = entities[0];
    camera.position.set(Position.x[eid] ?? 0, (Position.y[eid] ?? 0) + EYE_HEIGHT, Position.z[eid] ?? 0);
    camera.rotation.order = 'YXZ';
    camera.rotation.x = Rotation.pitch[eid] ?? 0;
    camera.rotation.y = Rotation.yaw[eid] ?? 0;
  };

  const render = () => renderer.render(scene, camera);

  const dispose = () => {
    window.removeEventListener('resize', onResize);
    renderer.dispose();
    scene.clear();
  };

  return { scene, camera, syncCamera, render, dispose };
}
