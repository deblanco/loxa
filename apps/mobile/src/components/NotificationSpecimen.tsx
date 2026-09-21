import { Image, StyleSheet, View } from 'react-native';
import { color, radius, space } from '../theme';
import { Body } from './Text';

const ICON = require('../../assets/icon.png');

/**
 * The notification, before it has been asked for.
 *
 * The onboarding's last step asks somebody to let the app interrupt them, and
 * the honest way to ask is to show the interruption. This is the first one they
 * would actually receive — the very line and the very minute, from
 * `scheduleFrom` — drawn as a card of the same proportions iOS uses, so that
 * "one a day, a look to try" is not a promise but a sample.
 *
 * **It is a picture of a notification, not a stand-in for the system's
 * permission prompt.** It has no buttons, does not say "Allow", and sits above
 * the app's own two controls; the prompt itself is iOS's and appears only when
 * one of them is pressed.
 *
 * Drawn from the tokens rather than in iOS's material: a translucent blur here
 * would be a second surface in a design system that has one paper, and would
 * read as a real banner that had somehow got onto the screen. The hairline and
 * the sunken tone say "specimen", the way `FaceDiagram`'s oval does.
 *
 * One card, deliberately. A stack behind it would say there are many, and the
 * whole offer is that there is one.
 */
export function NotificationSpecimen({
  title,
  body,
  time,
}: {
  title: string;
  body: string;
  time: string;
}) {
  return (
    // Read as one element: the icon, the app name and the time are furniture,
    // and a screen reader stopping on each of them before it reached the line
    // itself would be all noise.
    <View style={styles.card} accessible accessibilityLabel={`${title}. ${body}`}>
      <Image source={ICON} style={styles.icon} />
      <View style={styles.text}>
        <View style={styles.top}>
          <Body variant="caption" tone="ink45">
            Loxa
          </Body>
          <Body variant="caption" tone="ink45">
            {time}
          </Body>
        </View>
        <Body weight="medium">{title}</Body>
        <Body tone="ink60">{body}</Body>
      </View>
    </View>
  );
}

const ICON_SIZE = 44;

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: space.s4,
    padding: space.s4,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.ink12,
    backgroundColor: color.surfaceSunken,
  },
  // The app's own icon, rounded the way the home screen rounds it. The asset is
  // the square the store wants; the corner is applied here, as iOS does.
  icon: { width: ICON_SIZE, height: ICON_SIZE, borderRadius: radius.chip },
  text: { flex: 1, gap: 2 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
});
