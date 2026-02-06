// Game lifecycle
export { createTestGame } from "./game-factory.js";
export type { TestGameConfig, TestGameHandle } from "./game-factory.js";
export { step } from "./step.js";

// Layout assertions
export {
    expectNoOverlap,
    expectNoOverlaps,
    expectContainedIn,
    expectAllContainedIn,
    expectAligned,
    expectMinGap,
    expectAbove,
    expectLeftOf,
    expectValidLayout,
} from "./layout/index.js";
export type { AlignmentAxis, LayoutValidationOptions } from "./layout/index.js";

// Vitest matchers
export { setupLayoutMatchers } from "./layout/index.js";

// Debug utilities
export { formatOverlapDebug, formatContainmentDebug } from "./layout/index.js";

// Input simulation
export {
    simulateClick,
    simulatePointerDown,
    simulatePointerUp,
    simulatePointerMove,
    simulateKeyDown,
    simulateKeyUp,
    simulateKeyPress,
} from "./simulate/index.js";

// Bounds utilities
export { resolveBounds, getObjectName, formatRect } from "./utils/bounds.js";
