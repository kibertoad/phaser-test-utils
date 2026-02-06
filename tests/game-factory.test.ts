import { describe, it, expect, afterEach } from "vitest";
import * as Phaser from "phaser";
import { createTestGame, step } from "../src/index.js";

describe("createTestGame", () => {
    let destroy: (() => void) | undefined;

    afterEach(() => {
        destroy?.();
        destroy = undefined;
    });

    it("boots a headless game and resolves with scene", async () => {
        class TestScene extends Phaser.Scene {
            constructor() {
                super({ key: "test" });
            }
            create() {
                // Scene is ready
            }
        }

        const handle = await createTestGame({ scene: TestScene });
        destroy = handle.destroy;

        expect(handle.game).toBeInstanceOf(Phaser.Game);
        expect(handle.scene).toBeInstanceOf(Phaser.Scene);
        expect(handle.game.config.renderType).toBe(Phaser.HEADLESS);
    });

    it("accepts a scene config object", async () => {
        let createCalled = false;

        const handle = await createTestGame({
            scene: {
                key: "config-test",
                create() {
                    createCalled = true;
                },
            },
        });
        destroy = handle.destroy;

        expect(createCalled).toBe(true);
    });

    it("accepts custom width/height", async () => {
        const handle = await createTestGame({
            width: 1024,
            height: 768,
            scene: { key: "size-test" },
        });
        destroy = handle.destroy;

        expect(handle.game.config.width).toBe(1024);
        expect(handle.game.config.height).toBe(768);
    });
});

describe("step", () => {
    let destroy: (() => void) | undefined;

    afterEach(() => {
        destroy?.();
        destroy = undefined;
    });

    it("advances the game loop", async () => {
        let updateCount = 0;

        const handle = await createTestGame({
            scene: {
                key: "step-test",
                update() {
                    updateCount++;
                },
            },
        });
        destroy = handle.destroy;

        expect(updateCount).toBe(0);

        step(handle.game);
        expect(updateCount).toBe(1);

        step(handle.game, 5);
        expect(updateCount).toBe(6);
    });
});
