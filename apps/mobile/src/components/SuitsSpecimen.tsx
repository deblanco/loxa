import type { CatalogueResponse } from '@loxa/shared';
import { StyleSheet, View } from 'react-native';
import { assetUrl } from '../api/assets';
import { tileFor } from '../catalogue';
import { color, radius, space } from '../theme';
import { PhotoPlate } from './PhotoPlate';
import { SuitsSeal } from './SuitsSeal';
import { Body } from './Text';

/**
 * The strip in miniature, for the onboarding's face step.
 *
 * That step says the cuts that suit a face "come first in the strip", which is
 * a sentence about a mark the user has not seen yet. This is the mark, on a
 * tile the size and shape it will be on, so that the first time it turns up on
 * a real cut it is a thing they recognise rather than a badge they have to
 * guess at.
 *
 * Three tiles, the seal on the first: the strip puts suited cuts first, so this
 * is what the front of it looks like. They are the catalogue's own cuts and
 * carry no names — the point is the mark, and a name would suggest the first
 * cut is somebody's answer when nothing has been asked yet. A cold manifest
 * leaves hatch tiles with the seal still on them, which says the same thing.
 *
 * Decoration to a screen reader: the caption carries the meaning, and reading
 * out three unnamed photographs would be noise.
 */
export function SuitsSpecimen({
  catalogue,
  caption,
}: {
  catalogue: CatalogueResponse | null;
  caption: string;
}) {
  // `slice` rather than a fixed three ids: the catalogue is data, and which cuts
  // it lists is not this file's business.
  const cuts = (catalogue?.styles ?? []).slice(0, TILES);
  const slots = Array.from({ length: TILES }, (_, index) => cuts[index]);

  return (
    <View style={styles.wrap}>
      <View
        style={styles.row}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {slots.map((style, index) => (
          <View key={style?.id ?? `empty-${index}`} style={styles.tile}>
            <PhotoPlate
              uri={catalogue && style ? assetUrl(tileFor(catalogue, style.id, 0)) : undefined}
              style={styles.thumb}
            />
            {index === 0 ? (
              <View style={styles.seal} pointerEvents="none">
                <SuitsSeal />
              </View>
            ) : null}
          </View>
        ))}
      </View>
      <Body tone="ink55" style={styles.caption}>
        {caption}
      </Body>
    </View>
  );
}

const TILES = 3;

// The strip's own figures (`StyleStrip.tsx`), repeated because a specimen that
// drifted from the thing it specimens would be teaching the wrong shape.
const TILE_WIDTH = 70;
const THUMB_HEIGHT = 84;
const SEAL = 18;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.s3 },
  row: { flexDirection: 'row', gap: space.s3 },
  tile: { width: TILE_WIDTH },
  thumb: {
    height: THUMB_HEIGHT,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: color.ink12,
  },
  // Placed exactly as the strip places it: from the photograph's top, hung off
  // the corner rather than inset.
  seal: { position: 'absolute', right: -2, top: THUMB_HEIGHT - SEAL + 2 },
  caption: { textAlign: 'center' },
});
