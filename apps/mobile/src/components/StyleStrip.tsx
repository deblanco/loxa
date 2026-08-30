import type { CatalogueResponse } from '@loxa/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { assetUrl } from '../api/assets';
import { tileFor } from '../catalogue';
import { color, radius, space } from '../theme';
import { PhotoPlate } from './PhotoPlate';
import { Body, Meta } from './Text';

/**
 * The horizontal strip of cuts.
 *
 * Selection is a ring on the tile plus a tick, not a colour change: there is
 * only one black, so "selected" has to be expressed with weight and a mark
 * rather than with a highlight.
 *
 * Each cut was photographed on two models, and the tile shows one of them. Which
 * one is drawn once when the strip mounts and then held: the catalogue looks
 * different between sessions without anything moving on its own, which is the
 * only version of "rotating" the design system allows — it names four ambient
 * loops and says they are the only things on screen that move untouched.
 *
 * The tiles are cropped from the default colour rather than the selected one. A
 * tile that tracked the colour strip would send all of them back to the network
 * every time the most-touched control on the screen was touched.
 *
 * What is in the strip comes from the manifest, not from a compiled list, so it
 * shows the cuts that have actually been rendered and grows by an upload rather
 * than by a release. `tileFor` falls back to a hero where no crop exists, which
 * is most of them.
 */
interface Props {
  catalogue: CatalogueResponse;
  selectedId: string;
  onSelect: (id: string) => void;
}

export function StyleStrip({ catalogue, selectedId, onSelect }: Props) {
  const { t } = useTranslation();
  const [seed] = useState(() => Math.floor(Math.random() * 1000));

  return (
    <View>
      <View style={styles.header}>
        <Meta>{t('strips.styles')}</Meta>
        <Body variant="caption" tone="ink40">
          {t('strips.all', { count: catalogue.styles.length })}
        </Body>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {catalogue.styles.map((style) => {
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
                uri={assetUrl(tileFor(catalogue, style.id, seed))}
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
