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

  /**
   * Define a component schema.
   * Returns an object where each key maps to a typed array of `max` length.
   * @param schema Field names mapped to type strings (e.g. `{ x: Types.f32 }`)
   * @param max Maximum number of entities that can have this component (default 100000)
   */
  export function defineComponent<T extends Record<string, any>>(
    schema: T,
    max?: number,
  ): { [K in keyof T]: T[K] extends `${infer _}` ? never : T[K] extends TypesArray
    ? Int32Array | Float32Array | Uint8Array | Uint32Array | Uint16Array | Int16Array | Float64Array
    : any };

  /**
   * Define a query that returns entities matching the given component combination.
   * Returns a function `(world) => Readonly<Uint32Array>` with entity IDs.
   */
  export function defineQuery(
    components: any[],
  ): (world: World) => Readonly<Uint32Array> & readonly EntityId[];

  /** Query modifier: entities that do NOT have the given component. */
  export function Not(component: any): () => any[];

  /** Query modifier: entities that have ANY of the given components. */
  export function Or(component: any): () => any[];

  /** Query modifier: only entities whose component changed this frame. */
  export function Changed(component: any): () => any[];

  /** Add a component to an entity. */
  export function addComponent(world: World, component: any, eid: EntityId): void;

  /** Remove a component from an entity. */
  export function removeComponent(world: World, component: any, eid: EntityId): void;

  /** Check if an entity has a component. */
  export function hasComponent(world: World, component: any, eid: EntityId): boolean;

  /**
   * Creates a query that yields entities that just entered the query
   * (had all components added this frame).
   */
  export function enterQuery(queryFn: (world: World) => any): (world: World) => EntityId[];

  /**
   * Creates a query that yields entities that just exited the query
   * (had a component removed this frame).
   */
  export function exitQuery(queryFn: (world: World) => any): (world: World) => EntityId[];
}

type TypesArray = Int32Array | Float32Array | Uint8Array | Uint32Array | Uint16Array | Int16Array | Float64Array;
