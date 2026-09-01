import { Component, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { t } from 'i18next';
import { reportRenderError } from '@/diagnostics';
import { color, space } from '../theme';
import { Body, Display } from './Text';
import { Pill } from './Pill';

/**
 * The last thing between a thrown render and a white screen.
 *
 * The only class component in the app, because `getDerivedStateFromError` has
 * no hook. It wraps the whole navigation stack: a screen that throws would
 * otherwise unmount the tree and leave the user looking at nothing, with no way
 * back and nothing sent to us.
 *
 * "Try again" remounts the subtree rather than navigating. There is nowhere
 * safe to navigate *to* — the router is part of what just failed — and a
 * remount is enough for the common case of a screen that threw on bad data it
 * will not be handed twice.
 *
 * `t` is imported from i18next directly rather than through `useTranslation`
 * because this is a class, and because i18next is initialised synchronously at
 * import — so there is no state here that could be missing when it renders.
 */
interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(err: unknown) {
    reportRenderError(err);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <View style={styles.screen}>
        <Display variant="displayS">{t('error.title')}</Display>
        <Display variant="displayS" italic>
          {t('error.titleEmphasis')}
        </Display>
        <Body tone="ink60" style={styles.note}>
          {t('error.body')}
        </Body>
        <Pill
          label={t('common.tryAgain')}
          onPress={() => this.setState({ failed: false })}
          style={styles.action}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: color.paper,
    paddingHorizontal: space.gutterText,
  },
  note: {
    marginTop: space.s4,
    marginBottom: space.s8,
  },
  action: {
    alignSelf: 'stretch',
  },
});
