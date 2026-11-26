// DÉMO de la route étudiant (plan UC9, B7), sans back : http://localhost:5173/demo/question, en développement
// seulement (route absente du build de production). `PageQuestion` tourne avec le faux client temps réel, qui rejoue
// `scenarioFactice` (question, coupure puis reconnexion, résultat, clôture), et une fausse API REST.

import { useState } from 'react'
import { destinationsSeance } from '../../features/seance/api/destinationsSeance.ts'
import { convertirResynchronisation } from '../../features/seance/api/messagesSeance.ts'
import { scenarioFactice } from '../../features/seance/api/scenarioFactice.ts'
import type { ApiSeance } from '../../features/seance/application/useRepondreQuestion.ts'
import { PageQuestion } from '../../features/seance/presentation/PageQuestion.tsx'
import { creerClientFactice } from '../../shared/tempsReel/ClientTempsReelFactice.ts'

const CODE_ACCES = 'DEMO42'

function preparerDemo() {
  const scenario = scenarioFactice(CODE_ACCES)
  const { question: destinationQuestion } = destinationsSeance(CODE_ACCES)
  const evenement = scenario.find((e) => e.type === 'message' && e.destination === destinationQuestion)
  const question = evenement?.type === 'message' ? JSON.parse(evenement.corps) : null
  let repondu = false

  const api: ApiSeance = {
    async envoyerReponse() {
      await new Promise((fin) => setTimeout(fin, 400))
      repondu = true
      return { resultat: 'ACCEPTEE', ecartMs: 0 }
    },
    // Écart 0 : décompte calé sur l'échéance du scénario. La question n'est rendue que tant qu'elle est ouverte.
    async lireEtat() {
      const ouverte = question !== null && Date.now() < question.echeance
      const etat = convertirResynchronisation({ question: ouverte ? question : null, dejaRepondu: repondu })
      if (etat === null) throw new Error('État de démo mal formé.')
      return { ...etat, ecartMs: 0 }
    },
  }
  return { api, creerClient: () => creerClientFactice(scenario) }
}

export default function DemoQuestion() {
  const [{ api, creerClient }] = useState(preparerDemo)
  return (
    <PageQuestion
      codeAcces={CODE_ACCES}
      jetonParticipant="jeton-demo"
      api={api}
      creerClient={creerClient}
      onRejoindre={() => {}}
    />
  )
}
