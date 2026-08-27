import { describe, expect, it } from 'vitest';
import {
  lookImageName,
  lookMetaName,
  newLookRecord,
  newestFirst,
  parseLookRecord,
} from '../src/store/look-record';

const INPUT = {
  id: 'abc',
  styleId: 'pixie',
  colorId: 'copper',
  createdAt: '2026-08-27T12:00:00.000Z',
};

/** What the container path looks like on a real device, UUID and all. */
const CONTAINER =
  'file:///var/mobile/Containers/Data/Application/9F3A-4C21/Documents/looks/abc.jpg';

describe('newLookRecord', () => {
  it('never writes an absolute path to disk', () => {
    // The bug this guards: the container UUID is reassigned on reinstall and can
    // change on a restore, so a persisted URI points at a directory that no
    // longer exists while the image sits safely where it always was. Every
    // screen then shows a blank plate and nothing errors.
    const record = newLookRecord(INPUT) as Record<string, unknown>;
    expect(record.uri).toBeUndefined();
    expect(JSON.stringify(record)).not.toContain('file://');
    expect(JSON.stringify(record)).not.toContain('/var/mobile');
  });

  it('refuses a uri smuggled in by the caller', () => {
    const record = newLookRecord({ ...INPUT, uri: CONTAINER } as never) as Record<string, unknown>;
    expect(record.uri).toBeUndefined();
  });

  it('keeps what the record is for', () => {
    expect(newLookRecord(INPUT)).toEqual(INPUT);
  });
});

describe('parseLookRecord', () => {
  it('round-trips a record it wrote', () => {
    expect(parseLookRecord(JSON.stringify(newLookRecord(INPUT)))).toEqual(INPUT);
  });

  it('drops the uri from a record written by an older build', () => {
    // Not migrated, because the value was stale the moment the container moved
    // and the correct one is derivable from the id anyway.
    const legacy = JSON.stringify({ ...INPUT, uri: CONTAINER });
    const parsed = parseLookRecord(legacy) as Record<string, unknown>;
    expect(parsed.uri).toBeUndefined();
    expect(parsed.id).toBe('abc');
  });

  it('returns null for a half-written file rather than throwing', () => {
    // One look lost, not the screen.
    expect(parseLookRecord('{"id":"abc","sty')).toBeNull();
    expect(parseLookRecord('')).toBeNull();
  });

  it('returns null for JSON that is not a record', () => {
    expect(parseLookRecord('null')).toBeNull();
    expect(parseLookRecord('[]')).toBeNull();
    expect(parseLookRecord('"abc"')).toBeNull();
    expect(parseLookRecord('{"id":"abc"}')).toBeNull();
    expect(parseLookRecord(JSON.stringify({ ...INPUT, createdAt: 12345 }))).toBeNull();
  });
});

describe('file names', () => {
  it('pairs an image with its metadata', () => {
    expect(lookImageName('abc')).toBe('abc.jpg');
    expect(lookMetaName('abc')).toBe('abc.json');
  });
});

describe('newestFirst', () => {
  it('sorts newest first', () => {
    const older = { ...INPUT, id: 'older', createdAt: '2026-08-01T00:00:00.000Z' };
    const newer = { ...INPUT, id: 'newer', createdAt: '2026-08-27T00:00:00.000Z' };
    expect(newestFirst([older, newer]).map((l) => l.id)).toEqual(['newer', 'older']);
  });

  it('does not mutate its input', () => {
    const looks = [
      { ...INPUT, id: 'a', createdAt: '2026-08-01T00:00:00.000Z' },
      { ...INPUT, id: 'b', createdAt: '2026-08-27T00:00:00.000Z' },
    ];
    newestFirst(looks);
    expect(looks.map((l) => l.id)).toEqual(['a', 'b']);
  });
});
