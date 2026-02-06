import * as Phaser from "phaser";

type GameObject = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.GetBounds;
type Rectangle = Phaser.Geom.Rectangle;

/**
 * Get the world-space AABB for a game object or return a Rectangle as-is.
 */
export function resolveBounds(obj: GameObject | Rectangle): Rectangle {
    if (obj instanceof Phaser.Geom.Rectangle) {
        return obj;
    }
    if (typeof (obj as any).getBounds === "function") {
        return (obj as any).getBounds();
    }
    throw new Error(
        `Cannot get bounds: object does not have getBounds() method. ` +
            `Got: ${(obj as any).constructor?.name ?? typeof obj}`,
    );
}

/**
 * Get a human-readable name for a game object.
 */
export function getObjectName(obj: GameObject | Rectangle): string {
    if (obj instanceof Phaser.Geom.Rectangle) {
        return `Rect(${obj.x}, ${obj.y}, ${obj.width}x${obj.height})`;
    }
    const go = obj as any;
    return go.name || go.type || go.constructor?.name || "GameObject";
}

/**
 * Format a rectangle for debug output.
 */
export function formatRect(r: Rectangle): string {
    return `{ x: ${r.x}, y: ${r.y}, w: ${r.width}, h: ${r.height}, right: ${r.right}, bottom: ${r.bottom} }`;
}
