// Conversion des réponses du back en types du domaine `cours` (plan UC3, D2, §3 et B3). Seul fichier qui lit leur
// forme : une fonction par route. Chaque réponse est vérifiée champ par champ ; mal formée, elle donne `null`.
// Aucune règle métier ici : numérotation et transitions sont dans cours/domain.

import type { Cours, PageInseree, PageQuizInseree, QuizResume, TypePage, VersionCours } from '../domain/cours.ts'

type Objet = Record<string, unknown>

function estObjet(valeur: unknown): valeur is Objet {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
}

function estEntier(valeur: unknown): valeur is number {
  return Number.isInteger(valeur)
}

function estListe<T>(valeur: unknown, lireElement: (element: unknown) => T | null): T[] | null {
  if (!Array.isArray(valeur)) return null
  const elements = valeur.map(lireElement)
  return elements.every((e) => e !== null) ? (elements as T[]) : null
}

const TYPES_PAGE: readonly TypePage[] = ['QUIZ', 'CLASSEMENT']

function lirePage(valeur: unknown): PageInseree | null {
  if (!estObjet(valeur)) return null
  const { idPage, numeroPage, ordre, type } = valeur
  if (!estEntier(idPage) || !estEntier(numeroPage) || !estEntier(ordre)) return null
  if (!TYPES_PAGE.includes(type as TypePage)) return null
  const page: PageInseree = { idPage, numeroPage, ordre, type: type as TypePage }
  return estEntier(valeur.idQuiz) ? { ...page, idQuiz: valeur.idQuiz } : page
}

function lireVersion(valeur: unknown): VersionCours | null {
  if (!estObjet(valeur)) return null
  const { idVersion, numero, nbPages } = valeur
  if (!estEntier(idVersion) || !estEntier(numero) || !estEntier(nbPages)) return null
  return { idVersion, numero, nbPages }
}

/**
 * `GET /api/cours/{idCours}` (back, UC2) : cours et sa dernière version, forme
 * `{idCours, titre, idVersion, numeroVersion, nbPages, nbQuiz, dateModification}` ; `null` si mal formé.
 * TODO(UC3): le back n'envoie pas encore `archive` ; absent = cours non archivé.
 */
export function convertirCours(valeur: unknown): Cours | null {
  if (!estObjet(valeur)) return null
  const { idCours, titre, archive } = valeur
  if (!estEntier(idCours) || typeof titre !== 'string') return null
  if (archive !== undefined && typeof archive !== 'boolean') return null
  const version = lireVersion({ idVersion: valeur.idVersion, numero: valeur.numeroVersion, nbPages: valeur.nbPages })
  if (version === null) return null
  return { idCours, titre, archive: archive === true, version }
}

/**
 * `GET /api/cours/{idCours}/versions/{idVersion}/pages` : pages insérées ; `null` si mal formé.
 * TODO(UC3): forme provisoire (même forme que `pages` du 201), route absente du back (plan UC3, Q1).
 */
export function convertirPages(valeur: unknown): PageInseree[] | null {
  return estListe(valeur, lirePage)
}

/**
 * Quiz du cours, déduits des pages insérées (`idQuiz`, `titreQuiz` de chaque page de quiz), sans doublon ;
 * `null` si mal formé. Les pages sans quiz (classement) sont ignorées.
 */
export function convertirQuiz(valeur: unknown): QuizResume[] | null {
  if (!Array.isArray(valeur)) return null
  const quiz = new Map<number, string>()
  for (const page of valeur) {
    if (!estObjet(page)) return null
    const { idQuiz, titreQuiz } = page
    if (idQuiz === null || idQuiz === undefined) continue
    if (!estEntier(idQuiz) || typeof titreQuiz !== 'string') return null
    quiz.set(idQuiz, titreQuiz)
  }
  return [...quiz].map(([idQuiz, titre]) => ({ idQuiz, titre }))
}

/** Réponse 201 de `POST /api/cours/{idCours}/pages-quiz` (dossier, UC3) ; `null` si mal formée. */
export function convertirPageQuizInseree(valeur: unknown): PageQuizInseree | null {
  if (!estObjet(valeur)) return null
  const { idPage, idQuiz, titreQuiz, quizCree, idQuestion, numeroPage, ordre } = valeur
  if (
    !estEntier(idPage) || !estEntier(idQuiz) || typeof titreQuiz !== 'string' || typeof quizCree !== 'boolean' ||
    !estEntier(idQuestion) || !estEntier(numeroPage) || !estEntier(ordre)
  ) {
    return null
  }
  const pages = convertirPages(valeur.pages)
  if (pages === null) return null
  return { idPage, idQuiz, titreQuiz, quizCree, idQuestion, numeroPage, ordre, pages }
}
