import { describe, it, expect, afterEach } from "vitest";
import * as Phaser from "phaser";
import {
    createTestGame,
    expectNoOverlap,
    expectNoOverlaps,
    expectContainedIn,
    expectAllContainedIn,
    expectAligned,
    expectMinGap,
    expectAbove,
    expectLeftOf,
    expectValidLayout,
} from "../src/index.js";

describe("layout assertions", () => {
    let destroy: (() => void) | undefined;

    afterEach(() => {
        destroy?.();
        destroy = undefined;
    });

    it("expectNoOverlap passes for non-overlapping objects", async () => {
        let a: Phaser.GameObjects.Rectangle;
        let b: Phaser.GameObjects.Rectangle;

        const handle = await createTestGame({
            scene: {
                key: "no-overlap-pass",
                create(this: Phaser.Scene) {
                    // Two rectangles side by side (origin 0.5,0.5 by default)
                    a = this.add.rectangle(50, 50, 40, 40); // left: 30, right: 70
                    b = this.add.rectangle(150, 50, 40, 40); // left: 130, right: 170
                },
            },
        });
        destroy = handle.destroy;

        // Should not throw
        expectNoOverlap(a!, b!);
    });

    it("expectNoOverlap fails for overlapping objects", async () => {
        let a: Phaser.GameObjects.Rectangle;
        let b: Phaser.GameObjects.Rectangle;

        const handle = await createTestGame({
            scene: {
                key: "no-overlap-fail",
                create(this: Phaser.Scene) {
                    a = this.add.rectangle(50, 50, 40, 40); // left: 30, right: 70
                    b = this.add.rectangle(60, 50, 40, 40); // left: 40, right: 80
                },
            },
        });
        destroy = handle.destroy;

        expect(() => expectNoOverlap(a!, b!)).toThrow("expectNoOverlap failed");
    });

    it("expectNoOverlaps checks all pairs", async () => {
        let objects: Phaser.GameObjects.Rectangle[];

        const handle = await createTestGame({
            scene: {
                key: "no-overlaps",
                create(this: Phaser.Scene) {
                    objects = [
                        this.add.rectangle(50, 50, 40, 40),
                        this.add.rectangle(150, 50, 40, 40),
                        this.add.rectangle(250, 50, 40, 40),
                    ];
                },
            },
        });
        destroy = handle.destroy;

        // Should not throw - all well-separated
        expectNoOverlaps(objects!);
    });

    it("expectContainedIn passes when child is inside parent", async () => {
        let child: Phaser.GameObjects.Rectangle;
        const parentRect = new Phaser.Geom.Rectangle(0, 0, 400, 300);

        const handle = await createTestGame({
            scene: {
                key: "contained-pass",
                create(this: Phaser.Scene) {
                    child = this.add.rectangle(200, 150, 100, 50);
                },
            },
        });
        destroy = handle.destroy;

        expectContainedIn(child!, parentRect);
    });

    it("expectContainedIn fails when child overflows parent", async () => {
        let child: Phaser.GameObjects.Rectangle;
        const parentRect = new Phaser.Geom.Rectangle(0, 0, 100, 100);

        const handle = await createTestGame({
            scene: {
                key: "contained-fail",
                create(this: Phaser.Scene) {
                    // This rectangle will extend beyond the 100x100 parent
                    child = this.add.rectangle(90, 50, 60, 40); // right: 120 > 100
                },
            },
        });
        destroy = handle.destroy;

        expect(() => expectContainedIn(child!, parentRect)).toThrow("expectContainedIn failed");
    });

    it("expectAllContainedIn checks all children", async () => {
        let children: Phaser.GameObjects.Rectangle[];
        const parentRect = new Phaser.Geom.Rectangle(0, 0, 400, 300);

        const handle = await createTestGame({
            scene: {
                key: "all-contained",
                create(this: Phaser.Scene) {
                    children = [
                        this.add.rectangle(100, 100, 50, 50),
                        this.add.rectangle(200, 100, 50, 50),
                        this.add.rectangle(300, 200, 50, 50),
                    ];
                },
            },
        });
        destroy = handle.destroy;

        expectAllContainedIn(children!, parentRect);
    });

    it("expectAligned passes for center-aligned objects", async () => {
        let a: Phaser.GameObjects.Rectangle;
        let b: Phaser.GameObjects.Rectangle;

        const handle = await createTestGame({
            scene: {
                key: "aligned-pass",
                create(this: Phaser.Scene) {
                    a = this.add.rectangle(100, 200, 80, 40);
                    b = this.add.rectangle(300, 200, 120, 60);
                },
            },
        });
        destroy = handle.destroy;

        // Both have centerY = 200
        expectAligned(a!, b!, "centerY");
    });

    it("expectAligned fails when misaligned", async () => {
        let a: Phaser.GameObjects.Rectangle;
        let b: Phaser.GameObjects.Rectangle;

        const handle = await createTestGame({
            scene: {
                key: "aligned-fail",
                create(this: Phaser.Scene) {
                    a = this.add.rectangle(100, 200, 80, 40);
                    b = this.add.rectangle(300, 220, 120, 60);
                },
            },
        });
        destroy = handle.destroy;

        expect(() => expectAligned(a!, b!, "centerY", 1)).toThrow("expectAligned");
    });

    it("expectMinGap passes when gap is sufficient", async () => {
        let a: Phaser.GameObjects.Rectangle;
        let b: Phaser.GameObjects.Rectangle;

        const handle = await createTestGame({
            scene: {
                key: "gap-pass",
                create(this: Phaser.Scene) {
                    a = this.add.rectangle(50, 50, 40, 40); // right: 70
                    b = this.add.rectangle(150, 50, 40, 40); // left: 130
                },
            },
        });
        destroy = handle.destroy;

        // Gap is 60px
        expectMinGap(a!, b!, 50);
    });

    it("expectMinGap fails when gap is insufficient", async () => {
        let a: Phaser.GameObjects.Rectangle;
        let b: Phaser.GameObjects.Rectangle;

        const handle = await createTestGame({
            scene: {
                key: "gap-fail",
                create(this: Phaser.Scene) {
                    a = this.add.rectangle(50, 50, 40, 40);
                    b = this.add.rectangle(80, 50, 40, 40);
                },
            },
        });
        destroy = handle.destroy;

        expect(() => expectMinGap(a!, b!, 20)).toThrow("expectMinGap failed");
    });

    it("expectAbove passes when upper is above lower", async () => {
        let upper: Phaser.GameObjects.Rectangle;
        let lower: Phaser.GameObjects.Rectangle;

        const handle = await createTestGame({
            scene: {
                key: "above-pass",
                create(this: Phaser.Scene) {
                    upper = this.add.rectangle(100, 50, 80, 40); // bottom: 70
                    lower = this.add.rectangle(100, 150, 80, 40); // top: 130
                },
            },
        });
        destroy = handle.destroy;

        expectAbove(upper!, lower!);
    });

    it("expectAbove fails when upper overlaps lower vertically", async () => {
        let upper: Phaser.GameObjects.Rectangle;
        let lower: Phaser.GameObjects.Rectangle;

        const handle = await createTestGame({
            scene: {
                key: "above-fail",
                create(this: Phaser.Scene) {
                    upper = this.add.rectangle(100, 50, 80, 80); // bottom: 90
                    lower = this.add.rectangle(100, 80, 80, 40); // top: 60
                },
            },
        });
        destroy = handle.destroy;

        expect(() => expectAbove(upper!, lower!)).toThrow("expectAbove failed");
    });

    it("expectLeftOf passes when left is left of right", async () => {
        let left: Phaser.GameObjects.Rectangle;
        let right: Phaser.GameObjects.Rectangle;

        const handle = await createTestGame({
            scene: {
                key: "leftof-pass",
                create(this: Phaser.Scene) {
                    left = this.add.rectangle(50, 100, 40, 40); // right: 70
                    right = this.add.rectangle(150, 100, 40, 40); // left: 130
                },
            },
        });
        destroy = handle.destroy;

        expectLeftOf(left!, right!);
    });

    it("expectValidLayout checks both containment and overlap", async () => {
        let children: Phaser.GameObjects.Rectangle[];
        const parentRect = new Phaser.Geom.Rectangle(0, 0, 400, 300);

        const handle = await createTestGame({
            scene: {
                key: "valid-layout",
                create(this: Phaser.Scene) {
                    children = [
                        this.add.rectangle(100, 100, 50, 50),
                        this.add.rectangle(200, 100, 50, 50),
                        this.add.rectangle(300, 200, 50, 50),
                    ];
                },
            },
        });
        destroy = handle.destroy;

        // All within 400x300, no overlaps
        expectValidLayout(children!, parentRect);
    });
});

describe("vitest custom matchers", () => {
    let destroy: (() => void) | undefined;

    afterEach(() => {
        destroy?.();
        destroy = undefined;
    });

    it("toOverlapWith matcher works", async () => {
        let a: Phaser.GameObjects.Rectangle;
        let b: Phaser.GameObjects.Rectangle;
        let c: Phaser.GameObjects.Rectangle;

        const handle = await createTestGame({
            scene: {
                key: "matcher-overlap",
                create(this: Phaser.Scene) {
                    a = this.add.rectangle(50, 50, 40, 40);
                    b = this.add.rectangle(60, 50, 40, 40); // overlaps a
                    c = this.add.rectangle(200, 50, 40, 40); // does not overlap a
                },
            },
        });
        destroy = handle.destroy;

        expect(a!).toOverlapWith(b!);
        expect(a!).not.toOverlapWith(c!);
    });

    it("toBeContainedIn matcher works", async () => {
        let child: Phaser.GameObjects.Rectangle;
        const parentRect = new Phaser.Geom.Rectangle(0, 0, 400, 300);
        const smallRect = new Phaser.Geom.Rectangle(0, 0, 10, 10);

        const handle = await createTestGame({
            scene: {
                key: "matcher-contained",
                create(this: Phaser.Scene) {
                    child = this.add.rectangle(200, 150, 100, 50);
                },
            },
        });
        destroy = handle.destroy;

        expect(child!).toBeContainedIn(parentRect);
        expect(child!).not.toBeContainedIn(smallRect);
    });

    it("toBeAbove matcher works", async () => {
        let upper: Phaser.GameObjects.Rectangle;
        let lower: Phaser.GameObjects.Rectangle;

        const handle = await createTestGame({
            scene: {
                key: "matcher-above",
                create(this: Phaser.Scene) {
                    upper = this.add.rectangle(100, 50, 80, 40);
                    lower = this.add.rectangle(100, 150, 80, 40);
                },
            },
        });
        destroy = handle.destroy;

        expect(upper!).toBeAbove(lower!);
        expect(lower!).not.toBeAbove(upper!);
    });

    it("toBeLeftOf matcher works", async () => {
        let left: Phaser.GameObjects.Rectangle;
        let right: Phaser.GameObjects.Rectangle;

        const handle = await createTestGame({
            scene: {
                key: "matcher-leftof",
                create(this: Phaser.Scene) {
                    left = this.add.rectangle(50, 100, 40, 40);
                    right = this.add.rectangle(150, 100, 40, 40);
                },
            },
        });
        destroy = handle.destroy;

        expect(left!).toBeLeftOf(right!);
        expect(right!).not.toBeLeftOf(left!);
    });

    it("toBeAlignedWith matcher works", async () => {
        let a: Phaser.GameObjects.Rectangle;
        let b: Phaser.GameObjects.Rectangle;

        const handle = await createTestGame({
            scene: {
                key: "matcher-aligned",
                create(this: Phaser.Scene) {
                    a = this.add.rectangle(100, 200, 80, 40);
                    b = this.add.rectangle(300, 200, 120, 60);
                },
            },
        });
        destroy = handle.destroy;

        expect(a!).toBeAlignedWith(b!, "centerY");
    });
});
