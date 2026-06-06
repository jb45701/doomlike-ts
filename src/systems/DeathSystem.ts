/**
 * DeathSystem — handles entities where Health.current <= 0.
 *
 * Processing order (called after DamageSystem):
 *   1. Query entities with Health (but no Damage component still pending)
 *   2. Check if Health.current <= 0
 *   3. For dead enemies:
 *      - Set EnemyAI.behavior to 'death'
 *      - Add DespawnTimer (2s for death animation)
 *      - Remove Collider so dead bodies don't block
 *   4. For dead player:
 *      - Emit player_died event
 *   5. Emit enemy_died event for dead enemies
 *
 * Lifecycle:
 *   DeathSystem(world);
 */

import { hasComponent, addComponent, removeComponent } from 'bitecs';
import { Health, EnemyAI, Behavior, Collider, DespawnTimer } from '../ecs/Components';
import { queryDeadEntities } from '../ecs/queries';
import type { EcsWorld } from '../ecs/World';
import { emitEvent } from '../events/GameEvents';

/** Time (seconds) a dead enemy entity persists before despawn. */
const DEATH_DESPAWN_TIME = 2;

export function DeathSystem(world: EcsWorld): void {
  // Query entities with Health but no active Damage component
  const entities = queryDeadEntities(world);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];

    const currentHealth = Health.current[eid] ?? 0;
    if (currentHealth > 0) continue;

    // ── Death trigger ─────────────────────────────────────────────────────
    // Entity has health <= 0 — mark as dead

    if (eid === 1) {
      // Player death
      emitEvent({ type: 'player_died' });
      // Don't remove the player entity — let the game handle respawn/menu
      // Keep components so the death screen can still read health state
      continue;
    }

    // Check if this entity has EnemyAI (enemy death)
    if (hasComponent(world, eid, EnemyAI)) {
      EnemyAI.behavior[eid] = Behavior.Death;

      // Remove collider so dead bodies don't block movement
      if (hasComponent(world, eid, Collider)) {
        removeComponent(world, eid, Collider);
      }

      // Add despawn timer for death animation duration
      if (!hasComponent(world, eid, DespawnTimer)) {
        addComponent(world, eid, DespawnTimer);
      }
      DespawnTimer.remaining[eid] = DEATH_DESPAWN_TIME;

      // Emit enemy death event
      emitEvent({
        type: 'enemy_died',
        entity: eid,
        enemyType: 'unknown',
        position: { x: 0, y: 0, z: 0 }, // Position not read from component here
      });
    }
  }
}
