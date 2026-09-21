import type { Context } from 'hono';
import { describe, expect, it } from 'vitest';
import { clientNetworkFrom } from '../src/adapters/http/device';

const from = (ip?: string) =>
  clientNetworkFrom({
    req: { header: (name: string) => (name === 'CF-Connecting-IP' ? ip : undefined) },
  } as unknown as Context);

describe('clientNetworkFrom', () => {
  it('reads the address Cloudflare set', () => {
    expect(from('203.0.113.7')).toBe('203.0.113.7');
  });

  it('is null when there is none, as in local development', () => {
    expect(from()).toBeNull();
    expect(from('  ')).toBeNull();
  });

  it('counts an IPv6 address as its /64', () => {
    expect(from('2001:db8:aaaa:bbbb:1:2:3:4')).toBe('2001:db8:aaaa:bbbb');
    expect(from('2001:db8:aaaa:bbbb:ffff:ffff:ffff:ffff')).toBe('2001:db8:aaaa:bbbb');
  });

  it('expands a compressed address before cutting it', () => {
    expect(from('2001:db8::1')).toBe('2001:db8:0:0');
    expect(from('2001:db8:1::')).toBe('2001:db8:1:0');
    expect(from('::1')).toBe('0:0:0:0');
    expect(from('2001:DB8:0:0:0:0:0:1')).toBe('2001:db8:0:0');
  });

  it('spells one /64 one way however it was written', () => {
    expect(from('2001:0db8:0000:0000::9')).toBe(from('2001:db8::1'));
  });

  it('leaves an IPv4-mapped address alone', () => {
    expect(from('::ffff:203.0.113.7')).toBe('::ffff:203.0.113.7');
  });
});
