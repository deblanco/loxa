import type en from './en';

/** Italian. Informal, like the English. */
const it: typeof en = {
  common: {
    back: 'Indietro',
    cancel: 'Annulla',
    tryAgain: 'Riprova',
  },

  entry: {
    headline: 'Prova qualsiasi capello',
    headlineItalic: 'prima delle forbici.',
    sub: 'Entra una foto, escono capelli nuovi. Colori, tagli e lunghezze sul tuo viso in pochi secondi.',
    cta: 'Inizia',
    slide: 'Diapositiva {{number}}',
  },

  offer: {
    badgeIntro: 'Prima settimana {{price}}',
    badge: '{{count}} foto a settimana',
    headline: 'Cambia i tuoi capelli',
    headlineSecond: 'venti volte a settimana.',
    perkCredits: '{{count}} foto a settimana, taglio e colore a scelta',
    perkOwnFace: 'Il tuo viso, non una modella di repertorio',
    perkDaily: 'Look nuovi ogni giorno',
    startIntro: 'Inizia con {{price}}',
    start: 'Abbonati',
    skip: 'Continua senza abbonarti',
    termsIntro:
      '{{price}} la prima settimana, poi {{weekly}} a settimana · {{count}} foto a settimana · disdici quando vuoi',
    terms: '{{weekly}} a settimana · {{count}} foto a settimana · disdici quando vuoi',
  },

  preview: {
    tryOn: 'Prova',
    takePhotoAndTryOn: 'Scatta la foto e prova',
    tapToChoose: 'tocca per scegliere una foto',
    savedPhoto: 'Foto salvata',
    newPhoto: 'Foto nuova',
    newPhotoTaken: 'Foto nuova ✓',
    profile: 'Profilo',
    setUpProfile: 'Configura il tuo profilo',
    creditsLeft: '{{count}} crediti rimasti',
    catalogueUnavailable: 'il catalogo non è disponibile',
    needsConnection: 'loxa ha bisogno di una connessione la prima volta',
  },

  strips: {
    styles: 'Tagli di capelli',
    colours: 'Colori di capelli',
    all: 'Tutti e {{count}}',
  },

  camera: {
    title: 'Foto per questo look',
    titleProfile: 'Nuova foto profilo',
    permission: 'Fotocamera',
    permissionBody:
      'Loxa ha bisogno della fotocamera per scattare la foto che trasforma. Niente viene caricato finché non premi Prova.',
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
    creditsLeft: '{{count}} crediti rimasti',
    save: 'Salva',
    saved: 'Salvata nel tuo rullino',
    saveDenied: 'Loxa non può aggiungere alle tue foto',
    share: 'Condividi',
    again: 'Ancora · 1 credito',
    holdToCompare: 'tieni premuto per confrontare',
    showingOriginal: 'mostro l’originale',
    originalPhoto: 'foto originale',
  },

  paywall: {
    title: 'Crediti finiti',
    titleItalic: 'fino a lunedì.',
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
    noRollOver: 'non si accumulano',
    planFree: 'Piano gratuito',
    planTrial: 'Prova gratuita',
    planWeekly: 'Loxa Settimanale',
    planFreeNote: 'Nessun credito settimanale — {{price}} a foto',
    planWeeklyNote: '{{price}} · {{count}} foto a settimana',
    manage: 'Gestisci',
    notifications: 'Idee di stile ogni giorno',
    notificationsNote: 'Una notifica al giorno, look nuovi',
    restore: 'Ripristina acquisti',
    restored: 'Acquisti ripristinati',
    rate: 'Valuta Loxa',
    privacy: 'Informativa sulla privacy',
    terms: 'Condizioni d’uso',
    language: 'Lingua',
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
