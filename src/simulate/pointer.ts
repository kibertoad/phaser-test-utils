import * as Phaser from "phaser";
import { resolveBounds } from "../utils/bounds.js";

type GameObject = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.GetBounds;

// Phaser input constants
const MOUSE_DOWN = 0;
const MOUSE_MOVE = 1;
const MOUSE_UP = 2;

/**
 * Create a minimal synthetic mouse event object.
 */
function createSyntheticMouseEvent(type: string, x: number, y: number, button: number = 0): any {
    return {
        type,
        pageX: x,
        pageY: y,
        clientX: x,
        clientY: y,
        button,
        buttons: type === "mouseup" ? 0 : 1,
        target: null,
        timeStamp: performance.now(),
        altKey: false,
        ctrlKey: false,
        shiftKey: false,
        metaKey: false,
        movementX: 0,
        movementY: 0,
        preventDefault: () => {},
        stopPropagation: () => {},
    };
}

/**
 * Feed a synthetic pointer event through Phaser's input pipeline.
 *
 * In HEADLESS mode, the ScaleManager's transform functions may return
 * Infinity/NaN because there's no real canvas. We bypass transformPointer
 * and set the pointer position directly in game coordinates.
 */
function feedPointerEvent(
    game: Phaser.Game,
    type: number,
    x: number,
    y: number,
    eventType: string,
    button: number = 0,
): void {
    const inputManager = (game as any).input;
    if (!inputManager || !inputManager.mousePointer) return;

    const pointer = inputManager.mousePointer;
    const event = createSyntheticMouseEvent(eventType, x, y, button);

    if (game.canvas) {
        event.target = game.canvas;
    }

    // Bypass transformPointer (which uses ScaleManager and returns Infinity in headless)
    // and set position directly in game-space coordinates.
    const p0 = pointer.position;
    const p1 = pointer.prevPosition;

    // Store previous position
    p1.x = p0.x;
    p1.y = p0.y;

    // Set position directly (no scale transform needed for headless)
    p0.x = x;
    p0.y = y;

    // Set the required Pointer state based on event type
    pointer.event = event;
    pointer.wasTouch = false;

    if ("buttons" in event) {
        pointer.buttons = event.buttons;
    }

    switch (type) {
        case MOUSE_DOWN:
            pointer.button = event.button;
            pointer.downElement = event.target;
            if (event.button === 0) {
                pointer.primaryDown = true;
                pointer.downX = x;
                pointer.downY = y;
            }
            if (!pointer.isDown) {
                pointer.isDown = true;
                pointer.downTime = event.timeStamp;
            }
            pointer.updateMotion();
            break;

        case MOUSE_MOVE:
            pointer.moveTime = event.timeStamp;
            pointer.updateMotion();
            break;

        case MOUSE_UP:
            pointer.button = event.button;
            pointer.upElement = event.target;
            if (event.button === 0) {
                pointer.primaryDown = false;
                pointer.upX = x;
                pointer.upY = y;
            }
            if (pointer.buttons === 0) {
                pointer.isDown = false;
                pointer.upTime = event.timeStamp;
            }
            pointer.updateMotion();
            break;
    }

    inputManager.activePointer = pointer;

    // Route through the input plugin system
    inputManager.updateInputPlugins(type, inputManager.mousePointerContainer);
}

/**
 * Simulate a pointer-down event at the given coordinates.
 *
 * @param game - The Phaser.Game instance.
 * @param x - X coordinate in game space.
 * @param y - Y coordinate in game space.
 * @param button - Mouse button (0=left, 1=middle, 2=right). Default: 0.
 */
export function simulatePointerDown(
    game: Phaser.Game,
    x: number,
    y: number,
    button: number = 0,
): void {
    feedPointerEvent(game, MOUSE_DOWN, x, y, "mousedown", button);
}

/**
 * Simulate a pointer-up event at the given coordinates.
 *
 * @param game - The Phaser.Game instance.
 * @param x - X coordinate in game space.
 * @param y - Y coordinate in game space.
 * @param button - Mouse button (0=left, 1=middle, 2=right). Default: 0.
 */
export function simulatePointerUp(
    game: Phaser.Game,
    x: number,
    y: number,
    button: number = 0,
): void {
    feedPointerEvent(game, MOUSE_UP, x, y, "mouseup", button);
}

/**
 * Simulate a pointer-move event at the given coordinates.
 *
 * @param game - The Phaser.Game instance.
 * @param x - X coordinate in game space.
 * @param y - Y coordinate in game space.
 */
export function simulatePointerMove(game: Phaser.Game, x: number, y: number): void {
    feedPointerEvent(game, MOUSE_MOVE, x, y, "mousemove");
}

/**
 * Simulate a full click (pointer-down + pointer-up) on a game object.
 *
 * The click is performed at the center of the object's bounds.
 *
 * @param game - The Phaser.Game instance.
 * @param target - The game object to click on.
 */
export function simulateClick(game: Phaser.Game, target: GameObject): void {
    const bounds = resolveBounds(target);
    const cx = bounds.centerX;
    const cy = bounds.centerY;

    simulatePointerDown(game, cx, cy);
    simulatePointerUp(game, cx, cy);
}
