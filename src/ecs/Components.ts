import { Types, defineComponent } from 'bitecs/legacy';

export interface Vec3 { x: number; y: number; z: number }

export const Position = defineComponent({ x: Types.f32, y: Types.f32, z: Types.f32 });
export const Rotation = defineComponent({ yaw: Types.f32, pitch: Types.f32, roll: Types.f32 });
export const Velocity = defineComponent({ dx: Types.f32, dy: Types.f32, dz: Types.f32 });

export const Collider = defineComponent({ shape: Types.ui8, radius: Types.f32, height: Types.f32, halfExtentX: Types.f32, halfExtentY: Types.f32, halfExtentZ: Types.f32 });
export const RigidBody = defineComponent({ mass: Types.f32, grounded: Types.ui8 });

export const Renderable = defineComponent({ kind: Types.ui8, scale: Types.f32, brightness: Types.f32 });
export const renderableResourceId = new Map<number, string>();

export const AnimState = defineComponent({ frame: Types.i32, timer: Types.f32, fps: Types.f32 });
export const animStateCurrent = new Map<number, string>();

export const Health = defineComponent({ current: Types.f32, max: Types.f32, armor: Types.f32 });
export const Damage = defineComponent({ amount: Types.f32, source: Types.eid, knockbackX: Types.f32, knockbackY: Types.f32, knockbackZ: Types.f32 });

export const WeaponState = defineComponent({ kind: Types.ui8, ammo: Types.i32, maxAmmo: Types.i32, cooldown: Types.f32, firing: Types.ui8, reloading: Types.ui8, reloadTimer: Types.f32 });
export const weaponStateKindName = new Map<number, string>();

export const EnemyAI = defineComponent({ behavior: Types.ui8, target: Types.eid, sightRange: Types.f32, attackRange: Types.f32, speed: Types.f32, painChance: Types.f32, lastKnownPosX: Types.f32, lastKnownPosY: Types.f32, lastKnownPosZ: Types.f32 });
export const enemyPatrolPath = new Map<number, Vec3[]>();

export const Pickup = defineComponent({ kind: Types.ui8, amount: Types.f32, respawn: Types.ui8 });
export const pickupSubKind = new Map<number, string>();

export const Door = defineComponent({ open: Types.ui8, speed: Types.f32, openHeight: Types.f32, currentOffset: Types.f32, sectorId: Types.i32 });

export const PlayerTag = defineComponent({});
export const InputState = defineComponent({ forward: Types.ui8, back: Types.ui8, left: Types.ui8, right: Types.ui8, jump: Types.ui8, crouch: Types.ui8, fire: Types.ui8, altFire: Types.ui8, use: Types.ui8, nextWeapon: Types.ui8, prevWeapon: Types.ui8, weaponSlot1: Types.ui8, weaponSlot2: Types.ui8, weaponSlot3: Types.ui8, weaponSlot4: Types.ui8, weaponSlot5: Types.ui8, weaponSlot6: Types.ui8, weaponSlot7: Types.ui8, mouseX: Types.f32, mouseY: Types.f32 });

export const DespawnTimer = defineComponent({ remaining: Types.f32 });
export const FlashTimer = defineComponent({ remaining: Types.f32, targetBrightness: Types.f32 });
