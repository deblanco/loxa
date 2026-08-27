import { HAIR_STYLES } from '@loxa/shared';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { color, radius, space } from '../theme';
import { PhotoPlate } from './PhotoPlate';
import { Body, Meta } from './Text';

/**
 * The horizontal strip of cuts.
 *
 * Selection is a ring on the tile plus a tick, not a colour change: there is
 * only one black, so "selected" has to be expressed with weight and a mark
 * rather than with a highlight.
 */
interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
}

export function StyleStrip({ selectedId, onSelect }: Props) {
  return (
    <View>
      <View style={styles.header}>
        <Meta>Hair styles</Meta>
        <Body variant="caption" tone="ink40">
          All {HAIR_STYLES.length}
        </Body>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {HAIR_STYLES.map((style) => {
          const selected = style.id === selectedId;
          return (
            <Pressable
              key={style.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelect(style.id)}
              style={styles.tile}
            >
              <PhotoPlate
                style={[styles.thumb, { borderColor: selected ? color.ink : color.ink12 }]}
              />
              {selected ? (
                <View style={styles.tick}>
                  <Body variant="tile" tone="paper">
                    ✓
                  </Body>
                </View>
              ) : null}
              <Body variant="tile" tone={selected ? 'ink' : 'ink55'} style={styles.name}>
                {style.name}
              </Body>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: space.gutterText,
    paddingBottom: space.s2,
  },
  strip: { paddingHorizontal: space.gutterScreen, gap: space.s3 },
  tile: { width: 70 },
  thumb: { height: 84, borderRadius: radius.tile, borderWidth: 1 },
  tick: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { marginTop: space.s1 + 2, textAlign: 'center' },
});
