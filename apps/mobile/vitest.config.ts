import { defineConfig } from 'vitest/config';

/**
 * Plain Node, no react-native preset.
 *
 * Only the pure modules are under test, and they import neither react-native
 * nor any expo package — that split is deliberate. Everything platform-shaped
 * (the camera, the notification scheduler's iOS half, the store adapter) is
 * verified on a device instead, because a mock of StoreKit proves nothing about
 * StoreKit.
 *
 * Coverage is scoped to those files rather than `src/**`, so the gate stays
 * honest about what is actually covered here.
 */
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/face/geometry.ts',
        'src/i18n/languages.ts',
        'src/face/verdict.ts',
        'src/format.ts',
        'src/notifications/copy.ts',
        'src/notifications/schedule.ts',
        'src/purchases/fake.ts',
        'src/store/look-record.ts',
        'src/selection.ts',
        'src/catalogue.ts',
        'src/catalogue-cache.ts',
      ],
      thresholds: { lines: 90, functions: 90, statements: 90 },
    },
  },
});
