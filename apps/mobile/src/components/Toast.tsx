import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { color, motion, radius, space } from '../theme';
import { Body } from './Text';

/**
 * The confirmation that something happened.
 *
 * Rises from below and fades, matching the sheet's motion — the design system
 * has one arrival gesture and everything that arrives uses it.
 */
export function Toast({ message }: { message: string | null }) {
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rise, {
      toValue: message ? 1 : 0,
      duration: motion.instant,
      useNativeDriver: true,
    }).start();
  }, [message, rise]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          opacity: rise,
          transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        },
      ]}
    >
      <Body variant="bodySmall" tone="paper" style={styles.text}>
        {message}
      </Body>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 52,
    alignSelf: 'center',
    paddingHorizontal: space.gutterText,
    paddingVertical: 11,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(13,12,11,0.9)',
  },
  text: { textAlign: 'center' },
});
