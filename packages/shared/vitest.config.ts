import { defineConfig } from 'vitest/config';

/**
 * Plain Node — this package is pure logic and schemas, so V8 coverage works
 * here (unlike inside workerd, where the Worker's suite has to use istanbul).
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      thresholds: { lines: 90, functions: 90, statements: 90 },
    },
  },
});
