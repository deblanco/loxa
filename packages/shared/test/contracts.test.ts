import { describe, expect, it } from 'vitest';
import {
  apiErrorSchema,
  creditsResponseSchema,
  purchaseSyncRequestSchema,
  tryOnRequestSchema,
} from '../src/contracts';

const PHOTO = 'aGVsbG8=';

describe('tryOnRequestSchema', () => {
  it('accepts a well-formed request', () => {
    const parsed = tryOnRequestSchema.safeParse({
      imageBase64: PHOTO,
      styleId: 'blunt-bob',
      colorId: 'caramel',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a style that is not in the catalogue', () => {
    const parsed = tryOnRequestSchema.safeParse({
      imageBase64: PHOTO,
      styleId: 'mullet',
      colorId: 'caramel',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a data: URL', () => {
    // The app strips the prefix. Letting one through would reach Vertex as
    // corrupt inline data and burn a credit to find out.
    const parsed = tryOnRequestSchema.safeParse({
      imageBase64: `data:image/jpeg;base64,${PHOTO}`,
      styleId: 'pixie',
      colorId: 'jet-black',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects an empty photo', () => {
    const parsed = tryOnRequestSchema.safeParse({
      imageBase64: '',
      styleId: 'pixie',
      colorId: 'jet-black',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a photo past the size ceiling', () => {
    const parsed = tryOnRequestSchema.safeParse({
      imageBase64: 'a'.repeat(8 * 1024 * 1024 + 4),
      styleId: 'pixie',
      colorId: 'jet-black',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('the response schemas', () => {
  it('parses a credits answer', () => {
    const parsed = creditsResponseSchema.safeParse({
      creditsLeft: 13,
      cap: 20,
      plan: 'weekly',
      resetsAt: '2026-08-31T00:00:00.000Z',
    });
    expect(parsed.success).toBe(true);
  });

  it('refuses a negative credit count', () => {
    const parsed = creditsResponseSchema.safeParse({
      creditsLeft: -1,
      cap: 20,
      plan: 'weekly',
      resetsAt: '2026-08-31T00:00:00.000Z',
    });
    expect(parsed.success).toBe(false);
  });

  it('parses an error body', () => {
    expect(apiErrorSchema.safeParse({ code: 'out_of_credits', message: 'no' }).success).toBe(true);
    expect(apiErrorSchema.safeParse({ code: 'teapot', message: 'no' }).success).toBe(false);
  });
});

describe('purchaseSyncRequestSchema', () => {
  it('takes a list of transaction ids', () => {
    expect(purchaseSyncRequestSchema.safeParse({ transactionIds: ['tx_1'] }).success).toBe(true);
  });

  it('refuses an empty list', () => {
    expect(purchaseSyncRequestSchema.safeParse({ transactionIds: [] }).success).toBe(false);
  });

  it('caps the batch', () => {
    const ids = Array.from({ length: 51 }, (_, i) => `tx_${i}`);
    expect(purchaseSyncRequestSchema.safeParse({ transactionIds: ids }).success).toBe(false);
  });
});
