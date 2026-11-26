/** Cours affiché dans « Mes cours » (E2). */
export interface Cours {
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
export interface CoursOuvert extends Cours {
  idVersion: number
}

/** Liste du serveur, précédée des cours importés depuis son chargement. */
export function ajouterImportes(liste: Cours[], importes: Cours[]): Cours[] {
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
export function etatCours(cours: Cours): 'PRET' | 'SANS_QUIZ' {
  return cours.nbQuiz > 0 ? 'PRET' : 'SANS_QUIZ'
}

/** « v3 · 6 pages · 2 quiz ». */
export function resumeVersion(cours: Cours): string {
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
export function libelleDate(cours: Cours, maintenant: Date): string {
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
