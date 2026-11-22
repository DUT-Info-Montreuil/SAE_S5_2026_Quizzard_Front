// Erreurs de l'envoi d'une réponse (UC9, tableau « Cas d'erreur » ; plan UC9, §4 et D3).
// Messages repris mot pour mot de docs/uc/UC9-repondre-question.md : ne pas les reformuler. Les guillemets « »
// du tableau encadrent le message et n'en font pas partie (voir la note sous le tableau de l'UC9).

export type CodeErreurReponse =
  | 'JETON_INVALIDE'
  | 'QUESTION_CLOSE'
  | 'HORS_DELAI'
  | 'DEJA_REPONDU'
  | 'REPONSE_INVALIDE'
  | 'ERREUR_SERVEUR'
  | 'REQUETE_INVALIDE'

export type EcranReponse = 'E8' | 'E9'

/** Action proposée à l'étudiant sur E9. */
export type ActionErreur = 'RECHARGER' | 'REJOINDRE'

export interface EntreeErreur {
  statut: number
  /** Message de l'UC9 ; `null` s'il n'existe pas (le message `error` du back sert alors de repli). */
  message: string | null
  /** Corrigeable : l'étudiant reste sur E8 pour corriger, s'il reste du temps (sinon E9). */
  corrigeable: boolean
  ecran: EcranReponse
  action?: ActionErreur
  /** Le jeton de participant doit être supprimé. */
  supprimerJeton?: boolean
}

export const ERREURS_REPONSE: Readonly<Record<CodeErreurReponse, EntreeErreur>> = {
  JETON_INVALIDE: {
    statut: 401,
    message: 'Ta session a expiré, rejoins le quiz à nouveau.',
    corrigeable: false,
    ecran: 'E9',
    action: 'REJOINDRE',
    supprimerJeton: true,
  },
  QUESTION_CLOSE: { statut: 409, message: 'Cette session est terminée.', corrigeable: false, ecran: 'E9' },
  HORS_DELAI: {
    statut: 409,
    message: 'Temps écoulé : réponse non prise en compte.',
    corrigeable: false,
    ecran: 'E9',
  },
  DEJA_REPONDU: { statut: 409, message: 'Tu as déjà répondu.', corrigeable: false, ecran: 'E9' },
  REPONSE_INVALIDE: {
    statut: 422,
    message: 'Réponse incomplète, vérifie ta saisie.',
    corrigeable: true,
    ecran: 'E8',
  },
  ERREUR_SERVEUR: { statut: 500, message: 'Réponse non enregistrée, réessaie.', corrigeable: true, ecran: 'E8' },
  // TODO(UC9): message d'un 400 absent de l'UC9 (plan UC9, question B11). Valeur provisoire : `null`, donc le
  // message `error` du back.
  REQUETE_INVALIDE: { statut: 400, message: null, corrigeable: false, ecran: 'E9', action: 'RECHARGER' },
}

/** Erreur reçue du back (forme compatible avec `ErreurHttp` de shared/http, sans l'importer). */
export interface ErreurEnvoi {
  statut: number
  code?: string
  error: string | null
}

export interface ErreurAffichee {
  /** Code reconnu, ou `null` (409 sans code : ambigu, D3). */
  code: CodeErreurReponse | null
  message: string | null
  corrigeable: boolean
  ecran: EcranReponse
  action?: ActionErreur
  supprimerJeton: boolean
}

const CODE_PAR_STATUT: Readonly<Record<number, CodeErreurReponse>> = {
  400: 'REQUETE_INVALIDE',
  401: 'JETON_INVALIDE',
  422: 'REPONSE_INVALIDE',
  500: 'ERREUR_SERVEUR',
}

function estCodeConnu(code: string | undefined): code is CodeErreurReponse {
  return code !== undefined && Object.hasOwn(ERREURS_REPONSE, code)
}

/** Code de l'erreur : celui du back s'il est connu, sinon déduit du statut HTTP (`null` pour un 409 sans code). */
export function codeErreur(erreur: ErreurEnvoi): CodeErreurReponse | null {
  if (estCodeConnu(erreur.code)) return erreur.code
  if (erreur.statut === 409) return null
  // TODO(UC9): statut absent de l'UC9 (403, 404, 502…). Valeur provisoire : traité comme ERREUR_SERVEUR.
  return CODE_PAR_STATUT[erreur.statut] ?? 'ERREUR_SERVEUR'
}

/** Message, écran et action à afficher pour une erreur d'envoi. */
export function lireErreurEnvoi(erreur: ErreurEnvoi, resteDuTemps: boolean): ErreurAffichee {
  const code = codeErreur(erreur)
  if (code === null) {
    // 409 sans code (D3) : QUESTION_CLOSE, HORS_DELAI ou DEJA_REPONDU ; message `error` du back, en E9.
    return { code, message: erreur.error, corrigeable: false, ecran: 'E9', supprimerJeton: false }
  }
  const entree = ERREURS_REPONSE[code]
  const corrigeable = entree.corrigeable && resteDuTemps
  return {
    code,
    message: entree.message ?? erreur.error,
    corrigeable,
    ecran: corrigeable ? 'E8' : 'E9',
    action: entree.action,
    supprimerJeton: entree.supprimerJeton === true,
  }
}
