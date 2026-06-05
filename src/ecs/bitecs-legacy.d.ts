/**
 * Type declarations for bitecs/legacy (bitecs 0.4.0).
 *
 * bitecs 0.4.0 ships the legacy API as a separate entry point but
 * ships no type declarations for it. These fill in the gap.
 */
declare module 'bitecs/legacy' {
  import type { World, EntityId } from 'bitecs';

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

  type Component = Record<string, Int32Array | Float32Array | Uint8Array | Uint32Array | Uint16Array | Int16Array | Float64Array>;

  export function defineComponent(
    schema: Record<string, string>,
    max?: number,
  ): Component;

  export function defineComponent(
    schema?: Record<string, never>,
    max?: number,
  ): {};

  export function defineQuery(
    components: any[],
  ): (world: World) => Readonly<Uint32Array> & readonly EntityId[];

  export function Not(component: any): () => any[];
  export function Or(...components: any[]): () => any[];
  export function Changed(component: any): () => any[];
  export function addComponent(world: World, component: any, eid: EntityId): void;
  export function removeComponent(world: World, component: any, eid: EntityId): void;
  export function hasComponent(world: World, component: any, eid: EntityId): boolean;
  export function enterQuery(queryFn: (world: World) => any): (world: World) => EntityId[];
  export function exitQuery(queryFn: (world: World) => any): (world: World) => EntityId[];
}
