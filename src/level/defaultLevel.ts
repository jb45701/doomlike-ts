/**
 * defaultLevel — Default single-room level factory for the Doomlike FPS.
 *
 * Creates a hardcoded 256×256 room with floor at Y=0 and ceiling at Y=96.
 * Useful as a fallback or starting point for testing.
 *
 * Lifecycle:
 *   const levelData = createDefaultLevel();
 *   const result = loadLevel(physics, scene, levelData);
 */
import type { LevelData } from './LevelTypes';
import { PLAYER_FLOOR_OFFSET } from '../constants';

// ── Constants ────────────────────────────────────────────────────────────────

/** Half-size of the default test room. */
const DEFAULT_ROOM_HALF = 128;

// ── Default level factory ───────────────────────────────────────────────────

/**
 * Create a default single-room level (256×256, floor at Y=0, ceiling at Y=96).
 * Useful as a fallback or starting point for testing.
 *
 * PlayerStart.position specifies the capsule center (not the feet).
 * PLAYER_FLOOR_OFFSET = halfHeight + radius = 36, so body center at Y=41
 * places the capsule bottom at Y=5, just above the floor at Y=0.
 */
export function createDefaultLevel(): LevelData {
  const h = DEFAULT_ROOM_HALF;
  return {
    name: 'Default Room',
    author: 'System',
    skyTexture: 'skies/default',
    musicTrack: '',
    ambientLight: 0.6,
    playerStart: {
      // Spawn player above the floor so the capsule bottom clears the ground.
      // PLAYER_FLOOR_OFFSET = halfHeight + radius = 36; +5 gives clearance.
      position: { x: 0, y: PLAYER_FLOOR_OFFSET + 5, z: 0 },
      angle: 0,
    },
    sectors: [
      {
        id: 0,
        floorHeight: 0,
        ceilingHeight: 96,
        floorTexture: 'floors/default',
        ceilingTexture: 'ceilings/default',
        lightLevel: 192,
        walls: [
          { start: { x: -h, y: -h }, end: { x:  h, y: -h }, texture: 'walls/default' },
          { start: { x:  h, y: -h }, end: { x:  h, y:  h }, texture: 'walls/default' },
          { start: { x:  h, y:  h }, end: { x: -h, y:  h }, texture: 'walls/default' },
          { start: { x: -h, y:  h }, end: { x: -h, y: -h }, texture: 'walls/default' },
        ],
      },
    ],
    things: [],
  };
}
