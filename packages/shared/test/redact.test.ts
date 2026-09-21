import { describe, expect, it } from 'vitest';
import { redactImageData } from '../src/redact';

describe('redactImageData', () => {
  // The app scrubs before sending and the Worker scrubs again before writing, so
  // this is the one function standing between a user's face and an error report.
  const photo = 'A'.repeat(300);

  it('takes a photograph out of an error message', () => {
    const scrubbed = redactImageData(`request failed: {"imageBase64":"${photo}"}`);
    expect(scrubbed).toBe('request failed: {"imageBase64":"[redacted]"}');
    expect(scrubbed).not.toContain('AAAA');
  });

  it('takes out the base64 padding with it', () => {
    expect(redactImageData(`${photo}==`)).toBe('[redacted]');
  });

  it('leaves real error text alone', () => {
    // A checksum, an id or a token fragment must survive: a scrubber that eats
    // ordinary text hides exactly what it was added to show.
    const text = 'request 7f3a9c1e-2b44-4d0e-9a51-c0ffee123456 failed at sha256:9f86d081884c7d659a2feaa0c55ad015';
    expect(redactImageData(text)).toBe(text);
  });

  it('draws the line at two hundred characters', () => {
    expect(redactImageData('B'.repeat(199))).toBe('B'.repeat(199));
    expect(redactImageData('B'.repeat(200))).toBe('[redacted]');
  });

  it('redacts more than one run in the same text', () => {
    expect(redactImageData(`first ${photo} second ${photo} end`)).toBe('first [redacted] second [redacted] end');
  });
});
