import * as Phaser from "phaser";
import { resolveBounds, getObjectName, formatRect } from "../utils/bounds.js";
import { formatOverlapDebug, formatContainmentDebug } from "./debug.js";

type GameObject = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.GetBounds;
type Rectangle = Phaser.Geom.Rectangle;
type BoundsLike = GameObject | Rectangle;

/**
 * Options for alignment axis comparison.
 */
export type AlignmentAxis = "centerX" | "centerY" | "top" | "bottom" | "left" | "right";

/**
 * Options for composite layout validation.
 */
export interface LayoutValidationOptions {
    /** Check that no children overlap each other. Default: true */
    noOverlaps?: boolean;
    /** Check that all children fit within the container bounds. Default: true */
    containChildren?: boolean;
}

/**
 * Assert that two objects do not overlap.
 *
 * Uses `Phaser.Geom.Rectangle.Overlaps()` on the world-space bounds
 * of each object.
 */
export function expectNoOverlap(a: BoundsLike, b: BoundsLike): void {
    const boundsA = resolveBounds(a);
    const boundsB = resolveBounds(b);

    if (Phaser.Geom.Rectangle.Overlaps(boundsA, boundsB)) {
        const intersection = Phaser.Geom.Rectangle.Intersection(boundsA, boundsB);
        const nameA = getObjectName(a);
        const nameB = getObjectName(b);

        throw new Error(
            `expectNoOverlap failed:\n` +
                `  "${nameA}": ${formatRect(boundsA)}\n` +
                `  "${nameB}": ${formatRect(boundsB)}\n` +
                `  Overlap region: ${formatRect(intersection)}\n\n` +
                formatOverlapDebug(nameA, boundsA, nameB, boundsB, intersection),
        );
    }
}

/**
 * Assert that no objects in the array overlap each other (pairwise check).
 */
export function expectNoOverlaps(objects: BoundsLike[]): void {
    for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
            expectNoOverlap(objects[i], objects[j]);
        }
    }
}

/**
 * Assert that `child` is fully contained within `parent`.
 *
 * Uses a direct bounds comparison (child edges within or equal to parent edges)
 * rather than `Phaser.Geom.Rectangle.ContainsRect()` which uses strict `<`/`>`
 * and thus fails when edges are exactly aligned.
 */
export function expectContainedIn(child: BoundsLike, parent: BoundsLike): void {
    const childBounds = resolveBounds(child);
    const parentBounds = resolveBounds(parent);

    const contained =
        childBounds.x >= parentBounds.x &&
        childBounds.y >= parentBounds.y &&
        childBounds.right <= parentBounds.right &&
        childBounds.bottom <= parentBounds.bottom;

    if (!contained) {
        const childName = getObjectName(child);
        const parentName = getObjectName(parent);

        throw new Error(
            `expectContainedIn failed:\n` +
                `  Child "${childName}": ${formatRect(childBounds)}\n` +
                `  Parent "${parentName}": ${formatRect(parentBounds)}\n` +
                formatContainmentDebug(childName, childBounds, parentName, parentBounds),
        );
    }
}

/**
 * Assert that all children are fully contained within the parent.
 */
export function expectAllContainedIn(children: BoundsLike[], parent: BoundsLike): void {
    for (const child of children) {
        expectContainedIn(child, parent);
    }
}

/**
 * Assert that two objects are aligned on the specified axis within a tolerance.
 *
 * @param a - First object.
 * @param b - Second object.
 * @param axis - The axis/edge to compare.
 * @param tolerance - Maximum allowed deviation in pixels. Default: 1.
 */
export function expectAligned(
    a: BoundsLike,
    b: BoundsLike,
    axis: AlignmentAxis,
    tolerance: number = 1,
): void {
    const boundsA = resolveBounds(a);
    const boundsB = resolveBounds(b);

    const valueA = getAxisValue(boundsA, axis);
    const valueB = getAxisValue(boundsB, axis);
    const diff = Math.abs(valueA - valueB);

    if (diff > tolerance) {
        const nameA = getObjectName(a);
        const nameB = getObjectName(b);

        throw new Error(
            `expectAligned("${axis}") failed:\n` +
                `  "${nameA}" ${axis}: ${valueA}\n` +
                `  "${nameB}" ${axis}: ${valueB}\n` +
                `  Difference: ${diff}px (tolerance: ${tolerance}px)`,
        );
    }
}

/**
 * Assert that there is at least `minPixels` gap between two objects.
 * Gap is measured as the shortest axis-aligned distance between the edges.
 */
export function expectMinGap(a: BoundsLike, b: BoundsLike, minPixels: number): void {
    const boundsA = resolveBounds(a);
    const boundsB = resolveBounds(b);

    // Compute gaps on each axis
    const gapRight = boundsB.x - boundsA.right; // B is to the right of A
    const gapLeft = boundsA.x - boundsB.right; // B is to the left of A
    const gapBelow = boundsB.y - boundsA.bottom; // B is below A
    const gapAbove = boundsA.y - boundsB.bottom; // B is above A

    const horizontalGap = Math.max(gapRight, gapLeft);
    const verticalGap = Math.max(gapBelow, gapAbove);
    const gap = Math.max(horizontalGap, verticalGap);

    if (gap < minPixels) {
        const nameA = getObjectName(a);
        const nameB = getObjectName(b);

        throw new Error(
            `expectMinGap failed:\n` +
                `  "${nameA}": ${formatRect(boundsA)}\n` +
                `  "${nameB}": ${formatRect(boundsB)}\n` +
                `  Actual gap: ${gap}px, required: ${minPixels}px`,
        );
    }
}

/**
 * Assert that `upper` is positioned above `lower` (upper.bottom <= lower.top).
 */
export function expectAbove(upper: BoundsLike, lower: BoundsLike): void {
    const upperBounds = resolveBounds(upper);
    const lowerBounds = resolveBounds(lower);

    if (upperBounds.bottom > lowerBounds.y) {
        const upperName = getObjectName(upper);
        const lowerName = getObjectName(lower);

        throw new Error(
            `expectAbove failed:\n` +
                `  "${upperName}" bottom: ${upperBounds.bottom}\n` +
                `  "${lowerName}" top: ${lowerBounds.y}\n` +
                `  "${upperName}" should be above "${lowerName}" but its bottom edge ` +
                `extends ${upperBounds.bottom - lowerBounds.y}px past the top of "${lowerName}"`,
        );
    }
}

/**
 * Assert that `left` is positioned to the left of `right` (left.right <= right.left).
 */
export function expectLeftOf(left: BoundsLike, right: BoundsLike): void {
    const leftBounds = resolveBounds(left);
    const rightBounds = resolveBounds(right);

    if (leftBounds.right > rightBounds.x) {
        const leftName = getObjectName(left);
        const rightName = getObjectName(right);

        throw new Error(
            `expectLeftOf failed:\n` +
                `  "${leftName}" right: ${leftBounds.right}\n` +
                `  "${rightName}" left: ${rightBounds.x}\n` +
                `  "${leftName}" should be left of "${rightName}" but its right edge ` +
                `extends ${leftBounds.right - rightBounds.x}px past the left of "${rightName}"`,
        );
    }
}

/**
 * Composite layout validation: checks overlap and containment for a group of children
 * relative to a container/parent.
 *
 * @param children - Array of child game objects.
 * @param container - The parent/container bounds.
 * @param opts - Validation options.
 */
export function expectValidLayout(
    children: BoundsLike[],
    container: BoundsLike,
    opts: LayoutValidationOptions = {},
): void {
    const { noOverlaps = true, containChildren = true } = opts;

    if (containChildren) {
        expectAllContainedIn(children, container);
    }

    if (noOverlaps) {
        expectNoOverlaps(children);
    }
}

function getAxisValue(bounds: Rectangle, axis: AlignmentAxis): number {
    switch (axis) {
        case "centerX":
            return bounds.centerX;
        case "centerY":
            return bounds.centerY;
        case "top":
            return bounds.y;
        case "bottom":
            return bounds.bottom;
        case "left":
            return bounds.x;
        case "right":
            return bounds.right;
    }
}
