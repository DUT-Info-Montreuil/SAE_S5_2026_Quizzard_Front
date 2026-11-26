// Échéance d'une question, avec le repli D12 du plan UC9.
// Pas de console.warn ici (domaine pur) : l'appelant signale le repli en développement à partir de `repli`.

import { lireInstantServeur } from '../../../shared/lib/heureServeur.ts'
import type { Question } from './question.ts'

export interface EcheanceQuestion {
  /** Échéance en millisecondes UTC, à passer à `tempsRestantMs`. */
  echeanceMs: number
  /** Écart avec le serveur à utiliser avec cette échéance (0 en repli : horloge de l'appareil). */
  ecartMs: number
  /** Vrai si l'heure du serveur ou l'échéance est inconnue : décompte calé sur la réception + `dureeSec`. */
  repli: boolean
}

/**
 * @param ecartMs écart avec le serveur (`ecartAvecServeur`), `null` s'il est inconnu.
 * @param recueA heure de l'appareil à la réception de la question, en millisecondes.
 */
export function echeanceQuestion(
  question: Pick<Question, 'echeance' | 'dureeSec'>,
  ecartMs: number | null,
  recueA: number,
): EcheanceQuestion {
  const echeanceMs = lireInstantServeur(question.echeance)
  if (echeanceMs === null || ecartMs === null) {
    return { echeanceMs: recueA + question.dureeSec * 1000, ecartMs: 0, repli: true }
  }
  return { echeanceMs, ecartMs, repli: false }
}
