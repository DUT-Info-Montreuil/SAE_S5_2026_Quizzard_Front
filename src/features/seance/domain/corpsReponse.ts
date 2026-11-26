// Corps de la requête POST /api/public/sessions/{codeAcces}/reponses (plan UC9, §3 ; UC9, RepondreQuestionDto).
// Ni horodatage (le serveur horodate la réponse), ni idParticipant (lu dans le jeton), ni requestId.

import type { Lien, Question, ReponseSaisie } from './question.ts'

export type CorpsReponse =
  | { idQuestion: number, idPropositions: number[] }
  | { idQuestion: number, liens: Lien[] }
  | { idQuestion: number, texteLibre: string }

/** Construit le corps à envoyer ; `null` si la saisie ne correspond pas au type de la question. */
export function corpsReponse(question: Question, saisie: ReponseSaisie): CorpsReponse | null {
  if (question.type !== saisie.type) return null
  const { idQuestion } = question
  switch (saisie.type) {
    case 'QCM':
      return { idQuestion, idPropositions: [...saisie.propositions] }
    case 'POINTS_A_RELIER':
      return { idQuestion, liens: saisie.liens.map(({ gauche, droite }) => ({ gauche, droite })) }
    case 'REPONSE_LIBRE':
      return { idQuestion, texteLibre: saisie.texte }
  }
}
