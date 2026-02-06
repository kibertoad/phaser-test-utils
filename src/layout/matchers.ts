import * as Phaser from "phaser";
import { expect } from "vitest";
import { resolveBounds, getObjectName, formatRect } from "../utils/bounds.js";
import { formatOverlapDebug, formatContainmentDebug } from "./debug.js";
import type { AlignmentAxis } from "./assertions.js";

type GameObject = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.GetBounds;
type Rectangle = Phaser.Geom.Rectangle;
type BoundsLike = GameObject | Rectangle;

/**
 * Custom vitest matchers for Phaser layout assertions.
 *
 * Call `setupLayoutMatchers()` in your vitest setup file or at the
 * top of your test to register these matchers.
 *
 * @example
 * ```ts
 * // vitest.setup.ts
 * import { setupLayoutMatchers } from 'phaser-test-utils';
 * setupLayoutMatchers();
 *
 * // test file
 * expect(buttonA).not.toOverlapWith(buttonB);
 * expect(label).toBeContainedIn(panel);
 * expect(title).toBeAbove(subtitle);
 * expect(save).toBeLeftOf(cancel);
 * expect(a).toBeAlignedWith(b, 'centerY');
 * ```
 */
export function setupLayoutMatchers(): void {
    expect.extend({
        toOverlapWith(received: BoundsLike, other: BoundsLike) {
            const boundsA = resolveBounds(received);
            const boundsB = resolveBounds(other);
            const overlaps = Phaser.Geom.Rectangle.Overlaps(boundsA, boundsB);

            const nameA = getObjectName(received);
            const nameB = getObjectName(other);

            if (overlaps) {
                const intersection = Phaser.Geom.Rectangle.Intersection(boundsA, boundsB);
                return {
                    pass: true,
                    message: () =>
                        `expected "${nameA}" NOT to overlap with "${nameB}"\n` +
                        `  "${nameA}": ${formatRect(boundsA)}\n` +
                        `  "${nameB}": ${formatRect(boundsB)}\n` +
                        `  Overlap: ${formatRect(intersection)}\n\n` +
                        formatOverlapDebug(nameA, boundsA, nameB, boundsB, intersection),
                };
            }

            return {
                pass: false,
                message: () =>
                    `expected "${nameA}" to overlap with "${nameB}"\n` +
                    `  "${nameA}": ${formatRect(boundsA)}\n` +
                    `  "${nameB}": ${formatRect(boundsB)}`,
            };
        },

        toBeContainedIn(received: BoundsLike, parent: BoundsLike) {
            const childBounds = resolveBounds(received);
            const parentBounds = resolveBounds(parent);

            const contained =
                childBounds.x >= parentBounds.x &&
                childBounds.y >= parentBounds.y &&
                childBounds.right <= parentBounds.right &&
                childBounds.bottom <= parentBounds.bottom;

            const childName = getObjectName(received);
            const parentName = getObjectName(parent);

            return {
                pass: contained,
                message: () =>
                    contained
                        ? `expected "${childName}" NOT to be contained in "${parentName}"\n` +
                          `  Child: ${formatRect(childBounds)}\n` +
                          `  Parent: ${formatRect(parentBounds)}`
                        : `expected "${childName}" to be contained in "${parentName}"\n` +
                          `  Child: ${formatRect(childBounds)}\n` +
                          `  Parent: ${formatRect(parentBounds)}\n` +
                          formatContainmentDebug(childName, childBounds, parentName, parentBounds),
            };
        },

        toBeAbove(received: BoundsLike, other: BoundsLike) {
            const upperBounds = resolveBounds(received);
            const lowerBounds = resolveBounds(other);
            const isAbove = upperBounds.bottom <= lowerBounds.y;

            const upperName = getObjectName(received);
            const lowerName = getObjectName(other);

            return {
                pass: isAbove,
                message: () =>
                    isAbove
                        ? `expected "${upperName}" NOT to be above "${lowerName}"\n` +
                          `  "${upperName}" bottom: ${upperBounds.bottom}\n` +
                          `  "${lowerName}" top: ${lowerBounds.y}`
                        : `expected "${upperName}" to be above "${lowerName}"\n` +
                          `  "${upperName}" bottom: ${upperBounds.bottom}\n` +
                          `  "${lowerName}" top: ${lowerBounds.y}\n` +
                          `  Overlap: ${upperBounds.bottom - lowerBounds.y}px`,
            };
        },

        toBeLeftOf(received: BoundsLike, other: BoundsLike) {
            const leftBounds = resolveBounds(received);
            const rightBounds = resolveBounds(other);
            const isLeft = leftBounds.right <= rightBounds.x;

            const leftName = getObjectName(received);
            const rightName = getObjectName(other);

            return {
                pass: isLeft,
                message: () =>
                    isLeft
                        ? `expected "${leftName}" NOT to be left of "${rightName}"\n` +
                          `  "${leftName}" right: ${leftBounds.right}\n` +
                          `  "${rightName}" left: ${rightBounds.x}`
                        : `expected "${leftName}" to be left of "${rightName}"\n` +
                          `  "${leftName}" right: ${leftBounds.right}\n` +
                          `  "${rightName}" left: ${rightBounds.x}\n` +
                          `  Overlap: ${leftBounds.right - rightBounds.x}px`,
            };
        },

        toBeAlignedWith(
            received: BoundsLike,
            other: BoundsLike,
            axis: AlignmentAxis,
            tolerance: number = 1,
        ) {
            const boundsA = resolveBounds(received);
            const boundsB = resolveBounds(other);

            const valueA = getAxisValue(boundsA, axis);
            const valueB = getAxisValue(boundsB, axis);
            const diff = Math.abs(valueA - valueB);
            const aligned = diff <= tolerance;

            const nameA = getObjectName(received);
            const nameB = getObjectName(other);

            return {
                pass: aligned,
                message: () =>
                    aligned
                        ? `expected "${nameA}" NOT to be aligned with "${nameB}" on ${axis}\n` +
                          `  "${nameA}" ${axis}: ${valueA}\n` +
                          `  "${nameB}" ${axis}: ${valueB}`
                        : `expected "${nameA}" to be aligned with "${nameB}" on ${axis}\n` +
                          `  "${nameA}" ${axis}: ${valueA}\n` +
                          `  "${nameB}" ${axis}: ${valueB}\n` +
                          `  Difference: ${diff}px (tolerance: ${tolerance}px)`,
            };
        },
    });
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

// Type augmentation for vitest
declare module "vitest" {
    // oxlint-disable-next-line no-unused-vars
    interface Assertion<T> {
        toOverlapWith(other: BoundsLike): void;
        toBeContainedIn(parent: BoundsLike): void;
        toBeAbove(other: BoundsLike): void;
        toBeLeftOf(other: BoundsLike): void;
        toBeAlignedWith(other: BoundsLike, axis: AlignmentAxis, tolerance?: number): void;
    }
    interface AsymmetricMatchersContaining {
        toOverlapWith(other: BoundsLike): void;
        toBeContainedIn(parent: BoundsLike): void;
        toBeAbove(other: BoundsLike): void;
        toBeLeftOf(other: BoundsLike): void;
        toBeAlignedWith(other: BoundsLike, axis: AlignmentAxis, tolerance?: number): void;
    }
}
