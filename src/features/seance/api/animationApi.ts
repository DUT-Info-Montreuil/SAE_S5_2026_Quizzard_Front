// Routes REST de l'UC7 : lancer et dérouler une séance (docs/API.md du back).

import { requete } from '../../../shared/http/clientHttp.ts'
import type { OptionsRequete } from '../../../shared/http/clientHttp.ts'
import { ecartAvecServeur } from '../../../shared/lib/heureServeur.ts'
import type { EtatSeance, SeanceLancee } from '../domain/seanceAnimee.ts'
import { lireEtatSeance, lireSeanceLancee } from './lecturesAnimation.ts'

/** État de la séance, avec l'écart d'horloge et l'heure de réception qui calent le décompte. */
export interface LectureSeance {
  seance: EtatSeance
  ecartMs: number | null
  recuA: number
}

async function lireSeance(chemin: string, options?: OptionsRequete): Promise<LectureSeance> {
  const { donnees, enTeteDate } = await requete<unknown>(chemin, options)
  const recuA = Date.now()
  const seance = lireEtatSeance(donnees)
  if (seance === null) throw new Error('État de la séance illisible')
  return { seance, ecartMs: ecartAvecServeur(enTeteDate, recuA), recuA }
}

export async function lancerQuiz(idQuiz: number, autoriserIdentiteNonVerifiee: boolean): Promise<SeanceLancee> {
  const { donnees } = await requete<unknown>(`/api/quiz/${idQuiz}/sessions`, {
    methode: 'POST',
    corps: { autoriserIdentiteNonVerifiee },
  })
  const seance = lireSeanceLancee(donnees)
  if (seance === null) throw new Error('Réponse du lancement illisible')
  return seance
}

/** Séance non terminée de l'enseignant, à reprendre ou à terminer ; `404` s'il n'y en a pas. */
export const lireSeanceOuverte = () => lireSeance('/api/sessions/ouverte')

export const consulterSeance = (idSession: number, signal?: AbortSignal) =>
  lireSeance(`/api/sessions/${idSession}`, { signal })

export const demarrerQuestionSuivante = (idSession: number) =>
  lireSeance(`/api/sessions/${idSession}/questions/suivante`, { methode: 'POST' })

export const cloreQuestionCourante = (idSession: number) =>
  lireSeance(`/api/sessions/${idSession}/questions/courante/cloture`, { methode: 'POST' })

export const cloturerSeance = (idSession: number) =>
  lireSeance(`/api/sessions/${idSession}/cloture`, { methode: 'POST' })
