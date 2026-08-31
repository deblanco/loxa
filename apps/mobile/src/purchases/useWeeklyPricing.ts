import { INTRO_PRICE_LABEL, WEEKLY_PRICE_LABEL } from '@loxa/shared';
import { useEffect, useState } from 'react';
import { purchases } from './index';
import type { WeeklyPricing } from './types';

/**
 * The shipped labels, standing in until the store answers.
 *
 * Intro-eligible on purpose. The only screen that prints `introPrice` is the
 * onboarding offer, which almost everybody who sees it is eligible for, and a
 * store we could not reach is a store the purchase would have failed against
 * anyway — so the wrong half of this fallback costs a sentence, not a charge.
 */
const FALLBACK: WeeklyPricing = {
  price: WEEKLY_PRICE_LABEL.split('/')[0]!,
  introPrice: INTRO_PRICE_LABEL,
};

/**
 * What to print where a price goes.
 *
 * Starts at the fallback rather than at null, because every caller renders a
 * number inside a sentence: a loading state here would be a screen that flashes
 * "Start for" with nothing after it.
 */
export function useWeeklyPricing(): WeeklyPricing {
  const [pricing, setPricing] = useState<WeeklyPricing>(FALLBACK);

  useEffect(() => {
    let live = true;
    void purchases()
      .weeklyPricing()
      .then((fetched) => {
        if (live && fetched) setPricing(fetched);
      });
    return () => {
      live = false;
    };
  }, []);

  return pricing;
}
