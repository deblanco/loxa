import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet } from 'react-native';
import { Body } from './Text';
import { motion, space } from '../theme';

/**
 * The gap between paying and being credited, made visible.
 *
 * A purchase is not finished when the App Store sheet closes. The app hands the
 * transaction to our Worker, the Worker asks the store what was bought, and the
 * balance moves after that — a second or two in which Apple has taken the money
 * and the screen still says nothing happened. That silence reads as a purchase
 * that failed, which is the worst possible reading of the moment right after
 * someone has paid.
 *
 * It breathes on the same loop as the generating plate, for the same reason:
 * this is the app waiting on something it does not control, and the app already
 * has a way of saying that. Nothing spins and nothing bounces.
 */
export function PurchaseSettling({ onNight }: { onNight?: boolean }) {
  const { t } = useTranslation();
  const shimmer = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 0.9, duration: motion.shimmer / 2, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.35, duration: motion.shimmer / 2, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <Animated.View style={[styles.row, { opacity: shimmer }]}>
      <Body tone={onNight ? 'paper60' : 'ink55'}>{t('common.confirmingPurchase')}</Body>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Tall enough to stand in for the options it replaces, so the sheet does not
  // jump when the purchase starts settling.
  row: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.s8 },
});
