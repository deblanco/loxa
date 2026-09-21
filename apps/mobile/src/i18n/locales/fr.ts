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
    confirmingPurchase: 'Confirmation de votre achat…',
    subscriptionPriceIntro: '{{price}} la première semaine, puis {{weekly}} par semaine.',
    subscriptionPrice: '{{weekly}} par semaine.',
    subscriptionTerms:
      'Se renouvelle automatiquement sauf résiliation au moins 24 heures avant la fin de la semaine ; le paiement est débité de ton compte Apple. Gère ou résilie à tout moment dans Réglages › ton compte Apple › Abonnements.',
  },

  entry: {
    headline: 'Essaie tous les cheveux',
    headlineItalic: 'avant les ciseaux.',
    sub: 'Une photo entre, une autre coiffure sort. Couleurs, coupes et longueurs sur ton propre visage en quelques secondes.',
    cta: 'Commencer',
    slide: 'Diapositive {{number}}',
  },

  offer: {
    badgeIntro: 'Offre de la première semaine',
    badge: '{{count}} photos par semaine',
    headline: 'Change de cheveux',
    headlineSecond: 'vingt fois par semaine.',
    perkCredits: '{{count}} photos par semaine, coupe et couleur au choix',
    perkOwnFace: 'Ton propre visage, pas un mannequin de banque d’images',
    startIntro: 'Commencer la première semaine',
    start: 'S’abonner',
    skip: 'Continuer sans abonnement',
  },

  welcome: {
    valueHeadline: 'Ton propre visage,',
    valueHeadlineItalic: 'pas un mannequin.',
    valueBody: '24 coupes et 10 couleurs, générées sur la photo que tu donnes. Ta première photo est offerte : une, c’est la maison.',
    photoHeadline: 'Commence par',
    photoHeadlineItalic: 'une photo de toi.',
    photoBody: 'Enregistres-en une maintenant et chaque essai tient en un geste. Tu peux la changer quand tu veux, ou passer et utiliser une photo plus tard.',
    faceHeadline: 'On lit le visage,',
    faceHeadlineItalic: 'jamais la personne.',
    faceBody: 'Ton téléphone trouve le visage sur ta photo et mesure ses proportions : la largeur des pommettes, la ligne de la mâchoire. Cette mesure reste sur le téléphone, et les coupes qui lui vont passent en premier.',
    notifyHeadline: 'Une coupe à essayer,',
    notifyHeadlineItalic: 'une fois par jour.',
    notifyBody: 'Active-le et Loxa t’envoie une notification par jour, à {{time}} : un look à essayer, rien d’autre. Tu peux la désactiver dans ton profil quand tu veux.',
    next: 'Suivant',
    back: 'Retour',
    skip: 'Passer pour l’instant',
    take: 'Prendre une photo',
    choose: 'Choisir dans la galerie',
    change: 'Changer la photo',
    saved: 'enregistrée dans ton profil',
    privacyNote: 'rien ici ne t’identifie',
    sealNote: 'Cette marque apparaît sur les coupes qui vont à ton visage.',
    notifyNote: 'programmée sur ce téléphone, aucun serveur impliqué',
    notifyOn: 'Activer les idées coiffure du jour',
  },

  consent: {
    /**
     * The question before a photo leaves the phone. Each line is a claim about
     * what the Worker and its providers do, and is checked against the privacy
     * page: change one, change the other, and bump the key's version suffix in
     * `store/consent.ts` so that everybody who agreed to the old wording is asked
     * about the new.
     */
    goesTo: 'Envoyée à',
    kept: 'Conservée',
    never: 'Jamais envoyé',
    agree: 'Accepter et continuer',
    decline: 'Pas maintenant',
    renderHeadline: 'Avant de retoucher',
    renderHeadlineItalic: 'ta photo.',
    renderGoesTo: 'Un modèle d’image de Google, qui la transforme. Si Google est occupé, l’un de nos partenaires exécute le même modèle (nommé dans notre politique de confidentialité).',
    renderKept: 'Nous ne la conservons pas et ne l’utilisons pas pour entraîner quoi que ce soit. Le résultat est conservé 30 jours, donc refaire une demande ne te coûte pas deux fois.',
    renderNever: 'Ton nom, ni rien qui dise à qui est la photo.',
    analysisHeadline: 'Avant de regarder',
    analysisHeadlineItalic: 'ton visage.',
    analysisGoesTo: 'Un modèle de vision IA qui la lit, exploité par l’un de nos partenaires (nommé dans notre politique de confidentialité). S’il est indisponible, un autre partenaire en utilise un autre.',
    analysisKept: 'Nous ne conservons pas les photos et ne les utilisons pas pour entraîner quoi que ce soit. La réponse, elle, est conservée jusqu’à sept jours.',
    analysisNever: 'Ton nom, ni rien qui dise à qui sont les photos.',
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
    ownFaces: 'des photos de toi, ou de quelqu’un qui a accepté',
    yourPhoto: 'Ta photo',
  },

  strips: {
    styles: 'Coupes de cheveux',
    colours: 'Couleurs de cheveux',
    all: 'Les {{count}}',
    suitedFirst: '{{shape}} · ce qui te va d’abord',
    suitsYou: 'te va',
  },

  camera: {
    title: 'Photo pour ce look',
    titleProfile: 'Photo de profil',
    permission: 'Appareil photo',
    permissionBody:
      'Loxa a besoin de l’appareil photo pour prendre ta photo. Rien n’est envoyé tant que tu ne demandes pas un look ou des suggestions, et nous te le demandons d’abord.',
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
    renderRejected: 'cette photo n’a pas pu être utilisée · essayez avec une photo nette de votre visage',
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
    delete: 'Supprimer',
    deleteTitle: 'Supprimer ce look ?',
    deleteBody: 'La photo et l’originale dont elle est tirée sont effacées de ce téléphone.',
    deleteCancel: 'Annuler',
  },

  paywall: {
    title: 'Plus de crédits',
    untilMonday: 'jusqu’à lundi.',
    untilTomorrow: 'jusqu’à demain.',
    addMore: 'ajoute-en pour continuer.',
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
    noRollOver: 'les photos hebdo ne se reportent pas',
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
    contact: 'Aide et contact',
    terms: 'Conditions d’utilisation',
    language: 'Langue',
    looks: 'Tes looks',
    seeAll: 'Tout voir',
    faceShape: 'Forme du visage',
    faceShapeNote: 'Mesurée sur ce téléphone à partir de ta dernière photo, et jamais envoyée nulle part. Les coupes qui lui vont souvent passent en premier.',
    faceShapeNoteAnswer: 'Issue de ton dernier « Ce qui me va », conservée sur ce téléphone. Les photos n’ont pas été conservées. Les coupes qui lui vont souvent passent en premier.',
    faceShapeForget: 'L’oublier',
    faceShapeKeep: 'OK',
    suits: 'Ce qui me va',
  },

  faceShape: {
    oval: 'Visage ovale',
    round: 'Visage rond',
    square: 'Visage carré',
    heart: 'Visage en cœur',
    long: 'Visage long',
  },

  suits: {
    tile: 'Ça me va ?',
    tileHint: 'Ce qui me va',
    title: 'Ce qui me va',
    headline: 'Les coupes qui vont',
    headlineItalic: 'à ton visage.',
    note: 'Prends ou choisis une photo de ton visage. Une seconde sous un autre angle affine la réponse, et reste facultative. Les photos sont lues par un modèle d’IA ; nous te demandons avant la première.',
    slotFront: 'Ton visage, de face',
    slotAngle: 'Un autre angle (facultatif)',
    take: 'Prendre une photo',
    choose: 'Galerie',
    replace: 'Changer',
    go: 'Demander',
    working: 'Lecture de ton visage',
    workingItalic: 'un instant.',
    resultNote: 'Estimé à partir de ta photo. Une suggestion, pas une règle.',
    again: 'Redemander',
    tryOn: 'Essayer',
    failed: 'Ça n’a pas marché. Essaie une photo nette de ton visage, face à l’appareil.',
    included: 'Inclus dès que tu as des crédits : cela n’en coûte aucun.',
  },

  looks: {
    title: 'Tes looks',
    emptyHeadline: 'Rien ici',
    emptyHeadlineItalic: 'pour l’instant.',
    emptyNote: 'Chaque photo que tu crées est gardée ici, sur ce téléphone.',
    start: 'Essayer une coupe',
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
