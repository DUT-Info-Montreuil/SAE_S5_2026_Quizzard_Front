// Types du domaine `cours` (plan UC3, §5 ; UC3, diagramme de classes et contrat de POST .../pages-quiz).
// Formes déjà converties et vérifiées par la couche api (B3) : aucun DTO brut ici.

/** Type d'une page insérée : page de quiz (UC3) ou page de classement (UC11, affichée sans action). */
export type TypePage = 'QUIZ' | 'CLASSEMENT'

/** Page insérée dans une version du cours (élément de `pages` du 201 et de `GET .../pages`). */
export interface PageInseree {
  idPage: number
  /** Page du PDF après laquelle la page s'insère (0 : avant la première, nbPages : après la dernière). */
  numeroPage: number
  /** Rang parmi les pages insérées au même endroit (0 : juste après la page du PDF). */
  ordre: number
  type: TypePage
  /** Titre du quiz de la page ; `null` pour une page de classement. */
  titreQuiz: string | null
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

// ---- Liste « Mes cours » (UC2, E2) : cours résumé, sans les pages (le type `Cours` ci-dessus est celui de l'éditeur).

/** Cours affiché dans « Mes cours » (E2). */
export interface CoursListe {
  idCours: number
  titre: string
  /** Numéro de la dernière version. */
  numeroVersion: number
  /** Pages du PDF de la dernière version. */
  nbPages: number
  nbQuiz: number
  /** Date ISO 8601, heure du serveur. */
  dateModification: string
}

/** Cours ouvert (`GET /api/cours/{idCours}`) : les champs de la liste plus sa dernière version, celle de l'éditeur. */
export interface CoursOuvert extends CoursListe {
  idVersion: number
}

/** Liste du serveur, précédée des cours importés depuis son chargement. */
export function ajouterImportes(liste: CoursListe[], importes: CoursListe[]): CoursListe[] {
  return [...importes.filter((i) => !liste.some((c) => c.idCours === i.idCours)), ...liste]
}

const FORMAT_DATE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

export function formaterDate(dateIso: string): string {
  const date = new Date(dateIso)
  return Number.isNaN(date.getTime()) ? '—' : FORMAT_DATE.format(date)
}

/** Sigle de la pastille : « CM 1 Programmation » → « CM1 », « Réseaux » → « RÉ », « Bases de données » → « BD ». */
export function sigleCours(titre: string): string {
  const seance = /^(CM|TD|TP)\s*(\d{1,2})\b/i.exec(titre.trim())
  if (seance !== null) return `${seance[1]}${seance[2]}`.toUpperCase()
  const mots = titre.trim().split(/\s+/).filter((m) => m.length > 2)
  if (mots.length >= 2) return `${mots[0][0]}${mots[1][0]}`.toUpperCase()
  return (mots[0] ?? titre.trim()).slice(0, 2).toUpperCase() || '?'
}

/** « Prêt » : au moins un quiz ; « Sans quiz » sinon. */
export function etatCours(cours: CoursListe): 'PRET' | 'SANS_QUIZ' {
  return cours.nbQuiz > 0 ? 'PRET' : 'SANS_QUIZ'
}

/** « v3 · 6 pages · 2 quiz ». */
export function resumeVersion(cours: CoursListe): string {
  const pages = `${cours.nbPages} ${cours.nbPages > 1 ? 'pages' : 'page'}`
  const quiz = cours.nbQuiz === 0 ? 'aucun quiz' : `${cours.nbQuiz} quiz`
  return `v${cours.numeroVersion} · ${pages} · ${quiz}`
}

const FORMAT_JOUR = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const FORMAT_JOUR_ANNEE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * « Modifié hier », « Modifié le 29 sept. », « Importé le 8 oct. ». Un cours en v1 sans quiz n'a pas été modifié
 * depuis son import. Simple affichage : l'horloge de l'appareil suffit (`maintenant`).
 */
export function libelleDate(cours: CoursListe, maintenant: Date): string {
  const date = new Date(cours.dateModification)
  if (Number.isNaN(date.getTime())) return '—'
  const verbe = cours.numeroVersion === 1 && cours.nbQuiz === 0 ? 'Importé' : 'Modifié'
  const jour = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const ecart = Math.round((jour(maintenant) - jour(date)) / 86_400_000)
  if (ecart === 0) return `${verbe} aujourd'hui`
  if (ecart === 1) return `${verbe} hier`
  const format = date.getFullYear() === maintenant.getFullYear() ? FORMAT_JOUR : FORMAT_JOUR_ANNEE
  return `${verbe} le ${format.format(date)}`
}
