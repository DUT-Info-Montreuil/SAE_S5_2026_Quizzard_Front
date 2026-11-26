// Scénario rejoué par le faux client temps réel (plan UC9, B6), pour les tests et la démo : messages du contrat
// (plan UC9, §3), une coupure, un message mal formé et la clôture de la séance.

import type { EvenementFactice } from '../../../shared/tempsReel/ClientTempsReelFactice.ts'
import { destinationsSeance } from './destinationsSeance.ts'

export function scenarioFactice(codeAcces: string, maintenant: number = Date.now()): EvenementFactice[] {
  const d = destinationsSeance(codeAcces)
  const message = (delaiMs: number, destination: string, corps: unknown): EvenementFactice =>
    ({ delaiMs, type: 'message', destination, corps: JSON.stringify(corps) })

  return [
    message(500, d.etat, { etat: 'QUESTION_OUVERTE', position: 1, idQuestion: 1, echeance: maintenant + 20_500 }),
    message(0, d.question, {
      idQuestion: 1,
      position: 1,
      type: 'QCM',
      enonce: 'Quelle structure garantit un accès en O(1) en moyenne ?',
      propositions: [
        { idProposition: 11, libelle: 'Liste chaînée' },
        { idProposition: 12, libelle: 'Table de hachage' },
        { idProposition: 13, libelle: 'Arbre binaire' },
      ],
      dureeSec: 20,
      echeance: maintenant + 20_500,
    }),
    { delaiMs: 8000, type: 'coupure' },
    { delaiMs: 3000, type: 'reconnexion' },
    message(10_000, d.correction, { bonnesReponses: [12] }),
    message(500, d.resultat, { points: 820, scoreTotal: 820, rang: 3, nombreParticipants: 24, evolution: 2 }),
    // Message mal formé : ignoré, avertissement en développement.
    message(4000, d.question, { idQuestion: 'deux' }),
    message(1000, d.etat, { etat: 'CLOTUREE', position: 1, idQuestion: 1, echeance: null }),
  ]
}
