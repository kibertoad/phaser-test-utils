import { describe, it, expect, afterEach } from "vitest";
import * as Phaser from "phaser";
import {
    createTestGame,
    step,
    simulateClick,
    simulatePointerMove,
    simulateKeyDown,
    simulateKeyUp,
    simulateKeyPress,
} from "../src/index.js";

describe("pointer simulation", () => {
    let destroy: (() => void) | undefined;

    afterEach(() => {
        destroy?.();
        destroy = undefined;
    });

    it("simulateClick triggers pointerdown and pointerup on interactive object", async () => {
        let downFired = false;
        let upFired = false;

        const handle = await createTestGame({
            scene: {
                key: "click-test",
                create(this: Phaser.Scene) {
                    const rect = this.add.rectangle(100, 100, 80, 80, 0xff0000);
                    rect.setInteractive();
                    rect.on("pointerdown", () => {
                        downFired = true;
                    });
                    rect.on("pointerup", () => {
                        upFired = true;
                    });
                },
            },
        });
        destroy = handle.destroy;

        // Step once to process the input system's pending interactive object registrations
        step(handle.game);

        const rect = handle.scene.children.list[0] as Phaser.GameObjects.Rectangle;
        simulateClick(handle.game, rect as any);
        step(handle.game);

        expect(downFired).toBe(true);
        expect(upFired).toBe(true);
    });

    it("simulatePointerMove updates pointer position", async () => {
        const handle = await createTestGame({
            scene: {
                key: "move-test",
                create() {},
            },
        });
        destroy = handle.destroy;

        simulatePointerMove(handle.game, 200, 150);

        const pointer = (handle.game as any).input.mousePointer;
        expect(pointer.position.x).toBe(200);
        expect(pointer.position.y).toBe(150);
    });
});

describe("keyboard simulation", () => {
    let destroy: (() => void) | undefined;

    afterEach(() => {
        destroy?.();
        destroy = undefined;
    });

    it("simulateKeyDown pushes event to keyboard queue", async () => {
        const handle = await createTestGame({
            scene: {
                key: "key-test",
                create() {},
            },
        });
        destroy = handle.destroy;

        const keyboardManager = (handle.game as any).input.keyboard;
        const initialQueueLength = keyboardManager.queue.length;

        simulateKeyDown(handle.game, Phaser.Input.Keyboard.KeyCodes.SPACE);

        expect(keyboardManager.queue.length).toBeGreaterThan(initialQueueLength);
        expect(keyboardManager.queue[keyboardManager.queue.length - 1].type).toBe("keydown");
        expect(keyboardManager.queue[keyboardManager.queue.length - 1].keyCode).toBe(
            Phaser.Input.Keyboard.KeyCodes.SPACE,
        );
    });

    it("simulateKeyUp pushes keyup event to keyboard queue", async () => {
        const handle = await createTestGame({
            scene: {
                key: "keyup-test",
                create() {},
            },
        });
        destroy = handle.destroy;

        simulateKeyUp(handle.game, Phaser.Input.Keyboard.KeyCodes.ENTER);

        const keyboardManager = (handle.game as any).input.keyboard;
        const lastEvent = keyboardManager.queue[keyboardManager.queue.length - 1];
        expect(lastEvent.type).toBe("keyup");
        expect(lastEvent.keyCode).toBe(Phaser.Input.Keyboard.KeyCodes.ENTER);
    });

    it("simulateKeyPress pushes both keydown and keyup", async () => {
        const handle = await createTestGame({
            scene: {
                key: "keypress-test",
                create() {},
            },
        });
        destroy = handle.destroy;

        const keyboardManager = (handle.game as any).input.keyboard;
        const before = keyboardManager.queue.length;

        simulateKeyPress(handle.game, Phaser.Input.Keyboard.KeyCodes.A);

        expect(keyboardManager.queue.length).toBe(before + 2);
        expect(keyboardManager.queue[before].type).toBe("keydown");
        expect(keyboardManager.queue[before + 1].type).toBe("keyup");
    });
});
