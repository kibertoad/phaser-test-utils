# phaser-test-utils

Headless layout & UI testing framework for Phaser. Write integration tests for your Phaser game's UI layouts and interactions that run in vitest without a browser. Tested against Phaser 4 (also compatible with Phaser 3.60+).

## What it does

- Boots Phaser in HEADLESS mode inside vitest's jsdom environment
- Detects when rendered elements overlap when they shouldn't
- Detects when elements don't fit within their container/panel
- Verifies positioning, alignment, and spacing
- Simulates pointer clicks and keyboard events for interaction testing
- Provides vitest custom matchers for ergonomic test assertions
- Produces visual ASCII debug output on assertion failures

## Requirements

- **Phaser** 4.x (also works with 3.60+)
- **vitest** >= 4.0.0

## Installation

```bash
npm install --save-dev phaser-test-utils
```

## Setup

### vitest.config.ts

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    resolve: {
        alias: {
            // Phaser's main field points to source which has dev-only requires.
            // Use the pre-built ESM dist instead.
            phaser: path.resolve(__dirname, "node_modules/phaser/dist/phaser.esm.js"),
        },
    },
    test: {
        environment: "jsdom",
        setupFiles: ["phaser-test-utils/setup"],
    },
});
```

The setup file registers vitest custom matchers. If you don't want the matchers, skip the `setupFiles` entry and call `setupLayoutMatchers()` manually in your tests.

**Note:** The `jsdom` environment is required since Phaser needs DOM APIs (`document`, `window`, `Image`, `HTMLCanvasElement`, etc.) to boot.

### Monorepo / Hoisted node_modules

In monorepos where `node_modules` is hoisted to the workspace root, `path.resolve(__dirname, "node_modules/phaser/...")` won't work because phaser lives in the root `node_modules`, not the package's local one. Use `createRequire` to resolve the phaser path reliably:

```ts
import { defineConfig } from "vitest/config";
import { createRequire } from "module";
import path from "path";

const require = createRequire(import.meta.url);
const phaserDir = path.dirname(require.resolve("phaser/package.json"));

export default defineConfig({
    resolve: {
        alias: {
            phaser: path.join(phaserDir, "dist/phaser.esm.js"),
        },
    },
    test: {
        environment: "jsdom",
        setupFiles: ["phaser-test-utils/setup"],
    },
});
```

### Separate vitest config for scene tests

If your project mixes standard unit tests (node environment) with Phaser scene tests (jsdom environment), use a separate config file to avoid environment conflicts:

**vitest.scene.config.ts** — for scene tests only:
```ts
import { defineConfig } from "vitest/config";
import { createRequire } from "module";
import path from "path";

const require = createRequire(import.meta.url);
const phaserDir = path.dirname(require.resolve("phaser/package.json"));

export default defineConfig({
    resolve: {
        alias: {
            phaser: path.join(phaserDir, "dist/phaser.esm.js"),
        },
    },
    test: {
        environment: "jsdom",
        include: ["src/**/*.scene-test.ts"],
        setupFiles: ["phaser-test-utils/setup"],
        testTimeout: 15000,
        server: {
            deps: {
                inline: ["phaser", "phaser-test-utils"],
            },
        },
    },
});
```

**vitest.config.ts** — for standard unit tests (unchanged):
```ts
export default defineConfig({
    test: {
        environment: "node",
        include: ["src/**/*.test.ts"],
    },
});
```

Run them separately:
```bash
npx vitest run                                    # unit tests
npx vitest run --config vitest.scene.config.ts    # scene tests
```

**Why `server.deps.inline`?** By default, vitest may resolve Phaser via its CJS `main` entry (`src/phaser.js`) instead of the aliased ESM dist, causing `Cannot find module 'phaser3spectorjs'` errors. Inlining both `phaser` and `phaser-test-utils` ensures Vite processes them through its resolver where the alias takes effect.

### Import style

Phaser's ESM dist uses named exports. Always import as:

```ts
import * as Phaser from "phaser";
```

## Usage

### Creating a test game

```ts
import { describe, it, afterEach } from "vitest";
import * as Phaser from "phaser";
import { createTestGame, step } from "phaser-test-utils";

describe("my game", () => {
    let destroy: (() => void) | undefined;

    afterEach(() => {
        destroy?.();
        destroy = undefined;
    });

    it("creates a scene", async () => {
        const {
            game,
            scene,
            destroy: d,
        } = await createTestGame({
            width: 800, // default: 800
            height: 600, // default: 600
            scene: {
                key: "test",
                create() {
                    this.add.rectangle(100, 100, 50, 50);
                },
            },
        });
        destroy = d;

        // Scene is now ready, game loop is stopped.
        // Use step() to advance the game loop manually.
        step(game); // advance 1 frame (~16.67ms)
        step(game, 5); // advance 5 frames
        step(game, 1, 33); // advance 1 frame with custom delta (33ms)
    });
});
```

`createTestGame` returns a promise that resolves once the scene's `create()` method has finished. The game loop is automatically stopped so you control frame progression with `step()`.

### You can also pass a Scene class

```ts
class MyScene extends Phaser.Scene {
    constructor() {
        super({ key: "my-scene" });
    }
    create() {
        // ...
    }
}

const { game, scene, destroy } = await createTestGame({ scene: MyScene });
```

## Layout Assertions

### Function-based API

```ts
import {
    expectNoOverlap,
    expectNoOverlaps,
    expectContainedIn,
    expectAllContainedIn,
    expectAligned,
    expectMinGap,
    expectAbove,
    expectLeftOf,
    expectValidLayout,
} from "phaser-test-utils";
```

#### `expectNoOverlap(a, b)`

Assert that two objects do not overlap. Accepts game objects or `Phaser.Geom.Rectangle`.

```ts
const btnA = scene.add.rectangle(50, 50, 40, 40);
const btnB = scene.add.rectangle(150, 50, 40, 40);
expectNoOverlap(btnA, btnB); // passes - no overlap
```

#### `expectNoOverlaps(objects)`

Assert that no objects in the array overlap each other (pairwise O(n^2) check).

```ts
expectNoOverlaps([btnA, btnB, btnC]);
```

#### `expectContainedIn(child, parent)`

Assert that `child` is fully contained within `parent`. Accepts game objects or `Phaser.Geom.Rectangle`.

```ts
const panel = new Phaser.Geom.Rectangle(0, 0, 400, 300);
const label = scene.add.rectangle(200, 150, 100, 50);
expectContainedIn(label, panel); // passes
```

#### `expectAllContainedIn(children, parent)`

Assert all children are contained within the parent.

#### `expectAligned(a, b, axis, tolerance?)`

Assert two objects are aligned on the given axis. Default tolerance: 1px.

Axis options: `'centerX'`, `'centerY'`, `'top'`, `'bottom'`, `'left'`, `'right'`

```ts
expectAligned(title, subtitle, "centerX"); // horizontally centered
expectAligned(leftPanel, rightPanel, "top"); // tops aligned
```

#### `expectMinGap(a, b, minPixels)`

Assert minimum gap (in pixels) between two objects.

```ts
expectMinGap(header, content, 20); // at least 20px gap
```

#### `expectAbove(upper, lower)`

Assert that `upper` is positioned above `lower` (no vertical overlap).

```ts
expectAbove(title, body);
```

#### `expectLeftOf(left, right)`

Assert that `left` is positioned to the left of `right` (no horizontal overlap).

```ts
expectLeftOf(saveBtn, cancelBtn);
```

#### `expectValidLayout(children, container, opts?)`

Composite check: verifies both containment and no-overlap for a group of children within a container.

```ts
const panel = new Phaser.Geom.Rectangle(0, 0, 400, 300);
expectValidLayout([btn1, btn2, btn3], panel);
// With options:
expectValidLayout(children, panel, { noOverlaps: true, containChildren: true });
```

### Vitest Custom Matchers

When the setup file is loaded (or `setupLayoutMatchers()` is called), these matchers are available:

```ts
expect(btnA).not.toOverlapWith(btnB);
expect(label).toBeContainedIn(panel);
expect(title).toBeAbove(subtitle);
expect(saveBtn).toBeLeftOf(cancelBtn);
expect(header).toBeAlignedWith(body, "centerX");
expect(header).toBeAlignedWith(body, "left", 2); // tolerance: 2px
```

## Input Simulation

### Pointer events

```ts
import {
    simulateClick,
    simulatePointerDown,
    simulatePointerUp,
    simulatePointerMove,
} from "phaser-test-utils";

// Step first to process pending interactive object registrations
step(game);

// Click at center of a game object
simulateClick(game, button);
step(game); // process the click

// Or use individual events at specific coordinates
simulatePointerDown(game, 100, 200);
simulatePointerMove(game, 150, 200);
simulatePointerUp(game, 150, 200);
step(game);
```

**Important:** You must call `step(game)` at least once after `createTestGame` before simulating clicks on interactive objects. This step processes the input system's pending registrations from `setInteractive()`.

### Keyboard events

```ts
import { simulateKeyDown, simulateKeyUp, simulateKeyPress } from "phaser-test-utils";

// Simulate key press (down + up)
simulateKeyPress(game, Phaser.Input.Keyboard.KeyCodes.SPACE);
step(game);

// Or individual events
simulateKeyDown(game, Phaser.Input.Keyboard.KeyCodes.LEFT);
step(game);
simulateKeyUp(game, Phaser.Input.Keyboard.KeyCodes.LEFT);
step(game);
```

## Debug Output

When layout assertions fail, you get detailed error messages with visual ASCII debug:

```
expectNoOverlap failed:
  "save-btn": { x: 100, y: 200, w: 120, h: 40, right: 220, bottom: 240 }
  "cancel-btn": { x: 180, y: 210, w: 120, h: 40, right: 300, bottom: 250 }
  Overlap region: { x: 180, y: 210, w: 40, h: 30, right: 220, bottom: 240 }

  Visual:
    A = "save-btn", B = "cancel-btn", # = overlap
    |AAAAAAAAAAAA##BBBBBBBB|
    |AAAAAAAAAAAA##BBBBBBBB|
    |AAAAAAAAAAAA##BBBBBBBB|
    |            ##BBBBBBBB|
```

Containment failures show which edges overflow:

```
expectContainedIn failed:
  Child "label": { x: -10, y: 50, w: 200, h: 30, right: 190, bottom: 80 }
  Parent "panel": { x: 0, y: 0, w: 400, h: 300, right: 400, bottom: 300 }

  Overflow:
    Left: 10px past parent left edge
```

## How It Works

1. **Phaser HEADLESS mode** (`type: Phaser.HEADLESS`) skips renderer creation entirely - no WebGL or Canvas rendering. This is a built-in Phaser feature designed for unit testing.

2. **jsdom** provides the DOM APIs that Phaser needs to boot (`document`, `window`, `HTMLCanvasElement`, etc.). jsdom comes built-in with vitest's `jsdom` environment.

3. **Texture boot workaround**: jsdom's `Image` element doesn't fire `onload` for base64 data URIs. Phaser's `TextureManager` waits for 3 default textures to load before completing boot. `createTestGame` creates minimal canvas-based placeholder textures and manually completes the boot sequence.

4. **`getBounds()`** on all Phaser game objects is pure math - it computes world-space axis-aligned bounding boxes from the object's position, size, origin, scale, and rotation without needing a renderer.

5. **Pointer simulation** bypasses the `ScaleManager`'s coordinate transform (which returns Infinity in headless mode) and sets pointer position directly in game-space coordinates before routing through Phaser's input plugin system.

## API Reference

### Game lifecycle

| Function                        | Description                                                     |
| ------------------------------- | --------------------------------------------------------------- |
| `createTestGame(config)`        | Boot a headless Phaser game. Returns `{ game, scene, destroy }` |
| `step(game, frames?, deltaMs?)` | Advance the game loop by N frames                               |

### Layout assertions

| Function                                        | Description                           |
| ----------------------------------------------- | ------------------------------------- |
| `expectNoOverlap(a, b)`                         | Assert two objects don't overlap      |
| `expectNoOverlaps(objects)`                     | Assert no pairwise overlaps           |
| `expectContainedIn(child, parent)`              | Assert child fits inside parent       |
| `expectAllContainedIn(children, parent)`        | Assert all children fit inside parent |
| `expectAligned(a, b, axis, tolerance?)`         | Assert alignment on axis              |
| `expectMinGap(a, b, minPixels)`                 | Assert minimum spacing                |
| `expectAbove(upper, lower)`                     | Assert vertical ordering              |
| `expectLeftOf(left, right)`                     | Assert horizontal ordering            |
| `expectValidLayout(children, container, opts?)` | Composite containment + overlap check |
| `setupLayoutMatchers()`                         | Register vitest custom matchers       |

### Input simulation

| Function                                   | Description                    |
| ------------------------------------------ | ------------------------------ |
| `simulateClick(game, target)`              | Click at center of game object |
| `simulatePointerDown(game, x, y, button?)` | Pointer down at coordinates    |
| `simulatePointerUp(game, x, y, button?)`   | Pointer up at coordinates      |
| `simulatePointerMove(game, x, y)`          | Pointer move to coordinates    |
| `simulateKeyDown(game, keyCode)`           | Key down event                 |
| `simulateKeyUp(game, keyCode)`             | Key up event                   |
| `simulateKeyPress(game, keyCode)`          | Key down + up                  |

### Utilities

| Function             | Description                                                          |
| -------------------- | -------------------------------------------------------------------- |
| `resolveBounds(obj)` | Get `Phaser.Geom.Rectangle` bounds from any game object or Rectangle |
| `getObjectName(obj)` | Get human-readable name for debug output                             |
| `formatRect(rect)`   | Format a Rectangle as a string                                       |

## License

MIT
