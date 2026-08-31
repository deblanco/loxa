/**
 * Every word of UI copy the app says, in English.
 *
 * This file is the shape as well as the source: the other four locales are
 * annotated `: typeof en`, so a missing key or a stray one is a typecheck
 * failure rather than a raw `preview.tryOn` rendered on somebody's screen.
 *
 * The design system's voice survives translation or it is not a translation.
 * Two rules carry across all five:
 *
 * - **Mono notes stay lowercase.** `Meta` uppercases by default and the
 *   `sentence` variant does not, so a note that is lowercase here has to be
 *   lowercase everywhere — a capitalised `tap to choose a photo` is a different
 *   component.
 * - **The serif headlines are two lines, and the second is the italic one.**
 *   They are laid out as two `Display` elements, so a translation that wants
 *   the emphasis elsewhere has to move the words, not the markup.
 *
 * What is *not* here: the catalogue. Cut and colour names arrive with the
 * served manifest and are English for now — see the note in CLAUDE.md.
 */
const en = {
  common: {
    back: 'Back',
    cancel: 'Cancel',
    tryAgain: 'Try again',
  },

  entry: {
    headline: 'Try on any hair',
    headlineItalic: 'before the scissors.',
    sub: 'Photo in, new hair out. Colours, cuts and lengths on your own face in seconds.',
    cta: 'Get started',
    slide: 'Slide {{number}}',
  },

  offer: {
    badgeIntro: 'First week {{price}}',
    badge: '{{count}} photos a week',
    headline: 'Change your hair',
    headlineSecond: 'twenty times a week.',
    perkCredits: '{{count}} photos a week, any style or colour',
    perkOwnFace: 'Your own face — not a stock model',
    perkDaily: 'New looks dropped daily',
    startIntro: 'Start for {{price}}',
    start: 'Subscribe',
    skip: 'Continue without subscribing',
    termsIntro:
      '{{price}} for the first week, then {{weekly}} a week · {{count}} photos a week · cancel anytime',
    terms: '{{weekly}} a week · {{count}} photos a week · cancel anytime',
  },

  preview: {
    tryOn: 'Try On',
    takePhotoAndTryOn: 'Take photo & try on',
    takeProfilePhoto: 'Take your profile photo',
    tapToTakePhoto: 'tap to take a photo',
    savedPhoto: 'Saved photo',
    newPhoto: 'New photo',
    profile: 'Profile',
    setUpProfile: 'Set up your profile',
    creditsLeft: '{{count}} credits left',
    offlineHeadline: 'Nothing to try on',
    offlineHeadlineItalic: 'just yet.',
    needsConnection: 'loxa needs a connection the first time',
  },

  confirm: {
    title: 'Confirm',
    swipeHint: 'swipe to change the cut',
    yourPhoto: 'Your photo',
  },

  strips: {
    styles: 'Hair styles',
    colours: 'Hair colours',
    all: 'All {{count}}',
  },

  camera: {
    title: 'Photo for this look',
    titleProfile: 'New profile photo',
    permission: 'Camera',
    permissionBody:
      'Loxa needs the camera to take the photo it restyles. Nothing is uploaded until you press Try On.',
    allow: 'Allow camera',
    openSettings: 'Open Settings',
    permissionDenied:
      'Camera access is off for Loxa. Turn it on in Settings, or choose a photo from your library instead.',
    chooseFromLibrary: 'Choose from library',
    library: 'library',
    hint: 'centre your face · even light · hair tied back off',
    close: 'Close',
    takePhoto: 'Take photo',
    flip: 'Flip camera',
  },

  /**
   * Why a photo was turned away. One lowercase clause, then what to do about
   * it — the same shape as the viewfinder hint each one replaces.
   */
  verdict: {
    'no-face': 'no face in that one · try again',
    'multiple-faces': 'more than one face · one at a time',
    'low-quality': 'too small or too soft · try a closer photo',
  },

  generating: {
    title: 'Generating your look',
    step1: 'reading your photo',
    step2: 'mapping hairline',
    step3: 'painting colour',
    step4: 'matching light',
    summary: 'Selection summary',
    style: 'Style',
    colour: 'Colour',
    cost: 'Cost',
    oneCredit: '1 credit',
  },

  result: {
    creditsLeft: '{{count}} credits left',
    save: 'Save',
    saved: 'Saved to your camera roll',
    saveDenied: 'Loxa cannot add to your photos',
    share: 'Share',
    again: 'Again · 1 credit',
    holdToCompare: 'hold to compare',
    showingOriginal: 'showing original',
    originalPhoto: 'original photo',
    /**
     * The offer to keep the render's own photograph as the profile portrait.
     * Raised once per install, and only while there is no portrait yet.
     */
    usePortrait: 'Use this photo on your profile?',
    usePortraitYes: 'Use photo',
    usePortraitNo: 'Not now',
    portraitSaved: 'Saved as your profile photo',
  },

  paywall: {
    title: 'Out of credits',
    titleItalic: 'until Monday.',
    single: 'One more photo',
    singleNote: 'Single generation, no subscription',
    weekly: 'Loxa Weekly',
    bestValue: 'best value',
    weeklyNote: '{{count}} photos every week',
    perWeek: '/wk',
    notNow: 'Not now',
  },

  profile: {
    title: 'Profile',
    changePhoto: 'Change your photo',
    tapToChangePhoto: 'tap to change your photo',
    addPhoto: 'Add your photo',
    tapToAddPhoto: 'tap to add your photo',
    creditsLeft: 'Credits left',
    resetsMonday: 'resets Monday',
    resetsTomorrow: 'resets tomorrow',
    noRollOver: 'no roll-over',
    planFree: 'Free plan',
    planTrial: 'Free trial',
    planWeekly: 'Loxa Weekly',
    planFreeNote: 'No weekly credits — {{price}} per photo',
    planWeeklyNote: '{{price}} · {{count}} photos a week',
    manage: 'Manage',
    notifications: 'Daily style ideas',
    notificationsNote: 'One notification a day, new looks',
    restore: 'Restore purchases',
    restored: 'Purchases restored',
    /** Opens the App Store page rather than the rating sheet: Apple's sheet must never be the answer to a button press. */
    rate: 'Rate Loxa',
    privacy: 'Privacy policy',
    terms: 'Terms of use',
    language: 'Language',
  },

  language: {
    title: 'Language',
    note: 'loxa follows your phone until you choose here',
  },

  legal: {
    terms: 'Terms',
    privacy: 'Privacy',
  },

  /**
   * The daily notification. It names a look rather than announcing that the
   * app exists — "try a wolf cut today" is a suggestion, "come back to Loxa"
   * is a nag — so no line here says the app's name.
   */
  notifications: {
    line1: { title: 'Curtain bangs, on you', body: 'Two taps to see it before you commit.' },
    line2: { title: 'Going lighter?', body: 'Honey blonde and platinum, on your own photo.' },
    line3: { title: 'The bob is back', body: 'Blunt, chin-length, no layers. Try it on.' },
    line4: { title: 'Copper season', body: 'See how a warm red reads against your skin.' },
    line5: {
      title: 'Short hair, hypothetically',
      body: 'A pixie takes ten seconds and no scissors.',
    },
    line6: { title: 'Beach waves', body: 'Undone, but on purpose. See it on you.' },
    line7: { title: 'A wolf cut, maybe', body: 'Heavy layers, wispy fringe. Worth a look.' },
  },
};

export default en;
