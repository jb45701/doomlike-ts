/**
 * Minimal type declarations for bitecs/legacy
 *
 * bitecs 0.4.0 ships the legacy API but its .d.ts is empty.
 * These declarations cover what Components.ts and queries.ts need.
 */
declare module 'bitecs/legacy' {
  import type { World, EntityId } from 'bitecs';

  /** Typed array type strings for component schema definitions. */
  export const Types: {
    f32: Float32ArrayConstructor;
    f64: Float64ArrayConstructor;
    i8: Int8ArrayConstructor;
    i16: Int16ArrayConstructor;
    i32: Int32ArrayConstructor;
    ui8: Uint8ArrayConstructor;
    ui16: Uint16ArrayConstructor;
    ui32: Uint32ArrayConstructor;
    eid: Uint32ArrayConstructor;
  };

  /**
   * Define a component with a typed schema.
   * Returns an object whose keys are the field names and whose values
   * are typed arrays indexed by entity ID.
   *
   * @example
   *   const Position = defineComponent({ x: Types.f32, y: Types.f32, z: Types.f32 });
   *   // Position.x[eid] = 10;
   */
  export function defineComponent<T extends Record<string, unknown>>(schema: T): T;

  /**
   * Add a component to an entity.
   * Returns true if the component was newly added, false if already present.
   */
  export function addComponent(world: World, eid: EntityId, component: Record<string, unknown>): boolean;

  /**
   * Add multiple components to an entity (spread or array form).
   */
  export function addComponents(world: World, eid: EntityId, ...components: (Record<string, unknown> | { component: Record<string, unknown>; data: unknown })[]): void;
  export function addComponents(world: World, eid: EntityId, components: (Record<string, unknown> | { component: Record<string, unknown>; data: unknown })[]): void;

  /**
   * Remove a component from an entity.
   */
  export function removeComponent(world: World, eid: EntityId, ...components: Record<string, unknown>[]): void;

  /**
   * Set component data on an entity.
   * Adds the component if not already present.
   */
  export function setComponent(world: World, eid: EntityId, component: Record<string, unknown>, data: Record<string, unknown>): void;

  /**
   * Check if an entity has a component.
   */
  export function hasComponent(world: World, eid: EntityId, component: Record<string, unknown>): boolean;

  /**
   * Create a setter tuple for use with addComponent/addComponents.
   */
  export function set<T extends Record<string, unknown>>(component: T, data: Partial<T>): { component: T; data: Partial<T> };

  /**
   * Register a component with the world (auto-called if not done explicitly).
   */
  export function registerComponent(world: World, component: Record<string, unknown>): unknown;
}
