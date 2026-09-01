import type en from './en';

/** French. Tutoiement, like the English — the app is not a bank. */
const fr: typeof en = {
  common: {
    back: 'Retour',
    cancel: 'Annuler',
    tryAgain: 'Réessayer',
    restore: 'Restaurer les achats',
    restored: 'Achats restaurés',
    restoreNothing: 'Rien à restaurer',
    restoreFailed: 'Boutique injoignable',
    subscriptionTermsIntro:
      '{{price}} la première semaine, puis {{weekly}} par semaine. Se renouvelle automatiquement sauf résiliation au moins 24 heures avant la fin de la semaine ; le paiement est débité de ton compte Apple.',
    subscriptionTerms:
      '{{weekly}} par semaine. Se renouvelle automatiquement sauf résiliation au moins 24 heures avant la fin de la semaine ; le paiement est débité de ton compte Apple.',
  },

  entry: {
    headline: 'Essaie tous les cheveux',
    headlineItalic: 'avant les ciseaux.',
    sub: 'Une photo entre, une autre coiffure sort. Couleurs, coupes et longueurs sur ton propre visage en quelques secondes.',
    cta: 'Commencer',
    slide: 'Diapositive {{number}}',
  },

  offer: {
    badgeIntro: 'Première semaine {{price}}',
    badge: '{{count}} photos par semaine',
    headline: 'Change de cheveux',
    headlineSecond: 'vingt fois par semaine.',
    perkCredits: '{{count}} photos par semaine, coupe et couleur au choix',
    perkOwnFace: 'Ton propre visage, pas un mannequin de banque d’images',
    perkDaily: 'De nouveaux looks chaque jour',
    startIntro: 'Commencer pour {{price}}',
    start: 'S’abonner',
    skip: 'Continuer sans abonnement',
  },

  preview: {
    tryOn: 'Essayer',
    takePhotoAndTryOn: 'Prendre une photo et essayer',
    takeProfilePhoto: 'Prendre une photo de profil',
    tapToTakePhoto: 'touche pour prendre une photo',
    savedPhoto: 'Photo enregistrée',
    newPhoto: 'Nouvelle photo',
    profile: 'Profil',
    setUpProfile: 'Configure ton profil',
    creditsLeft: '{{count}} crédits restants',
    offlineHeadline: 'Rien à essayer',
    offlineHeadlineItalic: 'pour l’instant.',
    needsConnection: 'loxa a besoin d’une connexion la première fois',
  },

  confirm: {
    title: 'Confirmer',
    swipeHint: 'balaie pour changer de coupe',
    yourPhoto: 'Ta photo',
  },

  strips: {
    styles: 'Coupes de cheveux',
    colours: 'Couleurs de cheveux',
    all: 'Les {{count}}',
  },

  camera: {
    title: 'Photo pour ce look',
    titleProfile: 'Nouvelle photo de profil',
    permission: 'Appareil photo',
    permissionBody:
      'Loxa a besoin de l’appareil photo pour prendre la photo qu’il transforme. Rien n’est envoyé tant que tu n’as pas appuyé sur Essayer.',
    allow: 'Autoriser l’appareil photo',
    openSettings: 'Ouvrir Réglages',
    permissionDenied:
      "Loxa n'a pas accès à l'appareil photo. Active-le dans Réglages, ou choisis une photo dans ta galerie.",
    chooseFromLibrary: 'Choisir dans la galerie',
    library: 'galerie',
    hint: 'centre ton visage · lumière uniforme · cheveux attachés en arrière',
    close: 'Fermer',
    takePhoto: 'Prendre la photo',
    flip: 'Changer d’appareil',
  },

  error: {
    title: 'Quelque chose',
    titleEmphasis: "s'est détaché",
    body: "Cet écran s'est arrêté avant la fin de l'affichage. Réessayer suffit généralement.",
    renderTitle: 'Celui-ci nous a échappé',
    renderBody: "nous n'avons pas pu le terminer · réessayez dans un instant",
    photoFailed: "cette photo n'a pas pu s'ouvrir · essayez-en une autre",
  },

  verdict: {
    'no-face': 'aucun visage sur celle-ci · réessaie',
    'multiple-faces': 'plus d’un visage · un seul à la fois',
    'low-quality': 'trop petit ou trop flou · essaie une photo de plus près',
  },

  generating: {
    title: 'Création de ton look',
    step1: 'lecture de ta photo',
    step2: 'tracé de la racine des cheveux',
    step3: 'application de la couleur',
    step4: 'ajustement de la lumière',
    summary: 'Récapitulatif de la sélection',
    style: 'Coupe',
    colour: 'Couleur',
    cost: 'Coût',
    oneCredit: '1 crédit',
  },

  result: {
    save: 'Enregistrer',
    saved: 'Enregistrée dans ta pellicule',
    saveDenied: 'Loxa ne peut pas ajouter à tes photos',
    share: 'Partager',
    again: 'Encore · 1 crédit',
    holdToCompare: 'maintiens pour comparer',
    showingOriginal: 'photo d’origine affichée',
    originalPhoto: 'photo d’origine',
    usePortrait: 'Utiliser cette photo sur votre profil ?',
    usePortraitYes: 'Utiliser la photo',
    usePortraitNo: 'Pas maintenant',
    portraitSaved: 'Enregistrée comme photo de profil',
  },

  paywall: {
    title: 'Plus de crédits',
    untilMonday: 'jusqu’à lundi.',
    untilTomorrow: 'jusqu’à demain.',
    single: 'Une photo de plus',
    singleNote: 'Une seule génération, sans abonnement',
    weekly: 'Loxa Hebdo',
    bestValue: 'meilleur prix',
    weeklyNote: '{{count}} photos chaque semaine',
    perWeek: '/sem',
    notNow: 'Pas maintenant',
  },

  profile: {
    title: 'Profil',
    changePhoto: 'Changer ta photo',
    tapToChangePhoto: 'touche pour changer ta photo',
    addPhoto: 'Ajouter ta photo',
    tapToAddPhoto: 'touche pour ajouter ta photo',
    creditsLeft: 'Crédits restants',
    resetsMonday: 'renouvelés lundi',
    resetsTomorrow: 'renouvelés demain',
    noRollOver: 'non reportables',
    planFree: 'Formule gratuite',
    planWeekly: 'Loxa Hebdo',
    planFreeNote: 'Pas de crédits hebdomadaires — {{price}} par photo',
    planWeeklyNote: '{{price}} · {{count}} photos par semaine',
    manage: 'Gérer',
    subscribe: "S'abonner",
    notifications: 'Idées coiffure du jour',
    notificationsNote: 'Une notification par jour, de nouveaux looks',
    rate: 'Noter Loxa',
    privacy: 'Politique de confidentialité',
    terms: 'Conditions d’utilisation',
    language: 'Langue',
  },

  language: {
    title: 'Langue',
    note: 'loxa suit ton téléphone jusqu’à ce que tu choisisses ici',
  },

  legal: {
    terms: 'Conditions',
    privacy: 'Confidentialité',
  },

  notifications: {
    line1: { title: 'Le rideau, sur toi', body: 'Deux touches pour le voir avant de te lancer.' },
    line2: { title: 'On éclaircit ?', body: 'Blond miel et platine, sur ta propre photo.' },
    line3: { title: 'Le carré revient', body: 'Net, au menton, sans dégradé. Essaie-le.' },
    line4: { title: 'Saison cuivrée', body: 'Regarde ce que donne un roux chaud sur ta peau.' },
    line5: {
      title: 'Cheveux courts, en théorie',
      body: 'Une coupe pixie prend dix secondes et aucun ciseau.',
    },
    line6: { title: 'Ondulations de plage', body: 'Décoiffé, mais volontairement. Vois-le sur toi.' },
    line7: {
      title: 'Un wolf cut, peut-être',
      body: 'Dégradé marqué, frange effilée. Ça vaut un coup d’œil.',
    },
  },
};

export default fr;
