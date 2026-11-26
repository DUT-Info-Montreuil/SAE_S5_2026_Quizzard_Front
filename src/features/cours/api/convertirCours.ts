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
  return { idPage, numeroPage, ordre, type: type as TypePage }
}

function lireVersion(valeur: unknown): VersionCours | null {
  if (!estObjet(valeur)) return null
  const { idVersion, numero, nbPages } = valeur
  if (!estEntier(idVersion) || !estEntier(numero) || !estEntier(nbPages)) return null
  return { idVersion, numero, nbPages }
}

/**
 * `GET /api/cours/{idCours}` : cours avec sa dernière version (`numero` le plus grand) ; `null` si mal formé ou sans
 * version.
 * TODO(UC3): forme provisoire `{idCours, titre, archive, versions: [{idVersion, numero, nbPages}]}`, route absente du
 * back (plan UC3, Q1).
 */
export function convertirCours(valeur: unknown): Cours | null {
  if (!estObjet(valeur)) return null
  const { idCours, titre, archive } = valeur
  if (!estEntier(idCours) || typeof titre !== 'string' || typeof archive !== 'boolean') return null
  const versions = estListe(valeur.versions, lireVersion)
  if (versions === null || versions.length === 0) return null
  const version = versions.reduce((derniere, v) => (v.numero > derniere.numero ? v : derniere))
  return { idCours, titre, archive, version }
}

/**
 * `GET /api/cours/{idCours}/versions/{idVersion}/pages` : pages insérées ; `null` si mal formé.
 * TODO(UC3): forme provisoire (même forme que `pages` du 201), route absente du back (plan UC3, Q1).
 */
export function convertirPages(valeur: unknown): PageInseree[] | null {
  return estListe(valeur, lirePage)
}

function lireQuiz(valeur: unknown): QuizResume | null {
  if (!estObjet(valeur) || !estEntier(valeur.idQuiz) || typeof valeur.titre !== 'string') return null
  return { idQuiz: valeur.idQuiz, titre: valeur.titre }
}

/**
 * `GET /api/cours/{idCours}/quiz` : quiz du cours (autres champs ignorés) ; `null` si mal formé.
 * TODO(UC3): forme provisoire `[{idQuiz, titre}]`, route absente du back (plan UC3, Q1).
 */
export function convertirQuiz(valeur: unknown): QuizResume[] | null {
  return estListe(valeur, lireQuiz)
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
