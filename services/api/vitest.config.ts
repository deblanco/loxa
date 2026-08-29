import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { TEST_SA_KEY } from './test/service-account.ts';

/**
 * Tests run inside workerd against real D1 and KV bindings, not mocks — the
 * credit ledger and the render cache are the two things most worth testing for
 * real, and both are pure binding behaviour.
 *
 * vitest-pool-workers v0.21 (Vitest 4) replaced `defineWorkersConfig` with the
 * `cloudflareTest` Vite plugin; the old `/config` entry point no longer exists.
 *
 * Coverage uses istanbul: V8 coverage is not supported inside workerd.
 */
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.toml' },
      miniflare: {
        // No test reaches a real model — every outbound call is intercepted.
        bindings: {
          GOOGLE_PROJECT_ID: 'loxa-test',
          IMAGE_MODEL: 'gemini-3.1-flash-lite-image',
          // A real but worthless RSA pair: the adapter signs a JWT on every
          // render, so a placeholder would fail inside crypto.subtle rather
          // than at the intercepted call, and the auth path would go untested.
          GOOGLE_SA_KEY: TEST_SA_KEY,
          // No RevenueCat key: the composition root falls through to the stub,
          // where nobody is a subscriber. Tests that need a plan say so.
          //
          DEV_PREMIUM: '1',
          // The fallback, pinned off. .dev.vars *is* loaded here, so a
          // developer with a real OpenRouter key would otherwise get a second
          // provider wired into every route test — and the 503 case at
          // routes.test.ts would fall through to a host its interceptor does
          // not whitelist. Empty rather than absent so the answer does not
          // depend on what is on somebody's disk.
          //
          // The fallback is proved in its own two suites, where a second
          // provider can be observed rather than inferred.
          OPENROUTER_API_KEY: '',
        },
      },
    }),
  ],
  test: {
    coverage: {
      provider: 'istanbul',
      include: ['src/**/*.ts'],
      thresholds: { lines: 90, functions: 90, statements: 90 },
    },
  },
});
