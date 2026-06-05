/**
 * main.ts — Game bootstrap entry point.
 *
 * Creates the Game instance (async due to Rapier WASM init) and starts the loop.
 * All Three.js rendering, ECS world, physics, and system pipeline logic
 * lives in src/Game.ts and its subsystems.
 */
import { createGame } from './Game';

async function main(): Promise<void> {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Game canvas element #game-canvas not found in the DOM.');
  }

  const game = await createGame(canvas);
  game.start();
}

main().catch((err) => {
  console.error('Failed to start game:', err);
});
