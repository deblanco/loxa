import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useDevPremium } from '../dev/premium';
import { resetAppState } from '../dev/reset';
import { color, radius, space } from '../theme';
import { Body, Meta } from './Text';

/**
 * Development controls, on the profile.
 *
 * Rendered only under `__DEV__` — the whole component returns null otherwise, so
 * a release build carries the markup but never draws it, and `useDevPremium`
 * answers false regardless.
 *
 * Styled unlike anything else in the app on purpose: a dashed border and mono
 * throughout. If this ever does reach a device it should look obviously wrong
 * rather than blend into the settings above it.
 */
export function DevPanel({ onChanged }: { onChanged?: () => void }) {
  const { premium, toggle } = useDevPremium();

  if (!__DEV__) return null;

  function confirmReset() {
    Alert.alert(
      'Reset this install?',
      'Clears the device id, the onboarding flag and every saved look. The Worker will treat this phone as new.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            void resetAppState().then(() => {
              // Back to the very start, and `dismissAll` first so the stack does
              // not keep a preview screen holding the identity we just erased.
              router.dismissAll();
              router.replace('/');
            });
          },
        },
      ],
    );
  }

  return (
    <View style={styles.panel}>
      <Meta variant="metaSmall" tone="ink40" style={styles.header}>
        Development only
      </Meta>

      <Pressable accessibilityRole="switch" accessibilityState={{ checked: premium }} onPress={() => { toggle(); onChanged?.(); }} style={styles.row}>
        <View style={styles.rowText}>
          <Body variant="bodySmall">Subscriber</Body>
          <Meta variant="note" tone="ink45" sentence style={styles.note}>
            sends X-Dev-Premium · the Worker still decides
          </Meta>
        </View>
        <View style={[styles.toggle, premium ? styles.toggleOn : styles.toggleOff]}>
          <View style={styles.knob} />
        </View>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={confirmReset} style={[styles.row, styles.divided]}>
        <View style={styles.rowText}>
          <Body variant="bodySmall">Reset this install</Body>
          <Meta variant="note" tone="ink45" sentence style={styles.note}>
            new device id, onboarding again, looks deleted
          </Meta>
        </View>
        <Body variant="bodySmall" tone="ink30">
          ›
        </Body>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: space.gutterScreen,
    marginBottom: space.gutterScreen,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.ink18,
    overflow: 'hidden',
  },
  header: { paddingHorizontal: space.gutterText, paddingTop: space.s3 },
  row: {
    padding: space.gutterText,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s3,
  },
  divided: { borderTopWidth: 1, borderTopColor: color.ink07 },
  rowText: { flex: 1 },
  note: { marginTop: 2 },
  toggle: {
    width: 46,
    height: 27,
    borderRadius: radius.pill,
    padding: 3,
    flexDirection: 'row',
  },
  toggleOn: { backgroundColor: color.ink, justifyContent: 'flex-end' },
  toggleOff: { backgroundColor: color.ink18, justifyContent: 'flex-start' },
  knob: { width: 21, height: 21, borderRadius: radius.pill, backgroundColor: color.paper },
});
