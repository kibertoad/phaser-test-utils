import * as Phaser from "phaser";

const DEFAULT_DELTA_MS = 1000 / 60; // ~16.67ms for 60fps

/**
 * Advance the game loop by one or more frames.
 *
 * Since the auto-loop is stopped by `createTestGame`, this is the
 * only way to progress the game. Each call runs one full headless
 * step (PRE_STEP -> STEP -> scene.update -> POST_STEP -> PRE_RENDER -> POST_RENDER).
 *
 * @param game - The Phaser.Game instance.
 * @param frames - Number of frames to step. Default: 1.
 * @param deltaMs - Delta time per frame in milliseconds. Default: ~16.67ms (60fps).
 */
export function step(
    game: Phaser.Game,
    frames: number = 1,
    deltaMs: number = DEFAULT_DELTA_MS,
): void {
    // Track cumulative time starting from a base
    let time = game.loop.now || 0;

    for (let i = 0; i < frames; i++) {
        time += deltaMs;
        game.headlessStep(time, deltaMs);
    }
}
