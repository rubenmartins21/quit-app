/**
 * i18n.tsx — Sistema de línguas do Quit
 * Localização: src/renderer/lib/i18n.tsx
 */

import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "pt" | "en" | "es" | "fr" | "it";

export interface T {
  nav: { status: string; challenge: string; history: string; settings: string };
  brand: { motto: string };
  dash: {
    eyebrow: string;
    streakLabel: string;
    quote: string;
    progress: string;
    daysLeft: (n: number) => string;
    challenge: string;
    days: string;
    started: (d: string) => string;
    reasonLabel: string;
    btnManage: string;
    btnQuit: string;
    blockerName: string;
    blockerSub: (n: number) => string;
    blockerActive: string;
    noChallenge: string;
    noChallengeDesc: string;
  };
  login: {
    title: string;
    subtitle: string;
    email: string;
    otp: string;
    login: string;
    send: string;
    verify: string;
    back: string;
    resend: string;
  };
  create: {
    title: string;
    duration: string;
    reason: string;
    btn: string;
    customPlaceholder: string;
    alreadyActive: string;
    alreadyActiveDesc: string;
    viewStatus: string;
    startingMsg: string;
    daysMin: string;
    reasonMin: (n: number) => string;
    cantSubmit: (nodays: boolean, noreason: boolean, missing: number) => string;
    blocking: string;
    blockingDesc: string;
    installedApps: string;
    select: string;
    additionalUrls: string;
    urlPlaceholder: string;
    summary: string;
    summaryText: (days: number, date: string) => string;
    summaryBlocks: string;
    noAppsFound: string;
    confirm: (n: number) => string;
    loading: string;
  };
  history: {
    title: string;
    empty: string;
    eyebrow: string;
    bestStreak: string;
    calendarBtn: string;
    listBtn: string;
    calendarTitle: string;
    calendarSub: (year: number) => string;
    detailDaysOf: string;
    victory: string;
    relapse: string;
    active: string;
    start: string;
    expectedEnd: string;
    completedOn: string;
    relapseOn: string;
    duration: string;
    daysMaintained: string;
    reasonLabel: string;
    feelingLabel: string;
  };
  calendar: {
    streakDays: string;
    relapses: string;
    noChallenges: (year: number) => string;
    share: string;
    copyImage: string;
    downloadPng: string;
    copied: string;
    downloaded: string;
    shareError: string;
    streakDay: string;
    relapse: string;
    noRecord: string;
    todayOutline: string;
    disciplineDays: string;
  };
  quit: { title: string; confirm: string; cancel: string };
  common: { loading: string; error: string; logout: string; days: string };
}

const PT: T = {
  nav: {
    status: "Estado",
    challenge: "Desafio",
    history: "Histórico",
    settings: "Configurar",
  },
  brand: {
    motto: '"Procura a satisfação de veres morrer os teus vícios antes de ti."',
  },
  dash: {
    eyebrow: "Utilizador",
    streakLabel: "Dias Consecutivos",
    quote: "A fortuna favorece os corajosos.",
    progress: "Progresso",
    daysLeft: (n) => `${n} dia${n !== 1 ? "s" : ""} até à vitória`,
    challenge: "Desafio Actual",
    days: "dias",
    started: (d) => `Iniciado a ${d}`,
    reasonLabel: "Motivo",
    btnManage: "⚙ Gerir Bloqueio",
    btnQuit: "Tentar Abandonar",
    blockerName: "Escudo Digital",
    blockerSub: (n) => `${n} domínios bloqueados · DNS activo`,
    blockerActive: "Activo",
    noChallenge: "Sem desafio activo.",
    noChallengeDesc:
      "Inicia um novo desafio para começar a acompanhar o teu progresso.",
  },
  login: {
    title: "Bem-vindo ao Quit",
    subtitle: "Introduz o teu email para continuar.",
    email: "Email",
    login: "Iniciar sessão / Entrar",
    otp: "Código de acesso",
    send: "Enviar código",
    verify: "Verificar",
    back: "← Voltar",
    resend: "Reenviar código →",
  },
  create: {
    title: "Novo Desafio",
    duration: "Duração",
    reason: "O teu motivo",
    btn: "Iniciar Desafio",
    customPlaceholder: "Personalizado (mín. 7 dias)",
    alreadyActive: "Desafio já activo.",
    alreadyActiveDesc:
      "Só é possível ter um desafio de cada vez.\nCancela o desafio actual em Estado se quiseres começar um novo.",
    viewStatus: "Ver estado actual",
    startingMsg: "A iniciar…",
    daysMin: "Mínimo de 7 dias.",
    reasonMin: (n) => `Escreve um pouco mais — pelo menos ${n} caracteres.`,
    cantSubmit: (nd, nr, m) =>
      !nd && !nr
        ? "Escolhe uma duração e escreve o teu motivo."
        : !nd
          ? "Escolhe a duração do desafio."
          : `Mais ${m} caracter${m > 1 ? "es" : ""} no motivo.`,
    blocking: "O que bloquear durante o desafio",
    blockingDesc:
      "Estes bloqueios são aplicados a todo o sistema e só são removidos no final do desafio.",
    installedApps: "Aplicações instaladas",
    select: "Seleccionar",
    additionalUrls: "URLs / domínios adicionais",
    urlPlaceholder: "ex: instagram.com",
    summary: "Resumo",
    summaryText: (days, date) => `${days} dias — termina a ${date}`,
    summaryBlocks: "Bloqueios:",
    noAppsFound: "Nenhuma aplicação encontrada.",
    confirm: (n) => `Confirmar (${n} seleccionadas)`,
    loading: "A carregar…",
  },
  history: {
    title: "Histórico",
    empty: "Nenhum desafio concluído ainda.",
    eyebrow: "Registo de desafios",
    bestStreak: "Melhor Série",
    calendarBtn: "Calendário",
    listBtn: "← Lista",
    calendarTitle: "Histórico Visual",
    calendarSub: (y) => `Dias de disciplina · ${y}`,
    detailDaysOf: "dias concluídos de",
    victory: "Vitória",
    relapse: "Recaída",
    active: "Activo",
    start: "Início",
    expectedEnd: "Fim previsto",
    completedOn: "Concluído a",
    relapseOn: "Recaída a",
    duration: "Duração",
    daysMaintained: "Dias mantidos",
    reasonLabel: "Motivo",
    feelingLabel: "O que sentiste",
  },
  calendar: {
    streakDays: "dias de streak",
    relapses: "recaídas",
    noChallenges: (y) => `Nenhum desafio registado em ${y}.`,
    share: "Partilhar",
    copyImage: "Copiar imagem",
    downloadPng: "Baixar PNG",
    copied: "Copiado ✓",
    downloaded: "Baixado ✓",
    shareError: "Erro — tenta novamente",
    streakDay: "Dia de streak",
    relapse: "Recaída",
    noRecord: "Sem registo",
    todayOutline: "· hoje com contorno",
    disciplineDays: "Registos de Disciplina",
  },
  quit: {
    title: "Tens a certeza?",
    confirm: "Confirmar abandono",
    cancel: "Continuar o desafio",
  },
  common: {
    loading: "A carregar...",
    error: "Ocorreu um erro.",
    logout: "Terminar sessão",
    days: "dias",
  },
};

const EN: T = {
  nav: {
    status: "Status",
    challenge: "Challenge",
    history: "History",
    settings: "Settings",
  },
  brand: {
    motto:
      '"Of this one thing make sure against your dying day - that your faults die before you do."',
  },
  dash: {
    eyebrow: "Usuario",
    streakLabel: "Consecutive Days",
    quote: "Fortune favors the brave.",
    progress: "Progress",
    daysLeft: (n) => `${n} day${n !== 1 ? "s" : ""} remaining`,
    challenge: "Current Challenge",
    days: "days",
    started: (d) => `Started ${d}`,
    reasonLabel: "Reason",
    btnManage: "⚙ Manage Blocker",
    btnQuit: "Try to Quit",
    blockerName: "Digital Shield",
    blockerSub: (n) => `${n} domains blocked · DNS active`,
    blockerActive: "Active",
    noChallenge: "No active challenge.",
    noChallengeDesc: "Start a new challenge to begin tracking your progress.",
  },
  login: {
    title: "Welcome to Quit",
    subtitle: "Enter your email to continue.",
    email: "Email",
    login: "Log in / Sign in",
    otp: "Access code",
    send: "Send code",
    verify: "Verify",
    back: "← Back",
    resend: "Resend code →",
  },
  create: {
    title: "New Challenge",
    duration: "Duration",
    reason: "Your reason",
    btn: "Start Challenge",
    customPlaceholder: "Custom (min. 7 days)",
    alreadyActive: "Challenge already active.",
    alreadyActiveDesc:
      "Only one challenge at a time.\nCancel the current one in Status if you want to start a new one.",
    viewStatus: "View current status",
    startingMsg: "Starting…",
    daysMin: "Minimum 7 days.",
    reasonMin: (n) => `Write a bit more — at least ${n} characters.`,
    cantSubmit: (nd, nr, m) =>
      !nd && !nr
        ? "Choose a duration and write your reason."
        : !nd
          ? "Choose the challenge duration."
          : `${m} more character${m > 1 ? "s" : ""} in the reason.`,
    blocking: "What to block during the challenge",
    blockingDesc:
      "These blocks are applied system-wide and are only removed when the challenge ends.",
    installedApps: "Installed apps",
    select: "Select",
    additionalUrls: "Additional URLs / domains",
    urlPlaceholder: "e.g. instagram.com",
    summary: "Summary",
    summaryText: (days, date) => `${days} days — ends on ${date}`,
    summaryBlocks: "Blocking:",
    noAppsFound: "No apps found.",
    confirm: (n) => `Confirm (${n} selected)`,
    loading: "Loading…",
  },
  history: {
    title: "History",
    empty: "No completed challenges yet.",
    eyebrow: "Challenge records",
    bestStreak: "Best Streak",
    calendarBtn: "Calendar",
    listBtn: "← List",
    calendarTitle: "Visual History",
    calendarSub: (y) => `Discipline days · ${y}`,
    detailDaysOf: "days completed of",
    victory: "Victory",
    relapse: "Relapse",
    active: "Active",
    start: "Start",
    expectedEnd: "Expected end",
    completedOn: "Completed on",
    relapseOn: "Relapsed on",
    duration: "Duration",
    daysMaintained: "Days held",
    reasonLabel: "Reason",
    feelingLabel: "What you felt",
  },
  calendar: {
    streakDays: "streak days",
    relapses: "relapses",
    noChallenges: (y) => `No challenges recorded in ${y}.`,
    share: "Share",
    copyImage: "Copy image",
    downloadPng: "Download PNG",
    copied: "Copied ✓",
    downloaded: "Downloaded ✓",
    shareError: "Error — try again",
    streakDay: "Streak day",
    relapse: "Relapse",
    noRecord: "No record",
    todayOutline: "· today with outline",
    disciplineDays: "Discipline Records",
  },
  quit: {
    title: "Are you sure?",
    confirm: "Confirm quit",
    cancel: "Keep going",
  },
  common: {
    loading: "Loading...",
    error: "An error occurred.",
    logout: "Log out",
    days: "days",
  },
};

const ES: T = {
  nav: {
    status: "Estado",
    challenge: "Desafío",
    history: "Historial",
    settings: "Ajustes",
  },
  brand: {
    motto: '"Busca la satisfacción de ver morir tus vicios antes que tú."',
  },
  dash: {
    eyebrow: "Usuario",
    streakLabel: "Días Consecutivos",
    quote: "La fortuna favorece a los valientes.",
    progress: "Progreso",
    daysLeft: (n) => `${n} día${n !== 1 ? "s" : ""} restantes`,
    challenge: "Desafío Actual",
    days: "días",
    started: (d) => `Iniciado el ${d}`,
    reasonLabel: "Motivo",
    btnManage: "⚙ Gestionar Bloqueo",
    btnQuit: "Intentar Abandonar",
    blockerName: "Escudo Digital",
    blockerSub: (n) => `${n} dominios bloqueados · DNS activo`,
    blockerActive: "Activo",
    noChallenge: "Sin desafío activo.",
    noChallengeDesc:
      "Inicia un nuevo desafío para empezar a seguir tu progreso.",
  },
  login: {
    title: "Bienvenido a Quit",
    subtitle: "Introduce tu email para continuar.",
    email: "Email",
    login: "Iniciar sesión",
    otp: "Código de acceso",
    send: "Enviar código",
    verify: "Verificar",
    back: "← Volver",
    resend: "Reenviar código →",
  },
  create: {
    title: "Nuevo Desafío",
    duration: "Duración",
    reason: "Tu razón",
    btn: "Iniciar Desafío",
    customPlaceholder: "Personalizado (mín. 7 días)",
    alreadyActive: "Desafío ya activo.",
    alreadyActiveDesc:
      "Solo un desafío a la vez.\nCancela el actual en Estado si quieres empezar uno nuevo.",
    viewStatus: "Ver estado actual",
    startingMsg: "Iniciando…",
    daysMin: "Mínimo 7 días.",
    reasonMin: (n) => `Escribe un poco más — al menos ${n} caracteres.`,
    cantSubmit: (nd, nr, m) =>
      !nd && !nr
        ? "Elige una duración y escribe tu motivo."
        : !nd
          ? "Elige la duración del desafío."
          : `Faltan ${m} caracter${m > 1 ? "es" : ""} en el motivo.`,
    blocking: "Qué bloquear durante el desafío",
    blockingDesc:
      "Estos bloqueos se aplican a todo el sistema y solo se eliminan al finalizar el desafío.",
    installedApps: "Aplicaciones instaladas",
    select: "Seleccionar",
    additionalUrls: "URLs / dominios adicionales",
    urlPlaceholder: "ej: instagram.com",
    summary: "Resumen",
    summaryText: (days, date) => `${days} días — termina el ${date}`,
    summaryBlocks: "Bloqueos:",
    noAppsFound: "No se encontraron aplicaciones.",
    confirm: (n) => `Confirmar (${n} seleccionadas)`,
    loading: "Cargando…",
  },
  history: {
    title: "Historial",
    empty: "Ningún desafío completado todavía.",
    eyebrow: "Registro de desafíos",
    bestStreak: "Mejor Racha",
    calendarBtn: "Calendario",
    listBtn: "← Lista",
    calendarTitle: "Historial Visual",
    calendarSub: (y) => `Días de disciplina · ${y}`,
    detailDaysOf: "días completados de",
    victory: "Victoria",
    relapse: "Recaída",
    active: "Activo",
    start: "Inicio",
    expectedEnd: "Fin previsto",
    completedOn: "Completado el",
    relapseOn: "Recaída el",
    duration: "Duración",
    daysMaintained: "Días mantenidos",
    reasonLabel: "Motivo",
    feelingLabel: "Lo que sentiste",
  },
  calendar: {
    streakDays: "días de streak",
    relapses: "recaídas",
    noChallenges: (y) => `No hay desafíos registrados en ${y}.`,
    share: "Compartir",
    copyImage: "Copiar imagen",
    downloadPng: "Descargar PNG",
    copied: "Copiado ✓",
    downloaded: "Descargado ✓",
    shareError: "Error — inténtalo de nuevo",
    streakDay: "Día de streak",
    relapse: "Recaída",
    noRecord: "Sin registro",
    todayOutline: "· hoy con contorno",
    disciplineDays: "Registros de Disciplina",
  },
  quit: {
    title: "¿Estás seguro?",
    confirm: "Confirmar abandono",
    cancel: "Continuar el desafío",
  },
  common: {
    loading: "Cargando...",
    error: "Ocurrió un error.",
    logout: "Cerrar sesión",
    days: "días",
  },
};

const FR: T = {
  nav: {
    status: "Statut",
    challenge: "Défi",
    history: "Historique",
    settings: "Paramètres",
  },
  brand: {
    motto: '"Cherche la satisfaction de voir mourir tes vices avant toi."',
  },
  dash: {
    eyebrow: "Utilisateur",
    streakLabel: "Jours Consécutifs",
    quote: "La fortune sourit aux audacieux.",
    progress: "Progression",
    daysLeft: (n) =>
      `${n} jour${n !== 1 ? "s" : ""} restant${n !== 1 ? "s" : ""}`,
    challenge: "Défi Actuel",
    days: "jours",
    started: (d) => `Commencé le ${d}`,
    reasonLabel: "Motif",
    btnManage: "⚙ Gérer le Blocage",
    btnQuit: "Tenter d'Abandonner",
    blockerName: "Bouclier Numérique",
    blockerSub: (n) => `${n} domaines bloqués · DNS actif`,
    blockerActive: "Actif",
    noChallenge: "Aucun défi actif.",
    noChallengeDesc:
      "Lancez un nouveau défi pour commencer à suivre votre progression.",
  },
  login: {
    title: "Bienvenue sur Quit",
    subtitle: "Entrez votre email pour continuer.",
    email: "Email",
    login: "Se connecter",
    otp: "Code d'accès",
    send: "Envoyer le code",
    verify: "Vérifier",
    back: "← Retour",
    resend: "Renvoyer le code →",
  },
  create: {
    title: "Nouveau Défi",
    duration: "Durée",
    reason: "Votre motif",
    btn: "Lancer le Défi",
    customPlaceholder: "Personnalisé (min. 7 jours)",
    alreadyActive: "Défi déjà actif.",
    alreadyActiveDesc:
      "Un seul défi à la fois.\nAnnulez l'actuel dans Statut pour en commencer un nouveau.",
    viewStatus: "Voir le statut actuel",
    startingMsg: "Démarrage…",
    daysMin: "Minimum 7 jours.",
    reasonMin: (n) => `Écrivez un peu plus — au moins ${n} caractères.`,
    cantSubmit: (nd, nr, m) =>
      !nd && !nr
        ? "Choisissez une durée et écrivez votre motif."
        : !nd
          ? "Choisissez la durée du défi."
          : `Encore ${m} caractère${m > 1 ? "s" : ""} dans le motif.`,
    blocking: "Que bloquer pendant le défi",
    blockingDesc:
      "Ces blocages s'appliquent à tout le système et ne sont supprimés qu'à la fin du défi.",
    installedApps: "Applications installées",
    select: "Sélectionner",
    additionalUrls: "URLs / domaines supplémentaires",
    urlPlaceholder: "ex : instagram.com",
    summary: "Résumé",
    summaryText: (days, date) => `${days} jours — se termine le ${date}`,
    summaryBlocks: "Blocages :",
    noAppsFound: "Aucune application trouvée.",
    confirm: (n) => `Confirmer (${n} sélectionnée${n > 1 ? "s" : ""})`,
    loading: "Chargement…",
  },
  history: {
    title: "Historique",
    empty: "Aucun défi terminé pour l'instant.",
    eyebrow: "Registre des défis",
    bestStreak: "Meilleure Série",
    calendarBtn: "Calendrier",
    listBtn: "← Liste",
    calendarTitle: "Historique Visuel",
    calendarSub: (y) => `Jours de discipline · ${y}`,
    detailDaysOf: "jours complétés sur",
    victory: "Victoire",
    relapse: "Rechute",
    active: "Actif",
    start: "Début",
    expectedEnd: "Fin prévue",
    completedOn: "Terminé le",
    relapseOn: "Rechute le",
    duration: "Durée",
    daysMaintained: "Jours tenus",
    reasonLabel: "Motif",
    feelingLabel: "Ce que vous ressentiez",
  },
  calendar: {
    streakDays: "jours de streak",
    relapses: "rechutes",
    noChallenges: (y) => `Aucun défi enregistré en ${y}.`,
    share: "Partager",
    copyImage: "Copier l'image",
    downloadPng: "Télécharger PNG",
    copied: "Copié ✓",
    downloaded: "Téléchargé ✓",
    shareError: "Erreur — réessayez",
    streakDay: "Jour de streak",
    relapse: "Rechute",
    noRecord: "Sans enregistrement",
    todayOutline: "· aujourd'hui avec contour",
    disciplineDays: "Registres de Discipline",
  },
  quit: {
    title: "Êtes-vous sûr ?",
    confirm: "Confirmer l'abandon",
    cancel: "Continuer le défi",
  },
  common: {
    loading: "Chargement...",
    error: "Une erreur s'est produite.",
    logout: "Se déconnecter",
    days: "jours",
  },
};

const IT: T = {
  nav: {
    status: "Stato",
    challenge: "Sfida",
    history: "Cronologia",
    settings: "Impostazioni",
  },
  brand: {
    motto: '"Cerca la soddisfazione di vedere morire i tuoi vizi prima di te."',
  },
  dash: {
    eyebrow: "Utente",
    streakLabel: "Giorni Consecutivi",
    quote: "La fortuna aiuta gli audaci.",
    progress: "Progresso",
    daysLeft: (n) =>
      `${n} giorno${n !== 1 ? "i" : ""} rimanente${n !== 1 ? "i" : ""}`,
    challenge: "Sfida Attuale",
    days: "giorni",
    started: (d) => `Iniziato il ${d}`,
    reasonLabel: "Motivo",
    btnManage: "⚙ Gestisci Blocco",
    btnQuit: "Tentare di Abbandonare",
    blockerName: "Scudo Digitale",
    blockerSub: (n) => `${n} domini bloccati · DNS attivo`,
    blockerActive: "Attivo",
    noChallenge: "Nessuna sfida attiva.",
    noChallengeDesc:
      "Avvia una nuova sfida per iniziare a monitorare i tuoi progressi.",
  },
  login: {
    title: "Benvenuto su Quit",
    subtitle: "Inserisci la tua email per continuare.",
    email: "Email",
    login: "Accedi / Accedere",
    otp: "Codice di accesso",
    send: "Invia codice",
    verify: "Verifica",
    back: "← Indietro",
    resend: "Reinvia codice →",
  },
  create: {
    title: "Nuova Sfida",
    duration: "Durata",
    reason: "Il tuo motivo",
    btn: "Inizia la Sfida",
    customPlaceholder: "Personalizzato (min. 7 giorni)",
    alreadyActive: "Sfida già attiva.",
    alreadyActiveDesc:
      "Solo una sfida alla volta.\nAnnulla quella corrente in Stato se vuoi iniziarne una nuova.",
    viewStatus: "Vedi stato attuale",
    startingMsg: "Avvio…",
    daysMin: "Minimo 7 giorni.",
    reasonMin: (n) => `Scrivi un po' di più — almeno ${n} caratteri.`,
    cantSubmit: (nd, nr, m) =>
      !nd && !nr
        ? "Scegli una durata e scrivi il tuo motivo."
        : !nd
          ? "Scegli la durata della sfida."
          : `Ancora ${m} caratter${m > 1 ? "i" : "e"} nel motivo.`,
    blocking: "Cosa bloccare durante la sfida",
    blockingDesc:
      "Questi blocchi si applicano a tutto il sistema e vengono rimossi solo al termine della sfida.",
    installedApps: "Applicazioni installate",
    select: "Seleziona",
    additionalUrls: "URL / domini aggiuntivi",
    urlPlaceholder: "es: instagram.com",
    summary: "Riepilogo",
    summaryText: (days, date) => `${days} giorni — termina il ${date}`,
    summaryBlocks: "Blocchi:",
    noAppsFound: "Nessuna applicazione trovata.",
    confirm: (n) => `Conferma (${n} selezionat${n > 1 ? "e" : "a"})`,
    loading: "Caricamento…",
  },
  history: {
    title: "Cronologia",
    empty: "Nessuna sfida completata ancora.",
    eyebrow: "Registro delle sfide",
    bestStreak: "Serie Migliore",
    calendarBtn: "Calendario",
    listBtn: "← Lista",
    calendarTitle: "Cronologia Visiva",
    calendarSub: (y) => `Giorni di disciplina · ${y}`,
    detailDaysOf: "giorni completati su",
    victory: "Vittoria",
    relapse: "Ricaduta",
    active: "Attivo",
    start: "Inizio",
    expectedEnd: "Fine prevista",
    completedOn: "Completato il",
    relapseOn: "Ricaduta il",
    duration: "Durata",
    daysMaintained: "Giorni mantenuti",
    reasonLabel: "Motivo",
    feelingLabel: "Cosa hai sentito",
  },
  calendar: {
    streakDays: "giorni di streak",
    relapses: "ricadute",
    noChallenges: (y) => `Nessuna sfida registrata nel ${y}.`,
    share: "Condividi",
    copyImage: "Copia immagine",
    downloadPng: "Scarica PNG",
    copied: "Copiato ✓",
    downloaded: "Scaricato ✓",
    shareError: "Errore — riprova",
    streakDay: "Giorno di streak",
    relapse: "Ricaduta",
    noRecord: "Nessun record",
    todayOutline: "· oggi con contorno",
    disciplineDays: "Registri di Disciplina",
  },
  quit: {
    title: "Sei sicuro?",
    confirm: "Conferma abbandono",
    cancel: "Continua la sfida",
  },
  common: {
    loading: "Caricamento...",
    error: "Si è verificato un errore.",
    logout: "Disconnettersi",
    days: "giorni",
  },
};

// ── Language names translated ─────────────────────────────────────────────────

export const LANG_NAMES: Record<Lang, Record<Lang, string>> = {
  pt: {
    pt: "Português",
    en: "Inglês",
    es: "Espanhol",
    fr: "Francês",
    it: "Italiano",
  },
  en: {
    pt: "Portuguese",
    en: "English",
    es: "Spanish",
    fr: "French",
    it: "Italian",
  },
  es: {
    pt: "Portugués",
    en: "Inglés",
    es: "Español",
    fr: "Francés",
    it: "Italiano",
  },
  fr: {
    pt: "Portugais",
    en: "Anglais",
    es: "Espagnol",
    fr: "Français",
    it: "Italien",
  },
  it: {
    pt: "Portoghese",
    en: "Inglese",
    es: "Spagnolo",
    fr: "Francese",
    it: "Italiano",
  },
};

export const LANG_FLAGS: Record<Lang, string> = {
  pt: "🇵🇹",
  en: "🇬🇧",
  es: "🇪🇸",
  fr: "🇫🇷",
  it: "🇮🇹",
};

/** Returns lang options with names in the currently active language */
export function LANG_OPTIONS_TRANSLATED(
  currentLang: Lang,
): { value: Lang; label: string; flag: string }[] {
  return (Object.keys(LANG_FLAGS) as Lang[]).map((l) => ({
    value: l,
    label: LANG_NAMES[currentLang][l],
    flag: LANG_FLAGS[l],
  }));
}

// Legacy static export kept for backward compat
export const LANG_OPTIONS: { value: Lang; label: string; flag: string }[] = [
  { value: "pt", label: "Português", flag: "🇵🇹" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "it", label: "Italiano", flag: "🇮🇹" },
];

// ── Context ───────────────────────────────────────────────────────────────────

const DICTS: Record<Lang, T> = { pt: PT, en: EN, es: ES, fr: FR, it: IT };

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
}
const I18nContext = createContext<I18nCtx>({
  lang: "pt",
  setLang: () => {},
  t: PT,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const saved = (localStorage.getItem("quit-lang") as Lang) ?? "pt";
  const [lang, setLangState] = useState<Lang>(saved);
  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("quit-lang", l);
  }
  return (
    <I18nContext.Provider value={{ lang, setLang, t: DICTS[lang] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
