import * as Phaser from "phaser";

/**
 * Create a minimal synthetic keyboard event that satisfies Phaser's KeyboardManager.
 */
function createSyntheticKeyboardEvent(type: "keydown" | "keyup", keyCode: number): any {
    return {
        type,
        keyCode,
        key: String.fromCharCode(keyCode),
        code: `Key${String.fromCharCode(keyCode)}`,
        altKey: false,
        ctrlKey: false,
        shiftKey: false,
        metaKey: false,
        location: 0,
        repeat: false,
        timeStamp: performance.now(),
        defaultPrevented: false,
        preventDefault: () => {},
        stopPropagation: () => {},
        // Phaser checks for cancelled property (set by internal event system)
        cancelled: undefined,
    };
}

/**
 * Simulate a key-down event.
 *
 * Pushes a synthetic KeyboardEvent into the keyboard manager's queue
 * and triggers processing. The event will be picked up on the next
 * `step()` call when the keyboard plugin processes its queue.
 *
 * @param game - The Phaser.Game instance.
 * @param keyCode - The key code (e.g., `Phaser.Input.Keyboard.KeyCodes.SPACE`).
 */
export function simulateKeyDown(game: Phaser.Game, keyCode: number): void {
    const inputManager = (game as any).input;
    if (!inputManager) return;

    const keyboardManager = inputManager.keyboard;
    if (!keyboardManager) return;

    const event = createSyntheticKeyboardEvent("keydown", keyCode);
    keyboardManager.queue.push(event);
    inputManager.events.emit("process");
}

/**
 * Simulate a key-up event.
 *
 * @param game - The Phaser.Game instance.
 * @param keyCode - The key code (e.g., `Phaser.Input.Keyboard.KeyCodes.SPACE`).
 */
export function simulateKeyUp(game: Phaser.Game, keyCode: number): void {
    const inputManager = (game as any).input;
    if (!inputManager) return;

    const keyboardManager = inputManager.keyboard;
    if (!keyboardManager) return;

    const event = createSyntheticKeyboardEvent("keyup", keyCode);
    keyboardManager.queue.push(event);
    inputManager.events.emit("process");
}

/**
 * Simulate a full key press (key-down followed by key-up).
 *
 * @param game - The Phaser.Game instance.
 * @param keyCode - The key code.
 */
export function simulateKeyPress(game: Phaser.Game, keyCode: number): void {
    simulateKeyDown(game, keyCode);
    simulateKeyUp(game, keyCode);
}
