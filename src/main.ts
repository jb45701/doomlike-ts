/**
 * main.ts — Game bootstrap entry point.
 *
 * Creates the Game instance and starts the loop.
 * All Three.js rendering, ECS world, and system pipeline logic
 * lives in src/Game.ts and src/renderer/Renderer.ts.
 */
import { createGame } from './Game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Game canvas element #game-canvas not found in the DOM.');
}

const game = createGame(canvas);
game.start();
