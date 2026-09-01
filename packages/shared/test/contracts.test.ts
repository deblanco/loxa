import { describe, expect, it } from 'vitest';
import {
  catalogueResponseSchema,
  apiErrorSchema,
  creditsResponseSchema,
  diagnosticsRequestSchema,
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

  it('accepts a style id this build has never heard of', () => {
    // The catalogue the app draws is served, so it can be a subset of what the
    // Worker ships and an old client can hold ids that have since been
    // withdrawn. The wire no longer enumerates them; `core/try-on.ts` resolves
    // both against the catalogue and answers 400 when it cannot.
    const parsed = tryOnRequestSchema.safeParse({
      imageBase64: PHOTO,
      styleId: 'a-style-from-next-year',
      colorId: 'caramel',
    });
    expect(parsed.success).toBe(true);
  });

  it('still rejects an id that is not shaped like one', () => {
    const parsed = tryOnRequestSchema.safeParse({
      imageBase64: PHOTO,
      styleId: 'Blunt Bob',
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

describe('catalogueResponseSchema', () => {
  const MANIFEST = {
    version: 1,
    styles: [
      {
        id: 'blunt-bob',
        name: 'Blunt bob',
        tiles: ['styles/blunt-bob/tile-0.jpg'],
        colors: [{ id: 'caramel', heroes: ['styles/blunt-bob/caramel/0.jpg'] }],
      },
    ],
    colors: [{ id: 'caramel', name: 'Caramel', hex: '#a46c3c' }],
    defaults: { styleId: 'blunt-bob', colorId: 'caramel' },
  };

  it('accepts a manifest', () => {
    expect(catalogueResponseSchema.safeParse(MANIFEST).success).toBe(true);
  });

  it('accepts a style with no tile, because most of them have none', () => {
    const parsed = catalogueResponseSchema.safeParse({
      ...MANIFEST,
      styles: [{ ...MANIFEST.styles[0]!, tiles: [] }],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a version this build does not know', () => {
    expect(catalogueResponseSchema.safeParse({ ...MANIFEST, version: 2 }).success).toBe(false);
  });

  it('rejects a swatch that is not a lowercase six-digit hex', () => {
    const parsed = catalogueResponseSchema.safeParse({
      ...MANIFEST,
      colors: [{ id: 'caramel', name: 'Caramel', hex: 'brown' }],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a style with no colours rendered', () => {
    const parsed = catalogueResponseSchema.safeParse({
      ...MANIFEST,
      styles: [{ ...MANIFEST.styles[0]!, colors: [] }],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a colour entry with no pictures', () => {
    const parsed = catalogueResponseSchema.safeParse({
      ...MANIFEST,
      styles: [{ ...MANIFEST.styles[0]!, colors: [{ id: 'caramel', heroes: [] }] }],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a default that is not in the catalogue', () => {
    // It would boot the app onto a style that does not exist, and a client
    // would cache it for a day.
    const parsed = catalogueResponseSchema.safeParse({
      ...MANIFEST,
      defaults: { styleId: 'mullet', colorId: 'caramel' },
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a style naming a colour the catalogue does not list', () => {
    // A swatch with no entry renders a circle with no colour, silently.
    const parsed = catalogueResponseSchema.safeParse({
      ...MANIFEST,
      styles: [
        {
          ...MANIFEST.styles[0]!,
          colors: [{ id: 'lilac', heroes: ['styles/blunt-bob/lilac/0.jpg'] }],
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});

describe('diagnosticsRequestSchema', () => {
  const report = {
    kind: 'handled' as const,
    message: 'boom',
    appVersion: '1.0.0',
    osVersion: 'ios 18.0',
    locale: 'en',
    breadcrumbs: [],
  };

  it('accepts a minimal report and a fully dressed one', () => {
    expect(diagnosticsRequestSchema.safeParse({ reports: [report] }).success).toBe(true);
    expect(
      diagnosticsRequestSchema.safeParse({
        reports: [
          {
            ...report,
            kind: 'crash',
            stack: 'Error: boom\n  at x',
            route: '/preview',
            breadcrumbs: [{ at: 1200, label: 'route /camera' }],
          },
        ],
      }).success,
    ).toBe(true);
  });

  it('rejects an empty batch', () => {
    // Nothing to write and nothing to say — a request that costs a D1 round
    // trip to store zero rows.
    expect(diagnosticsRequestSchema.safeParse({ reports: [] }).success).toBe(false);
  });

  it('rejects a batch larger than the device queue can hold', () => {
    const parsed = diagnosticsRequestSchema.safeParse({
      reports: Array.from({ length: 21 }, () => report),
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects an unknown kind', () => {
    expect(
      diagnosticsRequestSchema.safeParse({ reports: [{ ...report, kind: 'warning' }] }).success,
    ).toBe(false);
  });

  it('rejects an empty message', () => {
    // The column is the whole report. A row that says nothing is a row that
    // costs storage to tell us a thing happened, without saying what.
    expect(
      diagnosticsRequestSchema.safeParse({ reports: [{ ...report, message: '' }] }).success,
    ).toBe(false);
  });

  /**
   * The ceilings are here rather than in the Worker so an oversized report is
   * refused at the boundary instead of becoming a large write.
   */
  it('rejects a message or a stack past its ceiling', () => {
    expect(
      diagnosticsRequestSchema.safeParse({ reports: [{ ...report, message: 'x'.repeat(501) }] })
        .success,
    ).toBe(false);
    expect(
      diagnosticsRequestSchema.safeParse({ reports: [{ ...report, stack: 'x'.repeat(4001) }] })
        .success,
    ).toBe(false);
  });

  it('rejects more breadcrumbs than the trail keeps', () => {
    const parsed = diagnosticsRequestSchema.safeParse({
      reports: [
        {
          ...report,
          breadcrumbs: Array.from({ length: 21 }, () => ({ at: 1, label: 'step' })),
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a breadcrumb aged into the future', () => {
    // `at` is an age, not a clock. A negative one means the trail was built
    // against a different `now` than the report was.
    expect(
      diagnosticsRequestSchema.safeParse({
        reports: [{ ...report, breadcrumbs: [{ at: -1, label: 'step' }] }],
      }).success,
    ).toBe(false);
  });
});
