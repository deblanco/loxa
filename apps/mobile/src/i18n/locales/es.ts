import type en from './en';

/** Spanish. Peninsular, tuteo — the app talks to one person about their hair. */
const es: typeof en = {
  common: {
    back: 'Atrás',
    cancel: 'Cancelar',
    tryAgain: 'Reintentar',
  },

  entry: {
    headline: 'Prueba cualquier pelo',
    headlineItalic: 'antes de las tijeras.',
    sub: 'Entra una foto, sale otro pelo. Colores, cortes y largos en tu propia cara en segundos.',
    cta: 'Empezar',
    slide: 'Diapositiva {{number}}',
  },

  offer: {
    badgeIntro: 'Primera semana {{price}}',
    badge: '{{count}} fotos por semana',
    headline: 'Cámbiate el pelo',
    headlineSecond: 'veinte veces por semana.',
    perkCredits: '{{count}} fotos por semana, el corte y el color que quieras',
    perkOwnFace: 'Tu propia cara, no una modelo de banco de imágenes',
    perkDaily: 'Looks nuevos cada día',
    startIntro: 'Empezar por {{price}}',
    start: 'Suscribirse',
    skip: 'Continuar sin suscribirse',
    termsIntro:
      '{{price}} la primera semana, luego {{weekly}} por semana · {{count}} fotos por semana · cancela cuando quieras',
    terms: '{{weekly}} por semana · {{count}} fotos por semana · cancela cuando quieras',
  },

  preview: {
    tryOn: 'Probar',
    takePhotoAndTryOn: 'Hacer foto y probar',
    takeProfilePhoto: 'Hacer tu foto de perfil',
    tapToTakePhoto: 'toca para hacer una foto',
    savedPhoto: 'Foto guardada',
    newPhoto: 'Foto nueva',
    profile: 'Perfil',
    setUpProfile: 'Configura tu perfil',
    creditsLeft: '{{count}} créditos restantes',
    offlineHeadline: 'Nada que probar',
    offlineHeadlineItalic: 'por ahora.',
    needsConnection: 'loxa necesita conexión la primera vez',
  },

  confirm: {
    title: 'Confirmar',
    swipeHint: 'desliza para cambiar el corte',
    yourPhoto: 'Tu foto',
  },

  strips: {
    styles: 'Cortes de pelo',
    colours: 'Colores de pelo',
    all: 'Los {{count}}',
  },

  camera: {
    title: 'Foto para este look',
    titleProfile: 'Nueva foto de perfil',
    permission: 'Cámara',
    permissionBody:
      'Loxa necesita la cámara para hacer la foto que va a transformar. No se sube nada hasta que pulses Probar.',
    allow: 'Permitir cámara',
    openSettings: 'Abrir Ajustes',
    permissionDenied:
      'Loxa no tiene acceso a la cámara. Actívalo en Ajustes o elige una foto de tu galería.',
    chooseFromLibrary: 'Elegir de la galería',
    library: 'galería',
    hint: 'centra la cara · luz uniforme · pelo recogido hacia atrás',
    close: 'Cerrar',
    takePhoto: 'Hacer foto',
    flip: 'Cambiar de cámara',
  },

  verdict: {
    'no-face': 'no hay cara en esa · inténtalo otra vez',
    'multiple-faces': 'hay más de una cara · de una en una',
    'low-quality': 'muy pequeña o borrosa · prueba una foto más cerca',
  },

  generating: {
    title: 'Generando tu look',
    step1: 'leyendo tu foto',
    step2: 'trazando el nacimiento del pelo',
    step3: 'pintando el color',
    step4: 'igualando la luz',
    summary: 'Resumen de la selección',
    style: 'Corte',
    colour: 'Color',
    cost: 'Coste',
    oneCredit: '1 crédito',
  },

  result: {
    save: 'Guardar',
    saved: 'Guardada en tu carrete',
    saveDenied: 'Loxa no puede añadir a tus fotos',
    share: 'Compartir',
    again: 'Otra vez · 1 crédito',
    holdToCompare: 'mantén para comparar',
    showingOriginal: 'mostrando la original',
    originalPhoto: 'foto original',
    usePortrait: '¿Usar esta foto en tu perfil?',
    usePortraitYes: 'Usar foto',
    usePortraitNo: 'Ahora no',
    portraitSaved: 'Guardada como tu foto de perfil',
  },

  paywall: {
    title: 'Sin créditos',
    titleItalic: 'hasta el lunes.',
    single: 'Una foto más',
    singleNote: 'Una sola generación, sin suscripción',
    weekly: 'Loxa Semanal',
    bestValue: 'mejor precio',
    weeklyNote: '{{count}} fotos cada semana',
    perWeek: '/sem',
    notNow: 'Ahora no',
  },

  profile: {
    title: 'Perfil',
    changePhoto: 'Cambiar tu foto',
    tapToChangePhoto: 'toca para cambiar tu foto',
    addPhoto: 'Añadir tu foto',
    tapToAddPhoto: 'toca para añadir tu foto',
    creditsLeft: 'Créditos restantes',
    resetsMonday: 'se renuevan el lunes',
    resetsTomorrow: 'se renuevan mañana',
    noRollOver: 'no se acumulan',
    planFree: 'Plan gratis',
    planTrial: 'Prueba gratis',
    planWeekly: 'Loxa Semanal',
    planFreeNote: 'Sin créditos semanales — {{price}} por foto',
    planWeeklyNote: '{{price}} · {{count}} fotos por semana',
    manage: 'Gestionar',
    subscribe: 'Suscribirse',
    notifications: 'Ideas de estilo diarias',
    notificationsNote: 'Una notificación al día, looks nuevos',
    restore: 'Restaurar compras',
    restored: 'Compras restauradas',
    rate: 'Valorar Loxa',
    privacy: 'Política de privacidad',
    terms: 'Condiciones de uso',
    language: 'Idioma',
  },

  language: {
    title: 'Idioma',
    note: 'loxa sigue a tu teléfono hasta que elijas aquí',
  },

  legal: {
    terms: 'Condiciones',
    privacy: 'Privacidad',
  },

  notifications: {
    line1: { title: 'Cortinilla, en ti', body: 'Dos toques para verlo antes de decidir.' },
    line2: { title: '¿Te aclaras?', body: 'Rubio miel y platino, en tu propia foto.' },
    line3: { title: 'El bob ha vuelto', body: 'Recto, a la barbilla, sin capas. Pruébatelo.' },
    line4: { title: 'Temporada cobriza', body: 'Mira cómo te sienta un rojo cálido.' },
    line5: {
      title: 'Pelo corto, hipotéticamente',
      body: 'Un pixie tarda diez segundos y no gasta tijeras.',
    },
    line6: { title: 'Ondas de playa', body: 'Despeinado, pero a propósito. Míralo en ti.' },
    line7: { title: 'Un wolf cut, quizá', body: 'Capas marcadas, flequillo suelto. Merece un vistazo.' },
  },
};

export default es;
