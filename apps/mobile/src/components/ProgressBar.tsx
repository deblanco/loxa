import { StyleSheet, View } from 'react-native';
import { color, radius } from '../theme';

/** The hairline under "Generating your look". Also the credit meter on the profile. */
export function ProgressBar({ progress, onNight }: { progress: number; onNight?: boolean }) {
  return (
    <View style={[styles.track, { backgroundColor: onNight ? color.paper30 : color.ink12 }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${Math.min(100, Math.max(0, progress * 100))}%`,
            backgroundColor: onNight ? color.paper : color.ink,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 3, borderRadius: radius.pill, overflow: 'hidden', width: '100%' },
  fill: { height: '100%', borderRadius: radius.pill },
});
