import { registerQuery } from 'bitecs';
import type { World } from 'bitecs';
import {
  Position,
  Rotation,
  Velocity,
  Collider,
  RigidBody,
  Renderable,
  AnimState,
  Health,
  Damage,
  WeaponState,
  EnemyAI,
  Pickup,
  Door,
  PlayerTag,
  InputState,
  DespawnTimer,
  FlashTimer,
} from './Components';

/**
 * Register all standard queries and return a handle object.
 * Call once after creating the world.
 */
export function registerQueries(world: World) {
  const movable = registerQuery(world, [Position, Velocity]);
  const renderable = registerQuery(world, [Position, Rotation, Renderable]);
  const spriteAnim = registerQuery(world, [Renderable, AnimState]);
  const physicsBodies = registerQuery(world, [Position, Velocity, Collider, RigidBody]);
  const projectiles = registerQuery(world, [Position, Velocity, Damage]);
  const enemies = registerQuery(world, [Position, EnemyAI, Health]);
  const doors = registerQuery(world, [Door]);
  const pickups = registerQuery(world, [Position, Pickup]);
  const playerWithInput = registerQuery(world, [PlayerTag, InputState]);
  const playerWithWeapon = registerQuery(world, [PlayerTag, WeaponState]);
  const playerWithHealth = registerQuery(world, [PlayerTag, Health]);
  const damageDealers = registerQuery(world, [Damage]);
  const healthEntities = registerQuery(world, [Health]);
  const despawning = registerQuery(world, [DespawnTimer]);
  const flashing = registerQuery(world, [FlashTimer]);

  return {
    movable,
    renderable,
    spriteAnim,
    physicsBodies,
    projectiles,
    enemies,
    doors,
    pickups,
    playerWithInput,
    playerWithWeapon,
    playerWithHealth,
    damageDealers,
    healthEntities,
    despawning,
    flashing,
  };
}

export type Queries = ReturnType<typeof registerQueries>;
