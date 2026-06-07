# Doomlike FPS

A modern-retro first-person shooter — plays like Doom (fast movement, sprite enemies, satisfying weapons, sector-based levels) but rendered with modern 3D techniques using Three.js. Built with TypeScript, bitecs ECS, and Rapier physics.

---

## Current Status

### ✅ Completed

| Phase | What | Key Files |
|-------|------|-----------|
| **1. Core Loop** | Project scaffold, ECS world, InputManager, input/movement systems, game loop, first-person camera, hardcoded sector rendering | `Game.ts`, `Renderer.ts`, `InputSystem.ts`, `MovementSystem.ts`, `InputManager.ts` |
| **2. Physics & Collision** | Rapier integration, collision shapes, PhysicsSystem (ECS↔Rapier bridge), level loading with wall/floor colliders, ground detection, jumping, raycast helpers | `RapierWorld.ts`, `PhysicsSystem.ts`, `CollisionShapes.ts`, `LevelLoader.ts`, `queries.ts` |
| **3. Weapons & HUD** | WeaponSystem (pistol, shotgun, chaingun, rocket launcher), hitscan + projectile weapons, damage/death pipeline, HUD (health, ammo, weapon name, face, damage flash), weapon bobbing, game events system | `WeaponSystem.ts`, `weaponFire.ts`, `DamageSystem.ts`, `DeathSystem.ts`, `ProjectileSystem.ts`, `UISystem.ts`, `WeaponBobSystem.ts`, `GameEvents.ts` |
| **4. Map Editor** | 2D canvas sector editor, properties panel, asset browser, save/load JSON, undo/redo | `src/editor/*` |

### 🔄 In Progress

| Phase | What | Status |
|-------|------|--------|
| **5. Enemies** | Enemy AI state machine, enemy types (imp, demon), enemy sprites, line-of-sight detection, combat interactions | Mid-implementation on `phase5-fix` branch |

### 📋 Planned

| Phase | What |
|-------|------|
| **6. Polish** | Particle effects, audio system, screen shake, secret detection, doors, menus, weapon pickup, level transitions |
| **7. Content** | More enemy types, more weapons, textures, level design, balance tuning |

---

## Tech Stack

| Concern | Choice |
|---------|--------|
| Rendering | Three.js |
| ECS | bitecs |
| Physics | Rapier (WASM) |
| Bundler | Vite |
| Language | TypeScript (strict) |
| Testing | vitest (unit), Playwright (UI) |
| Package manager | npm |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# Opens at http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

```bash
# Unit tests (vitest)
npx vitest run

# UI tests (Playwright — requires preview server running)
npx playwright test --project=system-chromium
```

### Architecture Reference

See `ARCHITECTURE.md` for the full game architecture spec, component types, system pipeline, level format, and development guide.

### Agent Development

See `AGENTS.md` for coding standards, testing requirements, and Den MCP integration guide for coding agents.

---

## Map Editor

A standalone level editor is available at `/editor.html` in the built app:

- Draw sectors by placing wall vertices on a 2D canvas
- Set floor/ceiling heights and textures
- Place things (player start, enemies, pickups, weapons)
- Save/load level JSON files
- Undo/redo support

---

## Project Structure

```
doomlike-ts/
├── index.html              — Entry point
├── src/
│   ├── main.ts             — Bootstrap
│   ├── Game.ts             — Game loop + pipeline
│   ├── ecs/                — ECS foundation
│   ├── systems/            — Game systems (one per file)
│   ├── renderer/           — Three.js rendering
│   ├── physics/            — Rapier physics
│   ├── input/              — Input management
│   ├── level/              — Level loading + types
│   ├── events/             — Game events
│   ├── weapons/            — Weapon data + fire logic
│   ├── editor/             — Map editor
│   └── tests/              — Playwright UI tests
```
