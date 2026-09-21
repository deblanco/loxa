import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { space } from '../theme';
import { Body, Meta } from './Text';

/**
 * What a subscription costs and how it ends, under the button that starts it.
 *
 * Both purchase screens print this, so it lives once. Two parts with two jobs:
 * the price, at reading size and the same weight for every number in it, and
 * the renewal terms and where to cancel, as the fine print they are.
 *
 * **The recurring price is never smaller than the introductory one.** They are
 * one sentence — "$0.99 for the first week, then $9.99 a week" — so neither can
 * be set louder than the other, and neither the button nor the badge above it
 * carries a price at all. Guideline 3.1.2 asks that what somebody will actually
 * be charged is at least as prominent as the offer that got them to tap. It
 * used to be an 11pt line of 40% ink under a button that said "Start for $0.99".
 *
 * Darker than the other captions on purpose: it is the one piece of fine print
 * that a purchase depends on, and 40% ink on paper is under a legible contrast.
 */
export function SubscriptionTerms({
  price,
  introPrice,
}: {
  price: string;
  introPrice: string | null;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Body variant="bodySmall" tone="ink80" weight="medium" style={styles.centred}>
        {introPrice
          ? t('common.subscriptionPriceIntro', { price: introPrice, weekly: price })
          : t('common.subscriptionPrice', { weekly: price })}
      </Body>
      <Meta variant="note" tone="ink60" sentence style={styles.centred}>
        {t('common.subscriptionTerms')}
      </Meta>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.s1 },
  centred: { textAlign: 'center' },
});
