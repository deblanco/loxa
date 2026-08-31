import type en from './en';

/** German. Duzen, like the English — this is an app about haircuts. */
const de: typeof en = {
  common: {
    back: 'Zurück',
    cancel: 'Abbrechen',
    tryAgain: 'Erneut versuchen',
  },

  entry: {
    headline: 'Probier jede Frisur',
    headlineItalic: 'vor der Schere.',
    sub: 'Foto rein, neue Haare raus. Farben, Schnitte und Längen auf deinem eigenen Gesicht, in Sekunden.',
    cta: 'Los geht’s',
    slide: 'Folie {{number}}',
  },

  offer: {
    badgeIntro: 'Erste Woche {{price}}',
    badge: '{{count}} Fotos pro Woche',
    headline: 'Ändere deine Haare',
    headlineSecond: 'zwanzigmal pro Woche.',
    perkCredits: '{{count}} Fotos pro Woche, jeder Schnitt und jede Farbe',
    perkOwnFace: 'Dein eigenes Gesicht, kein Stockmodel',
    perkDaily: 'Jeden Tag neue Looks',
    startIntro: 'Für {{price}} starten',
    start: 'Abonnieren',
    skip: 'Ohne Abo fortfahren',
    termsIntro:
      '{{price}} für die erste Woche, danach {{weekly}} pro Woche · {{count}} Fotos pro Woche · jederzeit kündbar',
    terms: '{{weekly}} pro Woche · {{count}} Fotos pro Woche · jederzeit kündbar',
  },

  preview: {
    tryOn: 'Anprobieren',
    takePhotoAndTryOn: 'Foto machen & anprobieren',
    takeProfilePhoto: 'Profilfoto machen',
    tapToTakePhoto: 'tippen, um ein foto zu machen',
    savedPhoto: 'Gespeichertes Foto',
    newPhoto: 'Neues Foto',
    newPhotoTaken: 'Neues Foto ✓',
    profile: 'Profil',
    setUpProfile: 'Profil einrichten',
    creditsLeft: 'Noch {{count}} Credits',
    offlineHeadline: 'Noch nichts',
    offlineHeadlineItalic: 'zum Ausprobieren.',
    needsConnection: 'loxa braucht beim ersten mal eine verbindung',
  },

  strips: {
    styles: 'Haarschnitte',
    colours: 'Haarfarben',
    all: 'Alle {{count}}',
  },

  camera: {
    title: 'Foto für diesen Look',
    titleProfile: 'Neues Profilfoto',
    permission: 'Kamera',
    permissionBody:
      'Loxa braucht die Kamera für das Foto, das umgestylt wird. Nichts wird hochgeladen, bis du auf Anprobieren tippst.',
    allow: 'Kamera erlauben',
    openSettings: 'Einstellungen öffnen',
    permissionDenied:
      'Loxa hat keinen Zugriff auf die Kamera. Schalte ihn in den Einstellungen ein, oder wähle ein Foto aus deiner Mediathek.',
    chooseFromLibrary: 'Aus der Mediathek wählen',
    library: 'mediathek',
    hint: 'gesicht mittig · gleichmäßiges licht · haare zurückgebunden',
    close: 'Schließen',
    takePhoto: 'Foto aufnehmen',
    flip: 'Kamera wechseln',
  },

  verdict: {
    'no-face': 'kein gesicht darauf · versuch es noch mal',
    'multiple-faces': 'mehr als ein gesicht · eines nach dem anderen',
    'low-quality': 'zu klein oder zu unscharf · versuch ein näheres foto',
  },

  generating: {
    title: 'Dein Look entsteht',
    step1: 'dein foto wird gelesen',
    step2: 'haaransatz wird erfasst',
    step3: 'farbe wird aufgetragen',
    step4: 'licht wird angeglichen',
    summary: 'Auswahl im Überblick',
    style: 'Schnitt',
    colour: 'Farbe',
    cost: 'Kosten',
    oneCredit: '1 Credit',
  },

  result: {
    creditsLeft: 'Noch {{count}} Credits',
    save: 'Sichern',
    saved: 'In deinen Aufnahmen gesichert',
    saveDenied: 'Loxa kann nichts zu deinen Fotos hinzufügen',
    share: 'Teilen',
    again: 'Nochmal · 1 Credit',
    holdToCompare: 'halten zum vergleichen',
    showingOriginal: 'original wird gezeigt',
    originalPhoto: 'originalfoto',
    usePortrait: 'Dieses Foto für dein Profil verwenden?',
    usePortraitYes: 'Foto verwenden',
    usePortraitNo: 'Jetzt nicht',
    portraitSaved: 'Als dein Profilfoto gespeichert',
  },

  paywall: {
    title: 'Keine Credits mehr',
    titleItalic: 'bis Montag.',
    single: 'Noch ein Foto',
    singleNote: 'Eine Generierung, kein Abo',
    weekly: 'Loxa Wöchentlich',
    bestValue: 'bester preis',
    weeklyNote: '{{count}} Fotos jede Woche',
    perWeek: '/Wo',
    notNow: 'Jetzt nicht',
  },

  profile: {
    title: 'Profil',
    changePhoto: 'Dein Foto ändern',
    tapToChangePhoto: 'tippen, um dein foto zu ändern',
    addPhoto: 'Dein Foto hinzufügen',
    tapToAddPhoto: 'tippen, um dein foto hinzuzufügen',
    creditsLeft: 'Verbleibende Credits',
    resetsMonday: 'neu am montag',
    resetsTomorrow: 'neu morgen',
    noRollOver: 'keine übertragung',
    planFree: 'Gratis-Tarif',
    planTrial: 'Gratis-Test',
    planWeekly: 'Loxa Wöchentlich',
    planFreeNote: 'Keine wöchentlichen Credits — {{price}} pro Foto',
    planWeeklyNote: '{{price}} · {{count}} Fotos pro Woche',
    manage: 'Verwalten',
    notifications: 'Tägliche Style-Ideen',
    notificationsNote: 'Eine Mitteilung am Tag, neue Looks',
    restore: 'Käufe wiederherstellen',
    restored: 'Käufe wiederhergestellt',
    rate: 'Loxa bewerten',
    privacy: 'Datenschutzerklärung',
    terms: 'Nutzungsbedingungen',
    language: 'Sprache',
  },

  language: {
    title: 'Sprache',
    note: 'loxa folgt deinem telefon, bis du hier wählst',
  },

  legal: {
    terms: 'Bedingungen',
    privacy: 'Datenschutz',
  },

  notifications: {
    line1: { title: 'Curtain Bangs, an dir', body: 'Zwei Tipps, bevor du dich entscheidest.' },
    line2: { title: 'Heller werden?', body: 'Honigblond und Platin, auf deinem eigenen Foto.' },
    line3: { title: 'Der Bob ist zurück', body: 'Stumpf, kinnlang, ohne Stufen. Probier ihn an.' },
    line4: { title: 'Kupfersaison', body: 'Sieh, wie ein warmes Rot zu deiner Haut steht.' },
    line5: {
      title: 'Kurze Haare, rein hypothetisch',
      body: 'Ein Pixie dauert zehn Sekunden und kostet keine Schere.',
    },
    line6: { title: 'Beach Waves', body: 'Zerzaust, aber mit Absicht. Sieh es an dir.' },
    line7: { title: 'Vielleicht ein Wolf Cut', body: 'Kräftige Stufen, leichter Pony. Einen Blick wert.' },
  },
};

export default de;
