# Doomlike FPS — Agent Development Guide

> **Goal:** A modern-retro first-person shooter — fast movement, sprite enemies, satisfying weapons, sector-based levels, rendered with Three.js. Pixel-art textures, billboard sprites, unfiltered rendering.

> **Who this is for:** Coding agents building the engine. This document establishes the scaffolding, coding standards, and testing practices that every agent is expected to follow. If the codebase has clear, formal structure, agents will reinforce it.

---

## 1. Den MCP Integration

This project is managed through the **Den** system. All task coordination happens here.

### MCP Tools Available

| Tool | Purpose |
|------|---------|
| `mcp_den_get_task` | Read task description, status, assignment |
| `mcp_den_list_tasks` | See all tasks in the project |
| `mcp_den_get_document` | Read project docs (e.g., `architecture` for the full spec) |
| `mcp_den_store_document` | Write notes, ADRs, or status docs |
| `mcp_den_post_channel_message` | Post updates to `#dev` channel |
| `mcp_den_list_channel_messages` | Read channel history for context |
| `mcp_den_send_message` | Send task-scoped messages |
| `mcp_den_create_task` | Create subtasks when a task needs decomposition |

### Task Workflow

1. You are woken by a notification in the `#dev` channel
2. Read the notification body to find the task ID
3. Call `mcp_den_get_task(task_id=N)` to read the full description
4. Read relevant documents (`mcp_den_get_document(project_id='doomlike-ts', slug='architecture')`)
5. Read `ARCHITECTURE.md` in the repo root for the full technical spec
6. Implement the task
7. Run all tests
8. Commit with conventional commit message
9. Post summary to `#dev` channel with `@reviewer please review (retry_counter=0)`

---

## 2. Module Organization

### Project Structure

```
doomlike-ts/
├── index.html               — Entry point, canvas, HUD overlay
├── package.json
├── tsconfig.json
├── vite.config.ts
├── AGENTS.md                — ← You are here
├── ARCHITECTURE.md          — Full game architecture spec
├── README.md                — Project status summary
├── playwright.config.ts     — Playwright UI test config
├── assets/                  — Textures, sprites, sounds, levels
├── src/
│   ├── main.ts              — Bootstrap entry point
│   ├── Game.ts              — Main loop, pipeline, lifecycle
│   ├── constants.ts         — Shared game constants
│   ├── ecs/                 — ECS world, components, queries
│   ├── systems/             — One file per system (Input, Weapon, Physics, etc.)
│   ├── renderer/            — Three.js scene setup, camera, sprite rendering
│   ├── physics/             — Rapier world, collision shapes, raycast queries
│   ├── input/               — Keyboard/mouse/pointer lock manager
│   ├── level/               — LevelData types, loader, sector meshes
│   ├── events/              — Game event type + per-frame buffer
│   ├── weapons/             — Weapon definitions, fire handlers
│   ├── ui/                  — HUD, menus (future)
│   ├── editor/              — Map editor (separate Vite entry point)
│   └── tests/               — Playwright UI tests
```

### File Rules

- **One export class/function per file.** Helper types in the same file are fine.
- **No barrel files** except at `index.ts` where one exists.
- **Co-locate tests.** `foo.spec.ts` lives next to `foo.ts`.
- **Maximum file size: 200 lines** (stretch target: 150 lines). Hard limit: 500. If you exceed it, split the file.
- **Directory nesting: maximum 3 levels below `src/`.**

---

## 3. TypeScript Configuration

### Compiler Strictness (non-negotiable)

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**`any` is banned.** Exception: external libraries with no types. Each usage must have a `// SAFETY:` comment explaining why.

### Module System

- ES modules exclusively. No `require()`, no `module.exports`.
- No circular imports. Restructure to avoid them.

---

## 4. Architecture Rules

### The Big Rule: Game State and Rendering Are Separate

Game logic updates entities in a pure ECS data layer. Once per frame, the render system syncs visuals to match. **Never put game logic inside a render callback or Three.js object.** This is the most important architectural boundary.

```
Each frame:
  InputSystem       → reads keyboard/mouse → writes InputState
  WeaponSystem     → processes fire/switch → spawns projectiles
  MovementSystem   → applies velocity from input
  PhysicsSystem    → steps Rapier, resolves collisions
  ProjectileSystem → detects hits, applies damage
  DamageSystem     → applies damage to health
  DeathSystem      → handles entities at 0 HP
  DespawnSystem    → removes timed-out entities
  syncEntityMeshes → creates/updates Three.js objects
  UISystem         → reads player state → updates HUD
  RenderSystem     → syncs Three.js scene → renders
```

### ECS Contract

- **Entities** are integer IDs. No data on entities.
- **Components** are plain data stored in typed arrays (bitecs SoA). No methods.
- **Systems** are pure functions that receive `(world, deltaTime)` and nothing else. Side effects go through ECS writes.
- Every system file does exactly one thing. Max ~150 lines.

### Component Pattern

```typescript
// Components are SoA (structure of arrays) via bitecs defineComponent
export const Position = defineComponent({ x: number, y: number, z: number });
export const Velocity = defineComponent({ dx: number, dy: number, dz: number });

// Marker components are empty objects
export const PlayerTag = defineComponent();
```

### System Pattern

```typescript
export function SomeSystem(world: World, dt: number): void {
  const entities = querySomeEntities(world);
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];
    // Read components
    // Mutate components
  }
}
```

### Pipeline Ordering

Systems run in this exact order in `Game.ts`:
1. InputSystem
2. WeaponSystem
3. MovementSystem
4. PhysicsSystem
5. ProjectileSystem
6. DamageSystem
7. DeathSystem
8. DespawnSystem
9. syncEntityMeshes
10. WeaponBobSystem
11. UISystem
12. clearEvents
13. syncCamera
14. render

---

## 5. Design Patterns

### Dependency Injection

No global singletons. No `new Foo()` in system bodies. Dependencies passed through function parameters or module imports. Object graph constructed in `Game.ts`.

### Event Bus (cross-cutting notifications only)

ECS handles all game state flow. Events exist only for notifications where multiple unrelated systems need to know something happened:

```typescript
type GameEvent =
  | { type: 'weapon_fired'; weapon: string; position: Vec3; direction: Vec3 }
  | { type: 'weapon_impact'; surface: 'flesh' | 'wall' | 'metal'; position: Vec3 }
  | { type: 'player_damaged'; amount: number; newHealth: number; direction: Vec3 }
  | { type: 'enemy_died'; entity: Entity; enemyType: string; position: Vec3 }
  | { type: 'player_died' }
  | { type: 'pickup_collected'; kind: string; position: Vec3 }
```

Per-frame buffer. No pub/sub. `emitEvent` → systems process → `consumeEvents` → `clearEvents`.

---

## 6. Error Handling

- Never swallow errors silently.
- Never `throw new Error("message")` for game logic failures — use typed errors or sentinel values.
- Always preserve cause chain: `{ cause: error }`.
- Use `Result<T, E>` patterns for expected failures, exceptions for unexpected.

---

## 7. Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| Files | kebab-case | `weapon-system.ts` |
| Classes | PascalCase | `WeaponSystem` |
| Interfaces | PascalCase, no `I` prefix | `RapierContext` |
| Functions | camelCase | `createPlayerEntity()` |
| Constants | UPPER_SNAKE_CASE | `MAX_DT` |
| Types | PascalCase | `GameEvent` |
| Test files | `*.spec.ts` | `weapon-system.spec.ts` |

---

## 8. Testing Standards (Required)

**Every feature must include tests. Tests are part of the deliverable — not optional.**

### Unit Tests

- Every new function, system, or module gets a unit test using **vitest**
- Co-locate: `foo.spec.ts` next to `foo.ts`
- Test edge cases, not just the happy path
- Descriptive names: `"applies armor reduction before health damage"` not `"test_damage"`
- **Fakes over mocks.** Prefer in-memory ECS test fixtures over mocking.

### Test Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { createWorld, addEntity } from 'bitecs';
import { Position, Velocity } from '../ecs/Components';
import { MovementSystem } from './MovementSystem';

describe('MovementSystem', () => {
  it('applies velocity to position each frame', () => {
    const world = createWorld();
    const eid = addEntity(world);
    addComponent(world, Position, eid);
    addComponent(world, Velocity, eid);
    Position.x[eid] = 0;
    Velocity.dx[eid] = 100;
    
    MovementSystem(world, 1/60);
    
    expect(Position.x[eid]).toBeCloseTo(100/60);
  });
});
```

### Playwright UI Tests

For visual/UI changes:
```bash
# Run smoke tests
npx playwright test --project=system-chromium

# Run all UI tests
npx playwright test --project=system-chromium tests/
```

### Verification Before Posting for Review

Always run the full suite:
```bash
npx tsc --noEmit
npm run build
npx vitest run          # unit/integration tests
npx playwright test --project=system-chromium   # UI tests
```

### Coverage Threshold

Aim for 80%+ coverage on new code. Configuration, constants, and type definitions are exempt.

---

## 9. Version Control

```
<type>(<scope>): <description>

Types: feat, fix, refactor, docs, test, chore
Scopes: systems, weapons, physics, editor, hud, events, ecs, infra
```

- `main` is deployable at all times
- Commits after each working unit (no "WIP" commits)
- Each commit for review is a coherent change

---

## 10. What This Prevents

| Rule | Prevents |
|------|----------|
| Max ~150 lines/file | Bloated single-file systems |
| No barrel files | Import cycles and entanglement |
| No global singletons | Untestable code, hidden coupling |
| Game state in ECS only | Logic in render callbacks |
| Tests required per feature | Untestable, untested code |
| One system = one file | Death-by-a-thousand-conditionals |
| Pipeline ordering enforced | Systems running in wrong order |
| Constructor/factory injection | `new Foo()` buried in methods |
| Event bus for cross-cutting | Direct imports creating cycles |
| Fakes over mocks | Brittle tests that fail on refactor |
