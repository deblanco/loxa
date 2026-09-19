import { router } from 'expo-router';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { PhotoPlate } from '@/components/PhotoPlate';
import { Body } from '@/components/Text';
import { lookCaption } from '@/store/look-record';
import type { Look } from '@/store/results';
import { radius, space } from '@/theme';

/**
 * One saved look, as a thumbnail with its caption, that reopens it.
 *
 * Shared by the gallery and the profile's strip of recent looks. The width is
 * the caller's; the plate is 3:4 rather than the render's 9:16, because a grid
 * of full-height portraits is two looks a screen, and the face is at the top,
 * which is where `top` crops to.
 */
export function LookTile({ look, style }: { look: Look; style?: StyleProp<ViewStyle> }) {
  const { style: cut, color: shade } = lookCaption(look);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${cut}, ${shade}`}
      onPress={() => router.push({ pathname: '/result/[id]', params: { id: look.id, from: 'looks' } })}
      style={[styles.tile, style]}
    >
      <PhotoPlate uri={look.uri} contentFit="cover" contentPosition="top" style={styles.plate} />
      <Body variant="tile" numberOfLines={1}>
        {cut} · {shade}
      </Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { gap: space.s2 },
  plate: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.tile },
});
