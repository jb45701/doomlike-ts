/**
 * DamageSystem — applies Damage components to entity Health.
 *
 * Processing order (called after ProjectileSystem, before DeathSystem):
 *   1. Query entities with Damage component
 *   2. For each damaged entity:
 *      a. Look up the target entity (Damage.source points to the shooter,
 *         but Damage is on the target entity for now — direct application)
 *      b. Apply damage to Health.current:
 *         - If armor > 0: armor absorbs 1/3, health takes 2/3
 *      c. Emit player_damaged or enemy_damaged event
 *   3. Remove Damage component after processing
 *
 * Lifecycle:
 *   DamageSystem(world);
 */

import { hasComponent, removeComponent } from 'bitecs';
import { Health, Damage, PlayerTag, Position } from '../ecs/Components';
import { queryDamageEntities } from '../ecs/queries';
import type { EcsWorld } from '../ecs/World';
import { emitEvent } from '../events/GameEvents';

export function DamageSystem(world: EcsWorld): void {
  const entities = queryDamageEntities(world);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];

    const amount = Damage.amount[eid] ?? 0;
    if (amount <= 0) {
      removeComponent(world, eid, Damage);
      continue;
    }

    // Check if the entity has Health
    const health = Health.current[eid];
    if (health === undefined) {
      // No health — damage has no effect (e.g., projectile entity with Damage
      // for shooter tracking but no Health component)
      removeComponent(world, eid, Damage);
      continue;
    }

    // Apply armor reduction
    const armor = Health.armor[eid] ?? 0;
    let actualDamage = amount;
    let armorAbsorbed = 0;

    if (armor > 0) {
      armorAbsorbed = Math.min(amount * (1 / 3), armor);
      actualDamage = amount - armorAbsorbed;
      Health.armor[eid] = armor - armorAbsorbed;
    }

    // Apply damage to health
    const currentHealth = Health.current[eid] ?? 0;
    const newHealth = Math.max(0, currentHealth - actualDamage);
    Health.current[eid] = newHealth;

    // Emit event — use PlayerTag marker to distinguish player from enemies
    if (hasComponent(world, eid, PlayerTag)) {
      emitEvent({
        type: 'player_damaged',
        amount: actualDamage,
        newHealth,
        direction: { x: 0, y: 0, z: 0 },
      });
    } else {
      emitEvent({
        type: 'enemy_damaged',
        entity: eid,
        amount: actualDamage,
        position: { x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0, z: Position.z[eid] ?? 0 },
      });
    }

    // Remove the Damage component — it's a one-shot payload
    removeComponent(world, eid, Damage);
  }
}
