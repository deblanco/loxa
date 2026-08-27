import { EMPTY_STATE, type CreditState } from '../src/core/rules';
import type { CreditLedgerPort } from '../src/ports/credit-ledger';
import type { EntitlementsPort } from '../src/ports/entitlements';
import type { HairRendererPort, RenderRequest } from '../src/ports/hair-renderer';
import type { RenderCachePort } from '../src/ports/render-cache';
import type { PlanId } from '@loxa/shared';

/**
 * In-memory ports, for testing use cases without a binding.
 *
 * The point of the hexagon is that `tryOn` does not know D1 exists; these fakes
 * are that claim, made executable. Each one records enough to assert on order
 * and count, because "was the credit spent before the model was called" is a
 * question about sequence, not about return values.
 */

export function fakeLedger(initial: Partial<CreditState> = {}) {
  let state: CreditState = { ...EMPTY_STATE, ...initial };
  const grants = new Set<string>();
  const writes: CreditState[] = [];

  const port: CreditLedgerPort = {
    async read() {
      return state;
    },
    async write(_deviceId, next) {
      state = next;
      writes.push(next);
    },
    async recordGrant(_deviceId, transactionId) {
      if (grants.has(transactionId)) return false;
      grants.add(transactionId);
      return true;
    },
  };

  return {
    port,
    writes,
    get state() {
      return state;
    },
  };
}

export function fakeEntitlements(plan: PlanId = 'free', verified: readonly string[] = []) {
  const port: EntitlementsPort = {
    async planFor() {
      return plan;
    },
    async verifyPurchase(_deviceId, transactionId) {
      return verified.includes(transactionId);
    },
  };
  return port;
}

export function fakeCache(seed: Record<string, string> = {}) {
  const store = new Map(Object.entries(seed));
  const port: RenderCachePort = {
    async get(key) {
      return store.get(key) ?? null;
    },
    async put(key, value) {
      store.set(key, value);
    },
  };
  return { port, store };
}

/** A renderer that answers, or one that fails, plus a record of what it was asked. */
export function fakeRenderer(answer: string | Error = 'RENDERED') {
  const calls: RenderRequest[] = [];
  const port: HairRendererPort = {
    async render(request) {
      calls.push(request);
      if (answer instanceof Error) throw answer;
      return { imageBase64: answer };
    },
  };
  return { port, calls };
}

/** A clock that does not move, so a test never straddles a Monday by accident. */
export const FIXED_NOW = new Date('2026-08-27T12:00:00Z');
export const fixedClock = () => FIXED_NOW;
