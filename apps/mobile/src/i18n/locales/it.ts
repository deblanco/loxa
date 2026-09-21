import type en from './en';

/** Italian. Informal, like the English. */
const it: typeof en = {
  common: {
    back: 'Indietro',
    cancel: 'Annulla',
    tryAgain: 'Riprova',
    restore: 'Ripristina acquisti',
    restored: 'Acquisti ripristinati',
    restoreNothing: 'Niente da ripristinare',
    restoreFailed: 'Store non raggiungibile',
    confirmingPurchase: 'Conferma dell’acquisto…',
    subscriptionPriceIntro: '{{price}} per la prima settimana, poi {{weekly}} a settimana.',
    subscriptionPrice: '{{weekly}} a settimana.',
    subscriptionTerms:
      'Si rinnova automaticamente salvo disdetta almeno 24 ore prima della fine della settimana, con addebito sul tuo ID Apple. Gestisci o disdici quando vuoi in Impostazioni › ID Apple › Abbonamenti.',
  },

  entry: {
    headline: 'Prova qualsiasi capello',
    headlineItalic: 'prima delle forbici.',
    sub: 'Entra una foto, escono capelli nuovi. Colori, tagli e lunghezze sul tuo viso in pochi secondi.',
    cta: 'Inizia',
    slide: 'Diapositiva {{number}}',
  },

  offer: {
    badgeIntro: 'Offerta per la prima settimana',
    badge: '{{count}} foto a settimana',
    headline: 'Cambia i tuoi capelli',
    headlineSecond: 'venti volte a settimana.',
    perkCredits: '{{count}} foto a settimana, taglio e colore a scelta',
    perkOwnFace: 'Il tuo viso, non una modella di repertorio',
    startIntro: 'Inizia la prima settimana',
    start: 'Abbonati',
    skip: 'Continua senza abbonarti',
  },

  welcome: {
    valueHeadline: 'Il tuo viso,',
    valueHeadlineItalic: 'non una modella.',
    valueBody: '24 tagli e 10 colori, generati sulla foto che ci dai. La tua prima foto è gratis: una, offre la casa.',
    photoHeadline: 'Comincia con',
    photoHeadlineItalic: 'una tua foto.',
    photoBody: 'Salvane una adesso e ogni prova è un tocco solo. Puoi cambiarla quando vuoi, oppure salta e usa una foto più tardi.',
    faceHeadline: 'Leggiamo il viso,',
    faceHeadlineItalic: 'mai la persona.',
    faceBody: 'Il telefono trova il viso nella tua foto e ne misura le proporzioni: la larghezza degli zigomi, la linea della mascella. Quella misura resta sul telefono, e i tagli che le donano vengono prima.',
    notifyHeadline: 'Un taglio da provare,',
    notifyHeadlineItalic: 'una volta al giorno.',
    notifyBody: 'Attivalo e Loxa ti manda una notifica al giorno, alle {{time}}: un look da provare e nient’altro. Puoi disattivarla dal profilo quando vuoi.',
    next: 'Avanti',
    back: 'Indietro',
    skip: 'Salta per ora',
    take: 'Scatta una foto',
    choose: 'Scegli dalla galleria',
    change: 'Cambia foto',
    saved: 'salvata nel tuo profilo',
    privacyNote: 'niente qui ti identifica',
    sealNote: 'Questo segno compare sui tagli che donano al tuo viso.',
    notifyNote: 'programmata su questo telefono, nessun server coinvolto',
    notifyOn: 'Attiva idee di stile ogni giorno',
  },

  consent: {
    /**
     * The question before a photo leaves the phone. Each line is a claim about
     * what the Worker and its providers do, and is checked against the privacy
     * page: change one, change the other, and bump the key's version suffix in
     * `store/consent.ts` so that everybody who agreed to the old wording is asked
     * about the new.
     */
    goesTo: 'Inviata a',
    kept: 'Conservata',
    never: 'Mai inviato',
    agree: 'Accetta e continua',
    decline: 'Non ora',
    renderHeadline: 'Prima di ritoccare',
    renderHeadlineItalic: 'la tua foto.',
    renderGoesTo: 'Un modello di immagini di Google, che la trasforma. Se Google è occupato, OpenRouter esegue lo stesso modello.',
    renderKept: 'Noi non la conserviamo e non la usiamo per addestrare nulla. Il risultato resta 30 giorni, così ripetere una richiesta non ti costa due volte.',
    renderNever: 'Il tuo nome, né niente che dica di chi è la foto.',
    analysisHeadline: 'Prima di guardare',
    analysisHeadlineItalic: 'il tuo viso.',
    analysisGoesTo: 'Un modello di visione IA che la legge, raggiunto tramite opencode. Se non è disponibile, OpenRouter ne usa un altro.',
    analysisKept: 'Noi non conserviamo le foto e non le usiamo per addestrare nulla. La risposta sì, fino a sette giorni.',
    analysisNever: 'Il tuo nome, né niente che dica di chi sono le foto.',
  },

  preview: {
    tryOn: 'Prova',
    takePhotoAndTryOn: 'Scatta la foto e prova',
    takeProfilePhoto: 'Scatta la tua foto profilo',
    tapToTakePhoto: 'tocca per scattare una foto',
    savedPhoto: 'Foto salvata',
    newPhoto: 'Foto nuova',
    profile: 'Profilo',
    setUpProfile: 'Configura il tuo profilo',
    creditsLeft: '{{count}} crediti rimasti',
    offlineHeadline: 'Niente da provare',
    offlineHeadlineItalic: 'per ora.',
    needsConnection: 'loxa ha bisogno di una connessione la prima volta',
  },

  confirm: {
    title: 'Conferma',
    swipeHint: 'scorri per cambiare taglio',
    ownFaces: 'foto tue, o di chi ha detto di sì',
    yourPhoto: 'La tua foto',
  },

  strips: {
    styles: 'Tagli di capelli',
    colours: 'Colori di capelli',
    all: 'Tutti e {{count}}',
    suitedFirst: '{{shape}} · prima quelli adatti',
    suitsYou: 'ti dona',
  },

  camera: {
    title: 'Foto per questo look',
    titleProfile: 'Foto profilo',
    permission: 'Fotocamera',
    permissionBody:
      'Loxa ha bisogno della fotocamera per scattare la tua foto. Niente viene inviato finché non chiedi un look o dei suggerimenti, e prima ti chiediamo il permesso.',
    allow: 'Consenti fotocamera',
    openSettings: 'Apri Impostazioni',
    permissionDenied:
      'Loxa non ha accesso alla fotocamera. Attivalo in Impostazioni, oppure scegli una foto dalla tua galleria.',
    chooseFromLibrary: 'Scegli dalla galleria',
    library: 'galleria',
    hint: 'centra il viso · luce uniforme · capelli raccolti indietro',
    close: 'Chiudi',
    takePhoto: 'Scatta la foto',
    flip: 'Cambia fotocamera',
  },

  error: {
    title: 'Qualcosa',
    titleEmphasis: 'si è staccato',
    body: 'Questa schermata si è fermata prima di finire di disegnarsi. Riprovare di solito basta.',
    renderTitle: 'Quello ci è sfuggito',
    renderBody: 'non siamo riusciti a completarlo · riprova tra un momento',
    renderRejected: 'non è stato possibile usare quella foto · prova con una foto nitida del tuo viso',
    photoFailed: "quella foto non si è aperta · provane un'altra",
  },

  verdict: {
    'no-face': 'nessun viso in questa · riprova',
    'multiple-faces': 'più di un viso · uno alla volta',
    'low-quality': 'troppo piccolo o sfocato · prova una foto più ravvicinata',
  },

  generating: {
    title: 'Sto creando il tuo look',
    step1: 'sto leggendo la tua foto',
    step2: 'sto tracciando l’attaccatura',
    step3: 'sto stendendo il colore',
    step4: 'sto uniformando la luce',
    summary: 'Riepilogo della selezione',
    style: 'Taglio',
    colour: 'Colore',
    cost: 'Costo',
    oneCredit: '1 credito',
  },

  result: {
    save: 'Salva',
    saved: 'Salvata nel tuo rullino',
    saveDenied: 'Loxa non può aggiungere alle tue foto',
    share: 'Condividi',
    again: 'Ancora · 1 credito',
    holdToCompare: 'tieni premuto per confrontare',
    showingOriginal: 'mostro l’originale',
    originalPhoto: 'foto originale',
    usePortrait: 'Usare questa foto sul tuo profilo?',
    usePortraitYes: 'Usa la foto',
    usePortraitNo: 'Non ora',
    portraitSaved: 'Salvata come foto del profilo',
    delete: 'Elimina',
    deleteTitle: 'Eliminare questo look?',
    deleteBody: 'La foto e l’originale da cui è nata vengono cancellate da questo telefono.',
    deleteCancel: 'Annulla',
  },

  paywall: {
    title: 'Crediti finiti',
    untilMonday: 'fino a lunedì.',
    untilTomorrow: 'fino a domani.',
    addMore: 'aggiungine per continuare.',
    single: 'Un’altra foto',
    singleNote: 'Una sola generazione, senza abbonamento',
    weekly: 'Loxa Settimanale',
    bestValue: 'conviene di più',
    weeklyNote: '{{count}} foto ogni settimana',
    perWeek: '/sett',
    notNow: 'Non ora',
  },

  profile: {
    title: 'Profilo',
    changePhoto: 'Cambia la tua foto',
    tapToChangePhoto: 'tocca per cambiare la tua foto',
    addPhoto: 'Aggiungi la tua foto',
    tapToAddPhoto: 'tocca per aggiungere la tua foto',
    creditsLeft: 'Crediti rimasti',
    resetsMonday: 'si rinnovano lunedì',
    resetsTomorrow: 'si rinnovano domani',
    noRollOver: 'le foto settimanali non si accumulano',
    planFree: 'Piano gratuito',
    planWeekly: 'Loxa Settimanale',
    planFreeNote: 'Nessun credito settimanale — {{price}} a foto',
    planWeeklyNote: '{{price}} · {{count}} foto a settimana',
    manage: 'Gestisci',
    subscribe: 'Abbonati',
    notifications: 'Idee di stile ogni giorno',
    notificationsNote: 'Una notifica al giorno, look nuovi',
    rate: 'Valuta Loxa',
    privacy: 'Informativa sulla privacy',
    contact: 'Aiuto e contatti',
    terms: 'Condizioni d’uso',
    language: 'Lingua',
    looks: 'I tuoi look',
    seeAll: 'Vedi tutti',
    faceShape: 'Forma del viso',
    faceShapeNote: 'Misurata su questo telefono dalla tua ultima foto e mai inviata altrove. I tagli che di solito le donano vengono prima.',
    faceShapeNoteAnswer: 'Dal tuo ultimo «Cosa mi dona», conservata su questo telefono. Le foto non sono state conservate. I tagli che di solito le donano vengono prima.',
    faceShapeForget: 'Dimenticala',
    faceShapeKeep: 'OK',
    suits: 'Cosa mi dona',
  },

  faceShape: {
    oval: 'Viso ovale',
    round: 'Viso tondo',
    square: 'Viso squadrato',
    heart: 'Viso a cuore',
    long: 'Viso lungo',
  },

  suits: {
    tile: 'Cosa mi dona?',
    tileHint: 'Cosa mi dona',
    title: 'Cosa mi dona',
    headline: 'Quali tagli donano',
    headlineItalic: 'al tuo viso.',
    note: 'Scatta o scegli una foto del tuo viso. Una seconda da un altro angolo affina la risposta, ed è facoltativa. Le foto le legge un modello di IA; prima della prima ti chiediamo il permesso.',
    slotFront: 'Il tuo viso, di fronte',
    slotAngle: 'Un altro angolo (facoltativo)',
    take: 'Scatta una foto',
    choose: 'Galleria',
    replace: 'Cambia',
    go: 'Chiedi',
    working: 'Sto leggendo il tuo viso',
    workingItalic: 'un momento.',
    resultNote: 'Stimato dalla tua foto. Un suggerimento, non una regola.',
    again: 'Chiedi di nuovo',
    tryOn: 'Prova',
    failed: 'Non ha funzionato. Prova una foto nitida del tuo viso, guardando dritto in camera.',
    included: 'Incluso se hai crediti: non ne consuma nessuno.',
  },

  looks: {
    title: 'I tuoi look',
    emptyHeadline: 'Ancora niente',
    emptyHeadlineItalic: 'qui.',
    emptyNote: 'Ogni foto che crei resta qui, su questo telefono.',
    start: 'Prova un taglio',
  },

  language: {
    title: 'Lingua',
    note: 'loxa segue il tuo telefono finché non scegli qui',
  },

  legal: {
    terms: 'Condizioni',
    privacy: 'Privacy',
  },

  notifications: {
    line1: { title: 'Frangia a tendina, su di te', body: 'Due tocchi per vederla prima di decidere.' },
    line2: { title: 'Schiarisci?', body: 'Biondo miele e platino, sulla tua foto.' },
    line3: { title: 'Il caschetto è tornato', body: 'Netto, al mento, senza scalature. Provalo.' },
    line4: { title: 'Stagione ramata', body: 'Guarda come sta un rosso caldo sulla tua pelle.' },
    line5: {
      title: 'Capelli corti, per ipotesi',
      body: 'Un pixie richiede dieci secondi e nessuna forbice.',
    },
    line6: { title: 'Onde da spiaggia', body: 'Spettinato, ma di proposito. Guardalo su di te.' },
    line7: { title: 'Un wolf cut, forse', body: 'Scalature decise, frangia leggera. Vale un’occhiata.' },
  },
};

export default it;
