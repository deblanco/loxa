import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The reset has to keep resetting.
 *
 * Its failure mode is silent and slow: somebody adds a store, forgets the key
 * list, and the reset quietly stops being a reset. Nothing errors — the app just
 * comes back remembering something it should have forgotten, which is exactly
 * the state the reset exists to escape and the hardest one to notice from
 * inside.
 *
 * So this reads the source rather than the behaviour: every `loxa.*` storage key
 * written anywhere in `src/` must appear in `reset.ts`.
 */
const SRC = join(import.meta.dirname, '..', 'src');
const RESET = join(SRC, 'dev', 'reset.ts');

function everyTsFile(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return everyTsFile(path);
    return name.endsWith('.ts') || name.endsWith('.tsx') ? [path] : [];
  });
}

/** Storage keys are written as bare `'loxa.something'` literals by convention. */
function keysIn(source: string): string[] {
  return [...source.matchAll(/'(loxa\.[A-Za-z0-9._]+)'/g)].map((match) => match[1]!);
}

describe('resetAppState', () => {
  const reset = readFileSync(RESET, 'utf8');
  const declared = new Set(keysIn(reset));

  it('knows every storage key the app writes', () => {
    const used = new Set(
      everyTsFile(SRC)
        .filter((path) => path !== RESET)
        .flatMap((path) => keysIn(readFileSync(path, 'utf8'))),
    );

    const missing = [...used].filter((key) => !declared.has(key));
    expect(missing, `add these to KEYS in dev/reset.ts: ${missing.join(', ')}`).toEqual([]);
  });

  it('clears the keychain copy of the device id, not only the mirror', () => {
    // The keychain entry is the one that survives deleting the app — which is
    // the whole reason this reset exists. Missing it would leave the same
    // identity, and so the same spent free credit, behind.
    expect(reset).toContain('SecureStore.deleteItemAsync');
    expect(declared.has('loxa.deviceId')).toBe(true);
  });

  it('drops the in-memory caches after clearing storage', () => {
    // The device id is memoised for the process lifetime. Without this the app
    // carries on sending the identity it just erased.
    expect(reset).toContain('resetDeviceIdCache');
    expect(reset).toContain('clearDevPremiumCache');
    // The catalogue is held in a module for the process lifetime too, so
    // clearing only the key would leave the wiped manifest on screen — and the
    // first-launch state the reset exists to reach unreachable.
    expect(reset).toContain('clearCatalogueCache');
  });

  it('cancels scheduled notifications', () => {
    // iOS holds them, not us, so wiping storage alone leaves a daily suggestion
    // firing for an install that no longer exists.
    expect(reset).toContain('disableDaily');
  });

  it('deletes the looks directory', () => {
    expect(reset).toContain("'looks'");
  });
});
