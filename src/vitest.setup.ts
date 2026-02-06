/**
 * Vitest setup file for phaser-test-utils.
 *
 * Add this to your vitest.config.ts:
 *
 * ```ts
 * export default defineConfig({
 *   test: {
 *     environment: 'jsdom',
 *     setupFiles: ['phaser-test-utils/setup'],
 *   },
 * });
 * ```
 */

import { setupLayoutMatchers } from "./layout/matchers.js";

setupLayoutMatchers();
