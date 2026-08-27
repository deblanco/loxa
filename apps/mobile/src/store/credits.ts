import { useCallback, useEffect, useState } from 'react';
import type { CreditsResponse } from '@loxa/shared';
import { fetchCredits } from '../api/client';

/**
 * The credit balance, as the app sees it.
 *
 * The server is the authority — the chip is a display of a number the Worker
 * owns, never a counter the app decrements on its own. Every route that spends
 * one returns the new balance, and `set` is how a screen hands that back here
 * without a second round trip.
 */
export function useCredits() {
  const [credits, setCredits] = useState<CreditsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setCredits(await fetchCredits());
    } catch {
      // A failed refresh leaves the last known number on screen rather than
      // blanking the chip. The next spend will correct it, and a spend the
      // server refuses shows the paywall regardless of what the chip said.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const set = useCallback((creditsLeft: number) => {
    setCredits((current) => (current ? { ...current, creditsLeft } : current));
  }, []);

  return { credits, loading, refresh, set };
}
