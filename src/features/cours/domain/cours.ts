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

/** Liste du serveur, précédée des cours importés depuis son chargement. */
export function ajouterImportes(liste: Cours[], importes: Cours[]): Cours[] {
  return [...importes.filter((i) => !liste.some((c) => c.idCours === i.idCours)), ...liste]
}

const FORMAT_DATE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

export function formaterDate(dateIso: string): string {
  const date = new Date(dateIso)
  return Number.isNaN(date.getTime()) ? '—' : FORMAT_DATE.format(date)
}
