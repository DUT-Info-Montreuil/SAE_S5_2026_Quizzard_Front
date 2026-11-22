// Corps de la requête POST /api/public/sessions/{codeAcces}/reponses (plan UC9, §3).
// Aucun horodatage : le serveur horodate la réponse.

import type { Question, ReponseSaisie } from './question.ts'

// TODO(UC9): noms à aligner avec le back (plan UC9, question B3) : `propositions` ou `idPropositions`,
// `texte` ou `texteLibre`. Seul endroit à modifier quand ils seront fixés.
export const CHAMPS_CORPS = {
  propositions: 'propositions',
  liens: 'liens',
  texte: 'texte',
} as const

export type CorpsReponse = Readonly<Record<string, unknown>>

/** Construit le corps à envoyer ; `null` si la saisie ne correspond pas au type de la question. */
export function corpsReponse(question: Question, saisie: ReponseSaisie): CorpsReponse | null {
  if (question.type !== saisie.type) return null
  const { idQuestion } = question
  switch (saisie.type) {
    case 'QCM':
      return { idQuestion, [CHAMPS_CORPS.propositions]: [...saisie.propositions] }
    case 'POINTS_A_RELIER':
      return { idQuestion, [CHAMPS_CORPS.liens]: saisie.liens.map(({ gauche, droite }) => ({ gauche, droite })) }
    case 'REPONSE_LIBRE':
      return { idQuestion, [CHAMPS_CORPS.texte]: saisie.texte }
  }
}
