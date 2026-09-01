import { beforeEach, describe, expect, it } from 'vitest';
import { clearBreadcrumbs, pushBreadcrumb, readBreadcrumbs } from '../src/diagnostics/breadcrumbs';
import { redact, toReport } from '../src/diagnostics/report';

/**
 * The pure half of the reporter.
 *
 * `queue.ts` and `index.ts` are not here on purpose — they reach AsyncStorage
 * and React Native, and this suite is plain Node. What is here is the half that
 * decides what leaves the device, which is the half worth proving.
 */

const ENV = { appVersion: '1.0.0', osVersion: 'ios 18.0', locale: 'en' };

beforeEach(() => {
  clearBreadcrumbs();
});

describe('redaction', () => {
  /**
   * The one that matters.
   *
   * `tryOn` posts `imageBase64`, so an error carrying a request body carries a
   * user's face. The privacy policy says the photo we are sent is not stored on
   * our server, and a crash report is the way to break that by accident.
   */
  it('takes a photograph out of a message', () => {
    const photo = 'A'.repeat(4000);

    expect(redact(`failed to send ${photo}`)).toBe('failed to send [redacted]');
  });

  it('takes it out of a stack too', () => {
    const err = new Error('upload failed');
    err.stack = `Error: upload failed\n  at send(${'Zm9vYmFy'.repeat(80)})`;

    const report = toReport(err, 'handled', ENV);

    expect(report.stack).toContain('[redacted]');
    expect(report.stack).not.toContain('Zm9vYmFyZm9vYmFy');
  });

  /**
   * Redaction runs before truncation, and this is why: truncating first could
   * cut a long run down to something the pattern no longer matches, leaving
   * five hundred characters of somebody's photo in the column.
   */
  it('redacts before truncating, so a cut run cannot survive', () => {
    const report = toReport(new Error('B'.repeat(9000)), 'handled', ENV);

    expect(report.message).toBe('[redacted]');
  });

  it('leaves short base64-looking strings alone', () => {
    // A checksum or an id is not a photograph, and a reporter that scrubs them
    // is one that hides the thing it was added to show.
    expect(redact('cache miss for aGVsbG8gd29ybGQ=')).toBe('cache miss for aGVsbG8gd29ybGQ=');
  });
});

describe('toReport', () => {
  it('caps the message and the stack at the contract`s lengths', () => {
    const err = new Error('x '.repeat(600));
    err.stack = 'y '.repeat(4000);

    const report = toReport(err, 'crash', ENV);

    expect(report.message.length).toBeLessThanOrEqual(500);
    expect(report.stack?.length).toBeLessThanOrEqual(4000);
  });

  it('never produces an empty message, whatever was thrown', () => {
    expect(toReport(undefined, 'crash', ENV).message).toBe('unknown error');
    expect(toReport(new Error(''), 'crash', ENV).message).toBe('unknown error');
    expect(toReport({}, 'crash', ENV).message).toBe('unknown error');
  });

  it('reads a message off a string and off a plain object', () => {
    expect(toReport('it broke', 'handled', ENV).message).toBe('it broke');
    expect(toReport({ message: 'rejected' }, 'unhandled_rejection', ENV).message).toBe('rejected');
  });

  it('omits the stack when there is not one', () => {
    expect(toReport('a thrown string', 'crash', ENV).stack).toBeUndefined();
  });

  it('carries the route only when there is one', () => {
    expect(toReport('x', 'handled', ENV).route).toBeUndefined();
    expect(toReport('x', 'handled', { ...ENV, route: '/preview' }).route).toBe('/preview');
  });
});

describe('breadcrumbs', () => {
  it('records the trail in order, most recent last', () => {
    pushBreadcrumb('route /camera', 1000);
    pushBreadcrumb('route /preview', 1500);

    expect(readBreadcrumbs(2000)).toEqual([
      { at: 1000, label: 'route /camera' },
      { at: 500, label: 'route /preview' },
    ]);
  });

  /**
   * Relative rather than absolute, because a report is written on one launch
   * and sent on the next: a device with a wrong clock would otherwise hand us a
   * trail that sorts wrongly against its own error.
   */
  it('reports ages, never wall clocks, and never a negative one', () => {
    pushBreadcrumb('later', 5000);

    expect(readBreadcrumbs(1000)).toEqual([{ at: 0, label: 'later' }]);
  });

  it('keeps the most recent twenty and drops the oldest', () => {
    for (let i = 0; i < 25; i += 1) pushBreadcrumb(`step ${i}`, i);

    const trail = readBreadcrumbs(100);

    expect(trail).toHaveLength(20);
    expect(trail[0]?.label).toBe('step 5');
    expect(trail[19]?.label).toBe('step 24');
  });

  it('is attached to the report', () => {
    pushBreadcrumb('route /preview', 1000);

    expect(toReport('x', 'handled', ENV, 1200).breadcrumbs).toEqual([
      { at: 200, label: 'route /preview' },
    ]);
  });
});
