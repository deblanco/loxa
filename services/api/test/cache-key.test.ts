import { describe, expect, it } from 'vitest';
import { analysisCacheKey, renderCacheKey } from '../src/core/cache-key';

describe('renderCacheKey', () => {
  it('is exactly what it has always been', async () => {
    // Pinned with a literal, and not to be "fixed" if it fails. This cache is
    // live: any change to the material silently cold-starts every render in
    // production, which reaches users as the model having become slow and
    // reaches us as a bill. If this test fails, the change is wrong.
    await expect(renderCacheKey('aGVsbG8=', 'blunt-bob', 'caramel')).resolves.toBe(
      'tryon:4789707f354f10e750d70b55f4241bb6004ae4ee026c87f663a9cb5cec0e1e2f',
    );
  });
});

describe('analysisCacheKey', () => {
  const photos = ['aGVsbG8='];
  const catalogue = ['blunt-bob', 'pixie'];

  it('names its own prefix, so a key cannot collide with a render', async () => {
    const key = await analysisCacheKey(photos, catalogue);
    expect(key.startsWith('analysis:')).toBe(true);
  });

  it('is stable for the same photos and the same catalogue', async () => {
    await expect(analysisCacheKey(photos, catalogue)).resolves.toBe(
      await analysisCacheKey(photos, catalogue),
    );
  });

  it('changes when the catalogue does', async () => {
    // The day a twenty-fifth cut ships, every cached answer is one that could
    // not have named it. Without the fingerprint it would be withheld from
    // everyone holding a result until that result expired.
    await expect(analysisCacheKey(photos, [...catalogue, 'mullet'])).resolves.not.toBe(
      await analysisCacheKey(photos, catalogue),
    );
  });

  it('reads two photos in the order they were taken', async () => {
    // Sorting would win a hit for an arrangement nobody asked for.
    await expect(analysisCacheKey(['a', 'b'], catalogue)).resolves.not.toBe(
      await analysisCacheKey(['b', 'a'], catalogue),
    );
  });

  it('tells one photo apart from the same photo twice', async () => {
    await expect(analysisCacheKey(['a'], catalogue)).resolves.not.toBe(
      await analysisCacheKey(['a', 'a'], catalogue),
    );
  });
});
