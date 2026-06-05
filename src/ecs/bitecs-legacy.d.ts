/**
 * Type declarations for bitecs/legacy (bitecs 0.4.0).
 *
 * bitecs 0.4.0 ships the legacy API as a separate entry point but
 * ships no type declarations for it. These fill in the gap.
 */
declare module 'bitecs/legacy' {
  import type { World, EntityId } from 'bitecs';

  // ── Type strings for component schemas ────────────────

  export const Types: {
    i8: 'i8';
    ui8: 'ui8';
    ui8c: 'ui8c';
    i16: 'i16';
    ui16: 'ui16';
    i32: 'i32';
    ui32: 'ui32';
    f32: 'f32';
    f64: 'f64';
    eid: 'eid';
  };

  // TypeScript type map from type string to TypedArray constructor
  type TypeMap = {
    i8: Int8Array;
    ui8: Uint8Array;
    ui8c: Uint8ClampedArray;
    i16: Int16Array;
    ui16: Uint16Array;
    i32: Int32Array;
    ui32: Uint32Array;
    f32: Float32Array;
    f64: Float64Array;
    eid: Uint32Array;
  };

  /**
   * Schema definition: a record of field name → type string.
   * Example: { x: Types.f32, y: Types.f32, z: Types.f32 }
   */
  type Schema = Record<string, string>;

  /**
   * Component type: an object whose keys match the schema keys,
   * and each value is the corresponding TypedArray.
   */
  type Component<T extends Schema> = {
    [K in keyof T]: T[K] extends keyof TypeMap ? TypeMap[T[K]] : never;
  };

  /**
   * Define a component with a numeric schema.
   * Creates SoA (structure-of-arrays) typed stores for each field.
   */
  export function defineComponent<T extends Schema>(
    schema: T,
    max?: number,
  ): Component<T>;

  /** Define a marker component (no data fields). */
  export function defineComponent(
    schema?: Record<string, never>,
    max?: number,
  ): {};

  /**
   * Define a query that returns entity IDs matching the given
   * component combination. Returns a function `(world) => Uint32Array`.
   */
  export function defineQuery(
    components: any[],
  ): (world: World) => Readonly<Uint32Array> & readonly EntityId[];

  /** Query modifier: entities that do NOT have the given component. */
  export function Not(component: any): () => any[];

  /** Query modifier: entities that have ANY of the given components. */
  export function Or(...components: any[]): () => any[];

  /** Query modifier: only entities whose component changed this frame. */
  export function Changed(component: any): () => any[];

  /** Add a component to an entity. */
  export function addComponent(world: World, component: any, eid: EntityId): void;

  /** Remove a component from an entity. */
  export function removeComponent(world: World, component: any, eid: EntityId): void;

  /** Check if an entity has a component. */
  export function hasComponent(world: World, component: any, eid: EntityId): boolean;

  /**
   * Creates a query wrapper that yields entities that just entered the query
   * (had all required components added this frame).
   */
  export function enterQuery(queryFn: (world: World) => any): (world: World) => EntityId[];

  /**
   * Creates a query wrapper that yields entities that just exited the query
   * (had a required component removed this frame).
   */
  export function exitQuery(queryFn: (world: World) => any): (world: World) => EntityId[];
}
