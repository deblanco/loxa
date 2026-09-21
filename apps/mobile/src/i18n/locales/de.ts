import type en from './en';

/** German. Duzen, like the English — this is an app about haircuts. */
const de: typeof en = {
  common: {
    back: 'Zurück',
    cancel: 'Abbrechen',
    tryAgain: 'Erneut versuchen',
    restore: 'Käufe wiederherstellen',
    restored: 'Käufe wiederhergestellt',
    restoreNothing: 'Nichts wiederherzustellen',
    restoreFailed: 'Store nicht erreichbar',
    confirmingPurchase: 'Kauf wird bestätigt…',
    subscriptionPriceIntro: '{{price}} für die erste Woche, danach {{weekly}} pro Woche.',
    subscriptionPrice: '{{weekly}} pro Woche.',
    subscriptionTerms:
      'Verlängert sich automatisch, sofern nicht mindestens 24 Stunden vor Ablauf der Woche gekündigt wird; die Abbuchung erfolgt über deine Apple-ID. Jederzeit verwalten oder kündigen unter Einstellungen › Apple-ID › Abonnements.',
  },

  entry: {
    headline: 'Probier jede Frisur',
    headlineItalic: 'vor der Schere.',
    sub: 'Foto rein, neue Haare raus. Farben, Schnitte und Längen auf deinem eigenen Gesicht, in Sekunden.',
    cta: 'Los geht’s',
    slide: 'Folie {{number}}',
  },

  offer: {
    badgeIntro: 'Angebot für die erste Woche',
    badge: '{{count}} Fotos pro Woche',
    headline: 'Ändere deine Haare',
    headlineSecond: 'zwanzigmal pro Woche.',
    perkCredits: '{{count}} Fotos pro Woche, jeder Schnitt und jede Farbe',
    perkOwnFace: 'Dein eigenes Gesicht, kein Stockmodel',
    startIntro: 'Erste Woche starten',
    start: 'Abonnieren',
    skip: 'Ohne Abo fortfahren',
  },

  welcome: {
    valueHeadline: 'Dein eigenes Gesicht,',
    valueHeadlineItalic: 'kein Model.',
    valueBody: '24 Schnitte und 10 Farben, erzeugt auf dem Foto, das du gibst. Dein erstes Foto ist gratis — eines, aufs Haus.',
    photoHeadline: 'Fang mit',
    photoHeadlineItalic: 'einem Foto von dir an.',
    photoBody: 'Speichere jetzt eines, und jedes Ausprobieren ist ein Tippen. Du kannst es jederzeit ändern oder das überspringen und später ein Foto nehmen.',
    faceHeadline: 'Wir lesen das Gesicht,',
    faceHeadlineItalic: 'nie die Person.',
    faceBody: 'Dein Telefon findet das Gesicht auf deinem Foto und misst seine Proportionen: die Breite der Wangen, die Linie des Kiefers. Diese Messung bleibt auf dem Telefon, und die passenden Schnitte stehen vorne.',
    notifyHeadline: 'Ein Schnitt am Tag,',
    notifyHeadlineItalic: 'zum Ausprobieren.',
    notifyBody: 'Schalte es ein, und Loxa schickt dir einmal am Tag um {{time}} eine Benachrichtigung: ein Look zum Ausprobieren, sonst nichts. Du kannst sie jederzeit in deinem Profil ausschalten.',
    next: 'Weiter',
    back: 'Zurück',
    skip: 'Später',
    take: 'Foto machen',
    choose: 'Aus der Mediathek',
    change: 'Foto ändern',
    saved: 'in deinem profil gespeichert',
    privacyNote: 'nichts davon identifiziert dich',
    sealNote: 'Dieses Zeichen steht auf den Schnitten, die zu deinem Gesicht passen.',
    notifyNote: 'auf diesem telefon geplant, kein server beteiligt',
    notifyOn: 'Tägliche Style-Ideen einschalten',
  },

  consent: {
    /**
     * The question before a photo leaves the phone. Each line is a claim about
     * what the Worker and its providers do, and is checked against the privacy
     * page: change one, change the other, and bump the key's version suffix in
     * `store/consent.ts` so that everybody who agreed to the old wording is asked
     * about the new.
     */
    goesTo: 'Geht an',
    kept: 'Gespeichert',
    never: 'Nie gesendet',
    agree: 'Zustimmen und weiter',
    decline: 'Nicht jetzt',
    renderHeadline: 'Bevor wir dein',
    renderHeadlineItalic: 'Foto umstylen.',
    renderGoesTo: 'Ein Bildmodell von Google, das es umstylt. Ist Google ausgelastet, führt einer unserer Partner dasselbe Modell aus (in unserer Datenschutzerklärung genannt).',
    renderKept: 'Wir speichern es nicht und trainieren nichts damit. Das fertige Ergebnis bleibt 30 Tage erhalten, damit dich eine Wiederholung nicht doppelt kostet.',
    renderNever: 'Dein Name oder irgendetwas, das sagt, wessen Foto es ist.',
    analysisHeadline: 'Bevor wir dein',
    analysisHeadlineItalic: 'Gesicht ansehen.',
    analysisGoesTo: 'Ein KI-Modell, das es liest und von einem unserer Partner betrieben wird (in unserer Datenschutzerklärung genannt). Ist es nicht erreichbar, nimmt ein anderer Partner ein anderes.',
    analysisKept: 'Wir speichern die Fotos nicht und trainieren nichts damit. Die Antwort wird bis zu sieben Tage gespeichert.',
    analysisNever: 'Dein Name oder irgendetwas, das sagt, wessen Fotos es sind.',
  },

  preview: {
    tryOn: 'Anprobieren',
    takePhotoAndTryOn: 'Foto machen & anprobieren',
    takeProfilePhoto: 'Profilfoto machen',
    tapToTakePhoto: 'tippen, um ein foto zu machen',
    savedPhoto: 'Gespeichertes Foto',
    newPhoto: 'Neues Foto',
    profile: 'Profil',
    setUpProfile: 'Profil einrichten',
    creditsLeft: 'Noch {{count}} Credits',
    offlineHeadline: 'Noch nichts',
    offlineHeadlineItalic: 'zum Ausprobieren.',
    needsConnection: 'loxa braucht beim ersten mal eine verbindung',
  },

  confirm: {
    title: 'Bestätigen',
    swipeHint: 'wischen für einen anderen schnitt',
    ownFaces: 'fotos von dir oder von jemandem, der zugestimmt hat',
    yourPhoto: 'Dein Foto',
  },

  strips: {
    styles: 'Haarschnitte',
    colours: 'Haarfarben',
    all: 'Alle {{count}}',
    suitedFirst: '{{shape}} · Passendes zuerst',
    suitsYou: 'passt dir',
  },

  camera: {
    title: 'Foto für diesen Look',
    titleProfile: 'Profilfoto',
    permission: 'Kamera',
    permissionBody:
      'Loxa braucht die Kamera für dein Foto. Nichts wird gesendet, bis du einen Look oder Vorschläge anforderst – und vorher fragen wir dich.',
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

  error: {
    title: 'Etwas',
    titleEmphasis: 'hat sich gelöst',
    body: 'Dieser Bildschirm hat angehalten, bevor er fertig gezeichnet war. Ein neuer Versuch hilft meistens.',
    renderTitle: 'Der ist uns entwischt',
    renderBody: 'wir konnten es nicht abschließen · versuche es gleich noch einmal',
    renderRejected: 'dieses foto ließ sich nicht verwenden · versuch es mit einem klaren foto deines gesichts',
    photoFailed: 'dieses Foto ließ sich nicht öffnen · versuche ein anderes',
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
    delete: 'Löschen',
    deleteTitle: 'Diesen Look löschen?',
    deleteBody: 'Das Foto und das Original, aus dem es entstand, werden von diesem Telefon gelöscht.',
    deleteCancel: 'Abbrechen',
  },

  paywall: {
    title: 'Keine Credits mehr',
    untilMonday: 'bis Montag.',
    untilTomorrow: 'bis morgen.',
    addMore: 'hol dir mehr, um weiterzumachen.',
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
    noRollOver: 'wöchentliche fotos werden nicht übertragen',
    planFree: 'Gratis-Tarif',
    planWeekly: 'Loxa Wöchentlich',
    planFreeNote: 'Keine wöchentlichen Credits — {{price}} pro Foto',
    planWeeklyNote: '{{price}} · {{count}} Fotos pro Woche',
    manage: 'Verwalten',
    subscribe: 'Abonnieren',
    notifications: 'Tägliche Style-Ideen',
    notificationsNote: 'Eine Mitteilung am Tag, neue Looks',
    rate: 'Loxa bewerten',
    privacy: 'Datenschutzerklärung',
    contact: 'Hilfe & Kontakt',
    terms: 'Nutzungsbedingungen',
    language: 'Sprache',
    looks: 'Deine Looks',
    seeAll: 'Alle ansehen',
    faceShape: 'Gesichtsform',
    faceShapeNote: 'Auf diesem Telefon aus deinem letzten Foto gemessen und nirgendwohin gesendet. Schnitte, die oft dazu passen, stehen vorne.',
    faceShapeNoteAnswer: 'Aus deinem letzten „Was mir passt“, auf diesem Telefon gespeichert. Die Fotos wurden nicht gespeichert. Schnitte, die oft dazu passen, stehen vorne.',
    faceShapeForget: 'Vergessen',
    faceShapeKeep: 'OK',
    suits: 'Was mir passt',
  },

  faceShape: {
    oval: 'Ovales Gesicht',
    round: 'Rundes Gesicht',
    square: 'Eckiges Gesicht',
    heart: 'Herzförmiges Gesicht',
    long: 'Langes Gesicht',
  },

  suits: {
    tile: 'Was passt mir?',
    tileHint: 'Was mir passt',
    title: 'Was mir passt',
    headline: 'Welche Schnitte zu',
    headlineItalic: 'deinem Gesicht passen.',
    note: 'Mach oder wähle ein Foto deines Gesichts. Ein zweites aus einem anderen Winkel schärft die Antwort und ist optional. Die Fotos liest ein KI-Modell – vor dem ersten fragen wir dich.',
    slotFront: 'Dein Gesicht, von vorn',
    slotAngle: 'Anderer Winkel (optional)',
    take: 'Foto machen',
    choose: 'Mediathek',
    replace: 'Ändern',
    go: 'Fragen',
    working: 'Dein Gesicht wird gelesen',
    workingItalic: 'einen Moment.',
    resultNote: 'Aus deinem Foto geschätzt. Ein Vorschlag, keine Regel.',
    again: 'Noch einmal fragen',
    tryOn: 'Ausprobieren',
    failed: 'Das hat nicht geklappt. Versuch ein scharfes Foto deines Gesichts, direkt in die Kamera.',
    included: 'Enthalten, sobald du Credits hast — das kostet keinen.',
  },

  looks: {
    title: 'Deine Looks',
    emptyHeadline: 'Noch nichts',
    emptyHeadlineItalic: 'hier.',
    emptyNote: 'Jedes Foto, das du machst, bleibt hier, auf diesem Telefon.',
    start: 'Einen Schnitt ausprobieren',
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
