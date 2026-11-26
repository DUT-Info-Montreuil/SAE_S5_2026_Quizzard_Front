// Erreurs de l'entrée dans un quiz (UC8, tableau « Cas d'erreur » ; plan UC8, §4, D6, D7 et D11).
// Messages repris mot pour mot de docs/uc/UC8-rejoindre-quiz.md : ne pas les reformuler. Les guillemets « » du
// tableau encadrent le message et n'en font pas partie.
// TODO(UC8): les codes n'existent pas encore dans le back (plan UC8, question K1) : noms proposés, repli par statut.

export type CodeErreurRejoindre =
  | 'SESSION_INTROUVABLE'
  | 'SESSION_CLOSE'
  | 'CONNEXION_IUT_REQUISE'
  | 'PSEUDONYME_INVALIDE'
  | 'PSEUDONYME_DEJA_PRIS'
  | 'ERREUR_SERVEUR'
  | 'REQUETE_INVALIDE'

/**
 * Où s'affiche l'erreur : sous le champ du formulaire (saisie gardée), ou sur une page sans formulaire
 * (quiz inexistant, quiz terminé, quiz noté).
 */
export type AffichageRejoindre = 'FORMULAIRE' | 'INTROUVABLE' | 'TERMINE' | 'QUIZ_NOTE'

export interface EntreeErreurRejoindre {
  statut: number
  /** Message de l'UC8 ; `null` s'il n'existe pas (le message `error` du back sert alors de repli). */
  message: string | null
  affichage: AffichageRejoindre
}

export const ERREURS_REJOINDRE: Readonly<Record<CodeErreurRejoindre, EntreeErreurRejoindre>> = {
  SESSION_INTROUVABLE: {
    statut: 404,
    message: 'Ce quiz n\'existe pas : vérifie le lien ou scanne à nouveau le QR code.',
    affichage: 'INTROUVABLE',
  },
  SESSION_CLOSE: { statut: 409, message: 'Ce quiz est terminé.', affichage: 'TERMINE' },
  CONNEXION_IUT_REQUISE: {
    statut: 409,
    message: 'Ce quiz est noté : connecte-toi avec ton compte IUT.',
    affichage: 'QUIZ_NOTE',
  },
  PSEUDONYME_INVALIDE: {
    statut: 422,
    message: 'Ton pseudonyme doit faire de 2 à 20 caractères.',
    affichage: 'FORMULAIRE',
  },
  // Avec une proposition ; sans proposition (doublon simultané), voir MESSAGE_PSEUDONYME_PRIS_SANS_PROPOSITION.
  PSEUDONYME_DEJA_PRIS: {
    statut: 409,
    message: 'Ce pseudonyme est déjà pris. Essaie celui qui t\'est proposé.',
    affichage: 'FORMULAIRE',
  },
  ERREUR_SERVEUR: {
    statut: 500,
    message: 'Une erreur est survenue. Réessayez dans un instant.',
    affichage: 'FORMULAIRE',
  },
  // TODO(UC8): message d'un 400 absent de l'UC8 (plan UC8, question K6). Valeur provisoire : `null`, donc le
  // message `error` du back.
  REQUETE_INVALIDE: { statut: 400, message: null, affichage: 'FORMULAIRE' },
}

export const MESSAGE_PSEUDONYME_PRIS_SANS_PROPOSITION = 'Ce pseudonyme est déjà pris.'

/** Message affiché quand le serveur ne répond pas (panne réseau) ou que le jeton ne peut pas être gardé. */
// TODO(UC8): message absent de l'UC8 (plan UC8, questions U1, U2 et U5). Valeur provisoire : message du 500.
export const MESSAGE_ECHEC = ERREURS_REJOINDRE.ERREUR_SERVEUR.message as string

/** Erreur reçue du back (forme compatible avec `ErreurHttp` de shared/http, sans l'importer). */
export interface ErreurRecue {
  statut: number
  code?: string
  error: string | null
  /** Pseudonyme proposé par le back avec un 409 « pseudonyme pris ». */
  suggestion?: string
}

export interface ErreurRejoindreAffichee {
  /** Code reconnu, ou `null` (409 sans code ni proposition : ambigu, D6). */
  code: CodeErreurRejoindre | null
  message: string
  affichage: AffichageRejoindre
  /** Pseudonyme proposé, à afficher comme texte ; `null` hors « pseudonyme pris ». */
  suggestion: string | null
}

const CODE_PAR_STATUT: Readonly<Record<number, CodeErreurRejoindre>> = {
  400: 'REQUETE_INVALIDE',
  404: 'SESSION_INTROUVABLE',
  422: 'PSEUDONYME_INVALIDE',
  500: 'ERREUR_SERVEUR',
}

function estCodeConnu(code: string | undefined): code is CodeErreurRejoindre {
  return code !== undefined && Object.hasOwn(ERREURS_REJOINDRE, code)
}

function suggestionDe(erreur: ErreurRecue): string | null {
  return typeof erreur.suggestion === 'string' && erreur.suggestion !== '' ? erreur.suggestion : null
}

/** Code de l'erreur : celui du back s'il est connu, sinon déduit du statut (`null` pour un 409 ambigu). */
export function codeErreurRejoindre(erreur: ErreurRecue): CodeErreurRejoindre | null {
  if (estCodeConnu(erreur.code)) return erreur.code
  if (erreur.statut === 409) return suggestionDe(erreur) === null ? null : 'PSEUDONYME_DEJA_PRIS'
  // TODO(UC8): statut absent de l'UC8 (403, 429, 502…). Valeur provisoire : traité comme ERREUR_SERVEUR, comme
  // dans l'UC9.
  return CODE_PAR_STATUT[erreur.statut] ?? 'ERREUR_SERVEUR'
}

/** Message, affichage et proposition pour une erreur de `POST …/participants`. */
export function lireErreurRejoindre(erreur: ErreurRecue): ErreurRejoindreAffichee {
  const code = codeErreurRejoindre(erreur)
  if (code === null) {
    // 409 sans code ni proposition (D6) : séance close, quiz noté ou doublon simultané. Message `error` du back,
    // formulaire gardé.
    // TODO(UC8): 409 ambigu sans message du back (corps qui ne vient pas du back). Valeur provisoire : MESSAGE_ECHEC.
    return { code, message: erreur.error ?? MESSAGE_ECHEC, affichage: 'FORMULAIRE', suggestion: null }
  }
  if (code === 'PSEUDONYME_DEJA_PRIS') {
    const suggestion = suggestionDe(erreur)
    return {
      code,
      message: suggestion === null
        ? MESSAGE_PSEUDONYME_PRIS_SANS_PROPOSITION
        : ERREURS_REJOINDRE.PSEUDONYME_DEJA_PRIS.message as string,
      affichage: 'FORMULAIRE',
      suggestion,
    }
  }
  const entree = ERREURS_REJOINDRE[code]
  // D7 : pour un 422, toujours le message de l'UC8, jamais le `error` du back.
  return { code, message: entree.message ?? erreur.error ?? MESSAGE_ECHEC, affichage: entree.affichage, suggestion: null }
}

export interface ErreurConsultationAffichee {
  affichage: 'INTROUVABLE' | 'TERMINE' | 'ECHEC_CHARGEMENT'
  message: string
}

/**
 * Erreur de `GET /api/public/sessions/{codeAcces}` (D11). `null` : panne réseau ou corps mal formé.
 * Sur cette route, tout 409 veut dire « séance close ».
 */
export function lireErreurConsultation(erreur: ErreurRecue | null): ErreurConsultationAffichee {
  if (erreur?.statut === 404) {
    return { affichage: 'INTROUVABLE', message: ERREURS_REJOINDRE.SESSION_INTROUVABLE.message as string }
  }
  if (erreur?.statut === 409) {
    return { affichage: 'TERMINE', message: ERREURS_REJOINDRE.SESSION_CLOSE.message as string }
  }
  // TODO(UC8): 500, autre statut, panne réseau ou corps mal formé absents de l'UC8 (question U2). Valeur
  // provisoire : MESSAGE_ECHEC et le bouton « Recharger ».
  return { affichage: 'ECHEC_CHARGEMENT', message: MESSAGE_ECHEC }
}
