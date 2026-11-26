// Appels au back pour l'éditeur E3, UC3 « Insérer une page de quiz » (plan UC3, B3 ; §3).
// Tout passe par requete() ou requeteBinaire() de shared/http, jamais par fetch directement.
// Les réponses sont converties par convertirCours.ts, seul endroit qui lit leur forme.

import { ErreurHttp } from '../../../shared/http/ErreurHttp.ts'
import { requete, requeteBinaire } from '../../../shared/http/clientHttp.ts'
import type { Cours, CoursListe, CoursOuvert, Emplacement, PageInseree, PageQuizInseree, QuizResume } from '../domain/cours.ts'
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

export type ResultatModification =
  /** `pages` : pages de la version à jour (`PATCH`) ; `null` pour un retrait (`204`, sans corps). */
  | { resultat: 'REUSSIE', pages: PageInseree[] | null }
  | { resultat: 'REFUSEE', erreur: ErreurHttp }
  /** Aucune réponse du serveur : la page a peut-être été retirée ou déplacée, relire les pages. */
  | { resultat: 'ECHEC_RESEAU' }

/** Réponse ou erreur d'une modification de page ; une annulation (`signal`) est relancée telle quelle. */
async function modifierPage(
  idPage: number,
  options: { methode: 'DELETE' | 'PATCH', corps?: Emplacement },
  signal?: AbortSignal,
): Promise<ResultatModification> {
  try {
    const { donnees } = await requete<unknown>(`/api/pages/${idPage}`, { ...options, signal })
    if (options.methode === 'DELETE') return { resultat: 'REUSSIE', pages: null }
    const pages = convertirPages(donnees)
    // 200 mal formé : comme une panne réseau, la page a été déplacée mais il faut relire la liste.
    return pages === null ? { resultat: 'ECHEC_RESEAU' } : { resultat: 'REUSSIE', pages }
  } catch (erreur) {
    if (erreur instanceof ErreurHttp) return { resultat: 'REFUSEE', erreur }
    if (signal?.aborted) throw erreur
    return { resultat: 'ECHEC_RESEAU' }
  }
}

/** `DELETE /api/pages/{idPage}` → `204` : la question et le quiz sont conservés (back, docs/API.md §3.2). */
export function retirerPage(idPage: number, signal?: AbortSignal): Promise<ResultatModification> {
  return modifierPage(idPage, { methode: 'DELETE' }, signal)
}

/**
 * `PATCH /api/pages/{idPage}` `{numeroPage, ordre}` → `200` pages de la version à jour. `ordre` : rang parmi les
 * autres pages déjà à cet endroit (`emplacementDeplacement` du domaine).
 */
export function deplacerPage(idPage: number, { numeroPage, ordre }: Emplacement, signal?: AbortSignal): Promise<ResultatModification> {
  return modifierPage(idPage, { methode: 'PATCH', corps: { numeroPage, ordre } }, signal)
}

// ---- Liste « Mes cours », ouverture et import (UC2, E2) : routes REST de docs/API.md du back, §3.2.

function convertirCoursListe(valeur: unknown): CoursListe {
  const { idCours, titre, numeroVersion, nbPages, nbQuiz, dateModification } =
    (valeur ?? {}) as Record<string, unknown>
  if (
    typeof idCours !== 'number' || typeof titre !== 'string' || typeof numeroVersion !== 'number' ||
    typeof nbPages !== 'number' || typeof nbQuiz !== 'number' || typeof dateModification !== 'string'
  ) {
    throw new Error('Cours illisible')
  }
  return { idCours, titre, numeroVersion, nbPages, nbQuiz, dateModification }
}

/** `GET /api/cours` : cours non archivés de l'enseignant connecté, le plus récemment modifié d'abord. */
export async function listerCours(signal?: AbortSignal): Promise<CoursListe[]> {
  const { donnees } = await requete<unknown>('/api/cours', { signal })
  if (!Array.isArray(donnees)) throw new Error('Liste des cours illisible')
  return donnees.map(convertirCoursListe)
}

/**
 * `GET /api/cours/{idCours}` : le cours et sa dernière version (`idVersion`).
 * 404 `COURS_INTROUVABLE` : cours inexistant, archivé ou d'un autre enseignant.
 */
export async function ouvrirCours(idCours: number, signal?: AbortSignal): Promise<CoursOuvert> {
  const { donnees } = await requete<unknown>(`/api/cours/${idCours}`, { signal })
  const cours = convertirCoursListe(donnees)
  const { idVersion } = donnees as Record<string, unknown>
  if (typeof idVersion !== 'number') throw new Error('Cours illisible')
  return { ...cours, idVersion }
}

export interface DemandeImport {
  fichier: File
  titre: string
  /** Vrai pour importer un PDF déjà présent dans un autre cours. */
  confirmerDoublon: boolean
}

/** `POST /api/cours` : importe un PDF, crée un cours en version 1. */
export async function importerCours({ fichier, titre, confirmerDoublon }: DemandeImport): Promise<CoursListe> {
  const corps = new FormData()
  corps.append('fichier', fichier)
  corps.append('titre', titre)
  corps.append('confirmerDoublon', String(confirmerDoublon))
  const { donnees } = await requete<unknown>('/api/cours', { methode: 'POST', corps })
  return convertirCoursListe(donnees)
}
