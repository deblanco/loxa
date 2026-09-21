import AsyncStorage from '@react-native-async-storage/async-storage';
import { analysisResponseSchema, type FaceShape, type SuitableCut } from '@loxa/shared';

/**
 * The last answer about the user's face, on this phone.
 *
 * The photographs that produced it are not kept — they are read, sent, and
 * dropped. What survives is the verdict: a face shape, the cuts that suit it in
 * the order the model ranked them, and when it was asked.
 *
 * This overrides the shape the phone measured for itself (`face-shape.ts`),
 * which is why `validateSuitability` on the Worker refuses an answer whose
 * shape is not one of ours rather than defaulting: a guess here would quietly
 * replace a real measurement.
 */
const KEY = 'loxa.analysis.v1';

export interface StoredAnalysis {
  faceShape: FaceShape;
  cuts: SuitableCut[];
  /** ISO, so the profile can say how old the answer is without a second field. */
  at: string;
}

/** What we have, or null if there is none or it is not the shape this build writes. */
export async function readAnalysis(): Promise<StoredAnalysis | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const { at } = parsed as { at?: unknown };
    // The wire schema, minus the two fields that belong to the request rather
    // than to the answer. Reusing it is what keeps this honest when the
    // contract moves.
    const answer = analysisResponseSchema
      .omit({ creditsLeft: true, cached: true })
      .safeParse(parsed);
    if (!answer.success || typeof at !== 'string') return null;

    return { faceShape: answer.data.faceShape, cuts: answer.data.cuts, at };
  } catch {
    return null;
  }
}

export async function saveAnalysis(answer: {
  faceShape: FaceShape;
  cuts: SuitableCut[];
}): Promise<void> {
  const stored: StoredAnalysis = { ...answer, at: new Date().toISOString() };
  await AsyncStorage.setItem(KEY, JSON.stringify(stored)).catch(() => {});
}

/** Forget it. The strip goes back to the shape the phone measured. */
export async function clearAnalysis(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
