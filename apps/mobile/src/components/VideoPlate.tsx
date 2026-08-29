import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { color } from '../theme';

/**
 * A looping, silent clip behind the entry pitch.
 *
 * The poster is a still of the clip's own first frame, drawn underneath. The
 * player takes a moment to hand over its first frame and paints nothing until
 * it does, so without the poster the carousel opens on a black rectangle —
 * which on the very first screen of the app reads as a failed install rather
 * than as a video about to start.
 *
 * Silent and looping because the design system counts the carousel among the
 * screen's ambient motion: it plays untouched, so it may not ask for the
 * volume, and it may not end.
 */
interface Props {
  /**
   * The bucket's copy, and what plays when there is one. Undefined when
   * `EXPO_PUBLIC_ASSETS_URL` is unset, which goes straight to the bundle
   * without a request.
   */
  remote?: { clip: string; poster: string };
  /**
   * The copy in the binary. Not a placeholder — it is real footage, and it is
   * what plays on a first launch with no network, which is the one launch the
   * app cannot afford to spend on a spinner.
   */
  bundled: { clip: number; poster: number };
  style?: StyleProp<ViewStyle>;
}

export function VideoPlate({ remote, bundled, style }: Props) {
  // One flag for both files. They are two objects on one host, so in practice
  // they fail together; and falling back to a bundled clip under a served
  // poster would show one woman's hair over another's.
  const [failed, setFailed] = useState(false);

  // The source is fixed at creation — `useVideoPlayer` reads it once — so the
  // fallback is a `replace`, not a different argument here.
  const player = useVideoPlayer(remote?.clip ?? bundled.clip, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') setFailed(true);
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    if (!failed || !remote) return;
    player.replace(bundled.clip);
    player.play();
  }, [failed, remote, player, bundled.clip]);

  const poster = remote && !failed ? { uri: remote.poster } : bundled.poster;

  return (
    <View style={[styles.plate, style]}>
      <Image
        source={poster}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
        onError={() => setFailed(true)}
      />
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        // The clip is scenery, not a player: the screen's only control is
        // "Get started", and a scrubber under the pitch would be a second one.
        nativeControls={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  plate: { backgroundColor: color.night, overflow: 'hidden' },
});
