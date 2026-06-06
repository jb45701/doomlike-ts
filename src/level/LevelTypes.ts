/**
 * LevelTypes — LevelData TypeScript interfaces for the Doomlike FPS.
 *
 * Defines the complete level format used by the game loader and map editor.
 * Levels are stored as serialisable JSON — every field is a plain value.
 *
 * The format mirrors the ARCHITECTURE.md specification.
 *
 * Usage:
 *   import type { LevelData, Sector, Wall, Thing } from './LevelTypes';
 *   const level: LevelData = { ... };
 *
 * See ARCHITECTURE.md — Level Format section for the full schema.
 */

// ── Vec2 ────────────────────────────────────────────────────────────────────

/** 2D point on the XZ plane (floor coordinates). */
export interface Vec2 {
  x: number;
  y: number; // z in world-space, named 'y' for 2D convenience
}

// ── Vec3 ────────────────────────────────────────────────────────────────────

/** 3D world-space point (right-handed: X right, Y up, Z forward). */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// ── PlayerStart ─────────────────────────────────────────────────────────────

/** Player spawn point within a level. */
export interface PlayerStart {
  position: Vec3;
  /** Initial yaw (radians), 0 = looking along +Z. */
  angle: number;
}

// ── Wall ────────────────────────────────────────────────────────────────────

/** Portal configuration for see-through walls (windows, doors). */
export interface Portal {
  /** Target sector ID visible through this portal. */
  sectorId: number;
  /** How the portal behaves visually and physically. */
  kind: 'window' | 'door' | 'open';
}

/** A single wall segment in a sector. */
export interface Wall {
  /** Start point on the XZ plane. */
  start: Vec2;
  /** End point on the XZ plane. */
  end: Vec2;
  /** Texture resource path (e.g. 'textures/walls/brick.png'). */
  texture: string;
  /** Optional portal through this wall. */
  portal?: Portal;
  /** Texture alignment: 'upper' pegs texture to ceiling, 'lower' to floor. */
  unpegged?: 'upper' | 'lower';
  /** Texture scroll offset. */
  offset?: Vec2;
}

// ── Sector ──────────────────────────────────────────────────────────────────

/** A single sector — a closed polygon with floor, ceiling, and walls. */
export interface Sector {
  /** Unique sector ID within the level. */
  id: number;
  /** Floor height (Y coordinate of floor surface). */
  floorHeight: number;
  /** Ceiling height (Y coordinate of ceiling surface). */
  ceilingHeight: number;
  /** Floor texture resource path. */
  floorTexture: string;
  /** Ceiling texture resource path. */
  ceilingTexture: string;
  /** Ambient light level 0–255 (0 = pitch black, 255 = fully lit). */
  lightLevel: number;
  /** Optional sector behaviour special. */
  special?: 'secret' | 'damage_5' | 'damage_10' | 'exit';
  /** Wall segments forming the sector boundary. */
  walls: Wall[];
}

// ── Thing ───────────────────────────────────────────────────────────────────

/** An entity placed in the level (enemy, pickup, trigger, etc.). */
export interface Thing {
  /** Unique identifier within the level (string for readability). */
  id: string;
  /** Entity type identifier. */
  type: string;
  /** World-space position. */
  position: Vec3;
  /** Facing angle (radians). */
  angle: number;
  /** Type-specific configuration. */
  properties?: Record<string, unknown>;
}

// ── LevelData ───────────────────────────────────────────────────────────────

/** Top-level level container. */
export interface LevelData {
  /** Human-readable level name. */
  name: string;
  /** Level author. */
  author: string;
  /** Sky texture resource path. */
  skyTexture: string;
  /** Background music track resource path. */
  musicTrack: string;
  /** Global ambient light level 0–1 (multiplied per-sector). */
  ambientLight: number;
  /** All sectors in the level. */
  sectors: Sector[];
  /** All placed things. */
  things: Thing[];
  /** Player spawn point. Exactly one per level. */
  playerStart: PlayerStart;
}

// ── LevelLoadResult ─────────────────────────────────────────────────────────

/**
 * Result of loading a level into the game world.
 * Contains Three.js meshes (for scene rendering) and Rapier collider handles
 * (for physics cleanup). The meshes array is typed as `unknown[]` here
 * to avoid a Three.js import dependency. LevelLoader casts appropriately.
 */
export interface LevelLoadResult {
  /** Player start position and angle (flattened for direct use by Game.ts). */
  playerStart: { x: number; y: number; z: number; angle: number };
  /** Collider handles for all static geometry (for cleanup). */
  colliderHandles: number[];
  /** Three.js meshes added to the scene (for cleanup). */
  meshes: unknown[];
}
