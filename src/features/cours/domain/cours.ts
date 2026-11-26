// Types du domaine `cours` (plan UC3, §5 ; UC3, diagramme de classes et contrat de POST .../pages-quiz).
// Formes déjà converties et vérifiées par la couche api (B3) : aucun DTO brut ici.

/** Type d'une page insérée : page de quiz (UC3) ou page de classement (UC11, affichée sans action). */
export type TypePage = 'QUIZ' | 'CLASSEMENT'

/** Page insérée dans une version du cours (élément de `pages` de la réponse 201). */
export interface PageInseree {
  idPage: number
  /** Page du PDF après laquelle la page s'insère (0 : avant la première, nbPages : après la dernière). */
  numeroPage: number
  /** Rang parmi les pages insérées au même endroit (0 : juste après la page du PDF). */
  ordre: number
  type: TypePage
}

/** Emplacement d'insertion envoyé au back. */
export interface Emplacement {
  numeroPage: number
  ordre: number
}

export interface QuizResume {
  idQuiz: number
  titre: string
}

export interface VersionCours {
  idVersion: number
  /** Numéro de la version : la dernière a le plus grand. */
  numero: number
  nbPages: number
}

/** Réponse 201 de POST /api/cours/{idCours}/pages-quiz (UC3, PageQuizResponse). */
export interface PageQuizInseree {
  idPage: number
  idQuiz: number
  titreQuiz: string
  quizCree: boolean
  idQuestion: number
  numeroPage: number
  ordre: number
  /** Liste à jour des pages insérées de la version : remplace celle de l'éditeur (D9). */
  pages: PageInseree[]
}

/** Cours ouvert dans l'éditeur, avec sa dernière version. */
export interface Cours {
  idCours: number
  titre: string
  archive: boolean
  version: VersionCours
}
