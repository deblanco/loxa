import type en from './locales/en';

/**
 * Typed keys.
 *
 * There is no linter here — `tsc --noEmit` is the gate — and a mistyped key
 * fails silently by rendering itself, so `t('preview.tryOnn')` would ship as
 * the literal text `preview.tryOnn` on the app's main button. This makes it a
 * typecheck error instead.
 *
 * It is the second half of the guarantee `: typeof en` gives the other four
 * locales: that one says every language has the same keys, this one says every
 * call site asks for a key that exists.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
  }
}
