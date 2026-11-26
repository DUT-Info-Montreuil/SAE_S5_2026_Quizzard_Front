// Appels au back pour l'éditeur E3, UC3 « Insérer une page de quiz » (plan UC3, B3 ; §3).
// Tout passe par requete() ou requeteBinaire() de shared/http, jamais par fetch directement.
// Les réponses sont converties par convertirCours.ts, seul endroit qui lit leur forme.

import { ErreurHttp } from '../../../shared/http/ErreurHttp.ts'
import { requete, requeteBinaire } from '../../../shared/http/clientHttp.ts'
import type { Cours, Emplacement, PageInseree, PageQuizInseree, QuizResume } from '../domain/cours.ts'
import { convertirCours, convertirPageQuizInseree, convertirPages, convertirQuiz } from './convertirCours.ts'

const cheminCours = (idCours: number) => `/api/cours/${idCours}`
const cheminVersion = (idCours: number, idVersion: number) => `${cheminCours(idCours)}/versions/${idVersion}`

/** Lit la réponse JSON et la convertit ; une forme inattendue lève une `Error`. */
async function lire<T>(chemin: string, convertir: (valeur: unknown) => T | null, signal?: AbortSignal): Promise<T> {
  const { donnees } = await requete<unknown>(chemin, { signal })
  const resultat = convertir(donnees)
  if (resultat === null) throw new Error(`Réponse mal formée : ${chemin}`)
  return resultat
}

// Les fonctions de lecture lèvent l'erreur de requete() (ErreurHttp, ou erreur de fetch si le serveur n'a pas
// répondu), ou une Error si la réponse est mal formée.

/** `GET /api/cours/{idCours}` : cours et dernière version. */
export function lireCours(idCours: number, signal?: AbortSignal): Promise<Cours> {
  return lire(cheminCours(idCours), convertirCours, signal)
}

/** `GET .../versions/{idVersion}/pages` : pages insérées. */
export function lirePagesInserees(idCours: number, idVersion: number, signal?: AbortSignal): Promise<PageInseree[]> {
  return lire(`${cheminVersion(idCours, idVersion)}/pages`, convertirPages, signal)
}

/**
 * Quiz du cours, déduits de `GET .../versions/{idVersion}/pages` : le back n'a pas de route de liste des quiz.
 * shortcut: seuls les quiz qui ont une page dans la version sont listés, et la route des pages est lue deux fois ;
 * passer à la route de liste des quiz quand le back l'aura.
 */
export function lireQuizDuCours(idCours: number, idVersion: number, signal?: AbortSignal): Promise<QuizResume[]> {
  return lire(`${cheminVersion(idCours, idVersion)}/pages`, convertirQuiz, signal)
}

/**
 * `GET .../versions/{idVersion}/fichier` : PDF de la version, à donner à `ouvrirDocumentPdf()` (D6).
 * `404` `FICHIER_INTROUVABLE` si le fichier a été supprimé (UC20).
 */
export function lireFichierPdf(idCours: number, idVersion: number, signal?: AbortSignal): Promise<ArrayBuffer> {
  return requeteBinaire(`${cheminVersion(idCours, idVersion)}/fichier`, { signal })
}

export interface DemandeInsertion {
  idVersion: number
  emplacement: Emplacement
  /** `null` : « Nouveau quiz », la requête part sans `idQuiz`. */
  idQuiz: number | null
  /** `undefined` (ou vide) : la requête part sans `repereTexte`. */
  repereTexte: string | undefined
}

export type ResultatInsertion =
  /** 201 : à passer au reducer (`INSERTION_REUSSIE`). */
  | { resultat: 'REUSSIE', reponse: PageQuizInseree }
  /** Réponse HTTP en erreur : à passer au reducer (`INSERTION_REFUSEE`), qui la traduit par la table du domaine. */
  | { resultat: 'REFUSEE', erreur: ErreurHttp }
  /**
   * Aucune réponse du serveur : la page a peut-être été créée. L'appelant doit RELIRE les pages avant toute nouvelle
   * tentative, et ne jamais renvoyer la requête automatiquement (risque de doublon).
   */
  | { resultat: 'ECHEC_RESEAU' }

/**
 * `POST /api/cours/{idCours}/pages-quiz` (dossier, UC3) : corps `{idVersion, numeroPage, ordre, idQuiz?, repereTexte?}`.
 * Une annulation (`signal`) est relancée telle quelle : ce n'est pas une panne réseau.
 */
export async function insererPageQuiz(
  idCours: number,
  { idVersion, emplacement, idQuiz, repereTexte }: DemandeInsertion,
  signal?: AbortSignal,
): Promise<ResultatInsertion> {
  // Champs absents (pas `null`) : le back lit l'absence d'idQuiz comme « nouveau quiz ».
  const corps = {
    idVersion,
    numeroPage: emplacement.numeroPage,
    ordre: emplacement.ordre,
    ...(idQuiz === null ? {} : { idQuiz }),
    ...(repereTexte === undefined || repereTexte === '' ? {} : { repereTexte }),
  }
  try {
    const { donnees } = await requete<unknown>(`${cheminCours(idCours)}/pages-quiz`, { methode: 'POST', corps, signal })
    const reponse = convertirPageQuizInseree(donnees)
    // TODO(UC3): 201 mal formé absent du dossier. Valeur provisoire : traité comme une panne réseau (la page a été
    // créée mais l'éditeur ne peut pas l'afficher : il faut relire).
    if (reponse === null) return { resultat: 'ECHEC_RESEAU' }
    return { resultat: 'REUSSIE', reponse }
  } catch (erreur) {
    if (erreur instanceof ErreurHttp) return { resultat: 'REFUSEE', erreur }
    if (signal?.aborted) throw erreur
    return { resultat: 'ECHEC_RESEAU' }
  }
}
