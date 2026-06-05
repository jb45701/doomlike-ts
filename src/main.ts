import { createGame } from './Game';
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Missing #game-canvas element');
const game = createGame(canvas);
game.start();
