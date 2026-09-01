import { SINGLE_PHOTO_PRICE_LABEL, WEEKLY_PRICE_LABEL } from '@loxa/shared';
import { useEffect, useState } from 'react';
import { purchases } from './index';
import type { Pricing } from './types';

/**
 * The shipped labels, standing in until the store answers.
 *
 * **Not intro-eligible.** This used to assert the first week was available to
 * whoever was reading, on the grounds that almost everybody on the onboarding
 * offer is eligible. But the two ways to be wrong here are not symmetrical: a
 * returning subscriber shown "First week $0.99" is quoted a price the App Store
 * will not honour, and they find that out at the sheet. Quoting the standard
 * price to somebody who turns out to be eligible costs them nothing and
 * surprises them in the right direction.
 *
 * These labels are also the wrong currency outside the United States, which is
 * the other reason this is a fallback and not a source: it is what to print
 * when the alternative is a hole in a sentence.
 */
const FALLBACK: Pricing = {
  price: WEEKLY_PRICE_LABEL.split('/')[0]!,
  introPrice: null,
  singlePhoto: SINGLE_PHOTO_PRICE_LABEL,
};

/**
 * What to print where a price goes.
 *
 * Starts at the fallback rather than at null, because every caller renders a
 * number inside a sentence: a loading state here would be a screen that flashes
 * "Start for" with nothing after it.
 */
export function usePricing(): Pricing {
  const [pricing, setPricing] = useState<Pricing>(FALLBACK);

  useEffect(() => {
    let live = true;
    void purchases()
      .pricing()
      .then((fetched) => {
        if (live && fetched) setPricing(fetched);
      });
    return () => {
      live = false;
    };
  }, []);

  return pricing;
}
