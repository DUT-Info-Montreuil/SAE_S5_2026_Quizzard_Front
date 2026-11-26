// Erreurs de l'éditeur E3 (UC3, tableau « Cas d'erreur » ; plan UC3, §4, D5, D13 et D14).
// Messages repris mot pour mot de docs/uc/UC3-inserer-page-quiz.md : ne pas les reformuler. Les guillemets « »
// du tableau encadrent le message et n'en font pas partie (voir la note sous le tableau de l'UC3).
// Le message est choisi par `code`, jamais le `error` du back pour un code connu (D13).

export type CodeErreurInsertion =
  | 'REQUETE_INVALIDE'
  | 'COURS_INTROUVABLE'
  | 'COURS_ARCHIVE'
  | 'VERSION_PERIMEE'
  | 'EMPLACEMENT_INVALIDE'
  | 'QUIZ_INTROUVABLE'
  | 'QUIZ_EN_SEANCE'
  | 'ERREUR_SERVEUR'

/** Où l'erreur s'affiche : bandeau de l'éditeur (`role="alert"`), ou redirection vers l'écran de connexion (401). */
export type AffichageErreur = 'BANDEAU' | 'REDIRECTION'

/** Bouton proposé avec le message : « Recharger » quand le message dit « rechargez l'éditeur » (D14). */
export type ActionErreur = 'RECHARGER' | 'AUCUNE'

export interface ErreurEditeur {
  /** Message à afficher ; `null` pour une redirection. */
  message: string | null
  affichage: AffichageErreur
  action: ActionErreur
  /** Insertion bloquée jusqu'au rechargement (VERSION_PERIMEE, EMPLACEMENT_INVALIDE) ; sinon boutons réactivés. */
  bloquer: boolean
}

export const MESSAGE_COURS_INTROUVABLE = 'Cours introuvable.'
const MESSAGE_ACTION_NON_AUTORISEE = 'Action non autorisée.'

export const ERREURS_INSERTION: Readonly<Record<CodeErreurInsertion, ErreurEditeur>> = {
  REQUETE_INVALIDE: {
    message: 'Requête invalide, rechargez l\'éditeur.',
    affichage: 'BANDEAU',
    action: 'RECHARGER',
    bloquer: false,
  },
  COURS_INTROUVABLE: { message: MESSAGE_COURS_INTROUVABLE, affichage: 'BANDEAU', action: 'AUCUNE', bloquer: false },
  COURS_ARCHIVE: {
    message: 'Ce cours est archivé : il n\'est plus modifiable.',
    affichage: 'BANDEAU',
    action: 'AUCUNE',
    bloquer: false,
  },
  VERSION_PERIMEE: {
    message: 'Une nouvelle version du cours a été importée : rechargez l\'éditeur.',
    affichage: 'BANDEAU',
    action: 'RECHARGER',
    bloquer: true,
  },
  EMPLACEMENT_INVALIDE: {
    message: 'Emplacement invalide : rechargez l\'éditeur.',
    affichage: 'BANDEAU',
    action: 'RECHARGER',
    bloquer: true,
  },
  QUIZ_INTROUVABLE: { message: 'Quiz introuvable.', affichage: 'BANDEAU', action: 'AUCUNE', bloquer: false },
  QUIZ_EN_SEANCE: {
    message: 'Ce quiz est en cours de séance : réessayez après sa clôture.',
    affichage: 'BANDEAU',
    action: 'AUCUNE',
    bloquer: false,
  },
  ERREUR_SERVEUR: {
    message: 'L\'insertion a échoué, réessayez.',
    affichage: 'BANDEAU',
    action: 'AUCUNE',
    bloquer: false,
  },
}

const REDIRECTION_CONNEXION: ErreurEditeur = { message: null, affichage: 'REDIRECTION', action: 'AUCUNE', bloquer: false }

/** Erreur HTTP reçue du back (forme compatible avec `ErreurHttp` de shared/http, sans l'importer). */
export interface ErreurRecue {
  statut: number
  code?: string
  error: string | null
  request_id?: string | null
}

function estCodeConnu(code: string | undefined): code is CodeErreurInsertion {
  return code !== undefined && Object.hasOwn(ERREURS_INSERTION, code)
}

/** Erreur de `POST /api/cours/{idCours}/pages-quiz` : par `code`, sinon par statut (replis du §4). */
export function lireErreurInsertion(erreur: ErreurRecue): ErreurEditeur {
  if (erreur.statut === 401) return REDIRECTION_CONNEXION
  // 403 : déjà après le rejeu CSRF unique de shared/http (D4).
  if (erreur.statut === 403) {
    return { message: MESSAGE_ACTION_NON_AUTORISEE, affichage: 'BANDEAU', action: 'AUCUNE', bloquer: false }
  }
  if (estCodeConnu(erreur.code)) return ERREURS_INSERTION[erreur.code]
  if (erreur.statut === 400) return ERREURS_INSERTION.REQUETE_INVALIDE
  if (erreur.statut >= 500) return ERREURS_INSERTION.ERREUR_SERVEUR
  // 404, 409, 422 sans code connu (questions Q2, Q3 ; précédent UC9, D3) : `error` du back, sinon ERREUR_SERVEUR.
  // TODO(UC3): autres statuts (405, 413…) absents du dossier. Valeur provisoire : même traitement.
  return { ...ERREURS_INSERTION.ERREUR_SERVEUR, message: erreur.error ?? ERREURS_INSERTION.ERREUR_SERVEUR.message }
}

/**
 * Pas de réponse HTTP pendant l'insertion (panne réseau).
 * TODO(UC3): message absent de la spec (plan UC3, U3). Valeur provisoire : celui d'ERREUR_SERVEUR, avec « Recharger »
 * car la page a pu être créée ; boutons réactivés.
 */
export function erreurReseauInsertion(): ErreurEditeur {
  return { ...ERREURS_INSERTION.ERREUR_SERVEUR, action: 'RECHARGER' }
}

// TODO(UC3): message d'échec du chargement absent de la spec (plan UC3, U4). Valeur provisoire, isolée ici.
export const MESSAGE_CHARGEMENT_PROVISOIRE = 'Impossible de charger l\'éditeur.'

export interface ErreurChargement extends ErreurEditeur {
  /** Identifiant de la requête, à transmettre à l'équipe pour un incident. */
  requestId: string | null
}

/**
 * Erreur des routes de lecture (cours, pages, quiz, PDF ; hors dossier, plan UC3 §4) ; `null` = pas de réponse HTTP.
 * 401 : redirection ; 404 `COURS_INTROUVABLE` ou sans code : « Cours introuvable. » ; autre (dont 404
 * `VERSION_INTROUVABLE`, `FICHIER_INTROUVABLE` : PDF supprimé) : `error` du back, sinon texte provisoire. Toujours
 * « Recharger ».
 */
export function lireErreurChargement(erreur: ErreurRecue | null): ErreurChargement {
  if (erreur?.statut === 401) return { ...REDIRECTION_CONNEXION, requestId: null }
  const coursIntrouvable = erreur?.statut === 404 && (erreur.code ?? 'COURS_INTROUVABLE') === 'COURS_INTROUVABLE'
  const message = coursIntrouvable ? MESSAGE_COURS_INTROUVABLE : erreur?.error ?? MESSAGE_CHARGEMENT_PROVISOIRE
  return { message, affichage: 'BANDEAU', action: 'RECHARGER', bloquer: false, requestId: erreur?.request_id ?? null }
}

// TODO(UC3): message d'échec de « Retirer » et « Déplacer » absent de la spec (sans réponse du serveur, ou sans
// `error`). Valeur provisoire, isolée ici.
export const MESSAGE_MODIFICATION_PROVISOIRE = 'La modification de la page a échoué, réessayez.'

/**
 * Erreur de `DELETE` ou `PATCH /api/pages/{idPage}` (back, docs/API.md §3.2) : mêmes codes et messages que
 * l'insertion (COURS_ARCHIVE, VERSION_PERIMEE, QUIZ_EN_SEANCE, EMPLACEMENT_INVALIDE, REQUETE_INVALIDE), sauf le
 * message d'ERREUR_SERVEUR, propre à l'insertion : `error` du back (dont `PAGE_INTROUVABLE`), sinon texte provisoire.
 */
export function lireErreurModification(erreur: ErreurRecue): ErreurEditeur {
  const lue = lireErreurInsertion(erreur)
  if (lue.message !== ERREURS_INSERTION.ERREUR_SERVEUR.message) return lue
  return { ...lue, message: erreur.error ?? MESSAGE_MODIFICATION_PROVISOIRE }
}

/** Pas de réponse HTTP pendant un retrait ou un déplacement : texte provisoire, avec « Recharger ». */
export function erreurReseauModification(): ErreurEditeur {
  return { message: MESSAGE_MODIFICATION_PROVISOIRE, affichage: 'BANDEAU', action: 'RECHARGER', bloquer: false }
}
