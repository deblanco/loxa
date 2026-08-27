import { HAIR_COLORS, findColor } from '@loxa/shared';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { color as token, radius, space } from '../theme';
import { Body, Meta } from './Text';

/**
 * The horizontal strip of colours.
 *
 * The swatch is the flat hex from the catalogue with an inset shade over it, so
 * a circle of paint reads as a head of hair rather than as a colour picker. The
 * hex is never what the model is asked for; that is the prompt fragment, and it
 * lives beside the swatch in `@loxa/shared`.
 */
interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ColorStrip({ selectedId, onSelect }: Props) {
  return (
    <View>
      <View style={styles.header}>
        <Meta>Hair colours</Meta>
        <Body variant="caption" tone="ink45">
          {findColor(selectedId)?.name ?? ''}
        </Body>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {HAIR_COLORS.map((hair) => {
          const selected = hair.id === selectedId;
          return (
            <Pressable
              key={hair.id}
              accessibilityRole="button"
              accessibilityLabel={hair.name}
              accessibilityState={{ selected }}
              onPress={() => onSelect(hair.id)}
              style={[styles.ring, { borderColor: selected ? token.ink : 'transparent' }]}
            >
              <View style={[styles.swatch, { backgroundColor: hair.hex }]}>
                <View style={styles.shade} />
              </View>
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
  strip: { paddingHorizontal: space.gutterText, gap: space.s3 },
  ring: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    padding: 3,
  },
  swatch: { flex: 1, borderRadius: radius.pill, overflow: 'hidden', justifyContent: 'flex-end' },
  // Stands in for the CSS inset shadow: the bottom of a strand is darker.
  shade: { height: 10, backgroundColor: 'rgba(0,0,0,0.22)' },
});
