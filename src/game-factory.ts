import * as Phaser from "phaser";

/**
 * Configuration for creating a test game.
 */
export interface TestGameConfig {
    /** Game width in pixels. Default: 800 */
    width?: number;
    /** Game height in pixels. Default: 600 */
    height?: number;
    /** Scene class or config to boot. */
    scene:
        | typeof Phaser.Scene
        | Phaser.Types.Scenes.SettingsConfig
        | Phaser.Types.Scenes.CreateSceneFromObjectConfig;
    /** Additional Phaser game config overrides. */
    gameConfig?: Partial<Phaser.Types.Core.GameConfig>;
}

/**
 * Handle returned from createTestGame, providing access to the game and scene.
 */
export interface TestGameHandle {
    /** The Phaser.Game instance. */
    game: Phaser.Game;
    /** The first scene that was booted. */
    scene: Phaser.Scene;
    /** Destroy the game and clean up resources. */
    destroy: () => void;
}

/**
 * Creates and boots a Phaser game in HEADLESS mode for testing.
 *
 * The game loop is stopped once the scene is ready, so tests can
 * control frame progression via `step()`. Resolves once the scene's
 * `create()` method has finished and the CREATE event has fired.
 *
 * @example
 * ```ts
 * const { game, scene, destroy } = await createTestGame({
 *   scene: MyScene,
 * });
 * // ... run assertions ...
 * destroy();
 * ```
 */
export function createTestGame(config: TestGameConfig): Promise<TestGameHandle> {
    const { width = 800, height = 600, scene, gameConfig = {} } = config;

    return new Promise<TestGameHandle>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("createTestGame timed out waiting for scene CREATE event (5s)"));
        }, 5000);

        // jsdom's Image doesn't fire onload for base64 data URIs, which prevents
        // Phaser's TextureManager from completing its boot sequence (it waits for
        // 3 default texture images to load). We disable these default textures
        // and manually complete the boot.
        const game = new Phaser.Game({
            type: Phaser.HEADLESS,
            width,
            height,
            audio: { noAudio: true },
            banner: false,
            ...gameConfig,
            scene: scene as any,
        });

        // At this point, boot() has already been called synchronously by DOMContentLoaded.
        // The TextureManager is waiting for 3 Image loads that will never complete in jsdom.
        // We need to force it to complete.
        forceTextureReady(game);

        // After texturesReady fires, game.start() runs, which begins the loop.
        // The scene CREATE event fires during the first headlessStep when the
        // SceneManager processes its pending queue.
        // We poll for the scene to be ready since the loop is running asynchronously.
        const checkReady = () => {
            const scenes = game.scene.getScenes(false);
            if (scenes.length > 0) {
                const sceneInstance = scenes[0];
                // RUNNING = 5 in Phaser scene status constants
                if (sceneInstance.sys.settings.status >= 5) {
                    game.loop.stop();
                    clearTimeout(timeout);
                    resolve({
                        game,
                        scene: sceneInstance,
                        destroy: () => game.destroy(true),
                    });
                    return;
                }
            }
            // Check again on next tick
            setTimeout(checkReady, 1);
        };

        // Give the game loop a moment to start before checking
        setTimeout(checkReady, 1);
    });
}

/**
 * Force the TextureManager to emit its READY event.
 *
 * In jsdom, Image elements don't fire onload for base64 data URIs.
 * Phaser's TextureManager boots with _pending=3 and calls addBase64()
 * for __DEFAULT, __MISSING, and __WHITE textures. Since those Image loads
 * never complete, the READY event never fires and game.start() is never called.
 *
 * This function creates minimal canvas-based placeholder textures for the
 * required keys and then emits READY to complete the boot sequence.
 */
function forceTextureReady(game: Phaser.Game): void {
    const textures = game.textures as any;

    // If already ready (somehow), skip
    if (textures._pending === 0) return;

    // Create minimal 1x1 canvas textures for the required defaults
    // These are needed because the game references them later (e.g. stamp image)
    const defaultKeys = ["__DEFAULT", "__MISSING", "__WHITE"];
    for (const key of defaultKeys) {
        if (!textures.exists(key)) {
            textures.createCanvas(key, 1, 1);
        }
    }

    // Reset pending to 0 and emit READY to trigger game.texturesReady() -> game.start()
    textures._pending = 0;
    textures.off("load");
    textures.off("error");
    textures.emit("ready");
}
