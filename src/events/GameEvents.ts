/**
 * GameEvents — typed game event system with a per-frame event buffer.
 *
 * Events are cross-cutting notifications — multiple unrelated systems may
 * need to know something happened (e.g. weapon_fired triggers both audio
 * and visual effects). Systems push events into the buffer, and consumer
 * systems read them at their point in the pipeline.
 *
 * Lifecycle:
 *   emitEvent({ type: 'weapon_fired', weapon: 'pistol', ... });
 *   const events = consumeEvents('weapon_fired');
 *   clearEvents();  // called once per frame after all consumers
 */

// ── Event types ──────────────────────────────────────────────────────────────

export type GameEvent =
  | { type: 'weapon_fired'; weapon: string; position: { x: number; y: number; z: number }; direction: { x: number; y: number; z: number } }
  | { type: 'weapon_impact'; surface: 'flesh' | 'wall' | 'metal'; position: { x: number; y: number; z: number } }
  | { type: 'enemy_damaged'; entity: number; amount: number; position: { x: number; y: number; z: number } }
  | { type: 'enemy_died'; entity: number; enemyType: string; position: { x: number; y: number; z: number } }
  | { type: 'player_damaged'; amount: number; newHealth: number; direction: { x: number; y: number; z: number } }
  | { type: 'player_died' }
  | { type: 'pickup_collected'; kind: string; position: { x: number; y: number; z: number } }
  | { type: 'level_loaded'; levelId: string }
  | { type: 'secret_found'; sectorId: number }
  | { type: 'door_opened'; sectorId: number };

// ── Per-frame buffer ─────────────────────────────────────────────────────────

/** Internal event buffer — accumulates events during a single frame. */
const _buffer: GameEvent[] = [];

/**
 * Add an event to the current frame's buffer.
 */
export function emitEvent(event: GameEvent): void {
  _buffer.push(event);
}

/**
 * Return and remove all events of a specific type from the buffer.
 * Pass a type string to filter (e.g. consumeEvents('weapon_fired')).
 * Call with no argument to get all remaining events.
 */
export function consumeEvents(type?: string): GameEvent[] {
  if (type === undefined) {
    const result = _buffer.splice(0, _buffer.length);
    return result;
  }
  const result: GameEvent[] = [];
  for (let i = _buffer.length - 1; i >= 0; i--) {
    if (_buffer[i].type === type) {
      result.push(_buffer[i]);
      _buffer.splice(i, 1);
    }
  }
  return result;
}

/**
 * Clear all pending events. Called once per frame after all consumers
 * have read their events.
 */
export function clearEvents(): void {
  _buffer.length = 0;
}
