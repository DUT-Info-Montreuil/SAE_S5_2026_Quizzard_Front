// DÉMO TEMPORAIRE du temps réel (plan UC9, B6), sans back : http://localhost:5173/?demo=temps-reel en développement.
// Le faux client rejoue `scenarioFactice` : question, coupure puis reconnexion, résultat, message mal formé, clôture.
// L'envoi REST et la resynchronisation sont simulés. Pour la supprimer : effacer le dossier src/app/demo/ et le bloc
// « démo » de src/app/main.tsx.

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { scenarioFactice } from '../../features/seance/api/scenarioFactice.ts'
import type { Resynchronisation } from '../../features/seance/api/messagesSeance.ts'
import { useTempsReelSeance } from '../../features/seance/application/useTempsReelSeance.ts'
import { echeanceQuestion } from '../../features/seance/domain/echeance.ts'
import { ETAT_INITIAL, reducerReponse } from '../../features/seance/domain/machineReponse.ts'
import type { ActionReponse } from '../../features/seance/domain/machineReponse.ts'
import { saisieVide } from '../../features/seance/domain/question.ts'
import type { Question, ReponseSaisie } from '../../features/seance/domain/question.ts'
import { BandeauConnexion } from '../../features/seance/presentation/BandeauConnexion.tsx'
import { EcranQuestion } from '../../features/seance/presentation/EcranQuestion.tsx'
import { EcranResultat } from '../../features/seance/presentation/EcranResultat.tsx'
import { creerClientFactice } from '../../shared/tempsReel/ClientTempsReelFactice.ts'
import { tempsRestantMs } from '../../shared/lib/heureServeur.ts'

const CODE_ACCES = 'DEMO42'

interface QuestionRecue {
  question: Question
  recueA: number
}

function restant(recue: QuestionRecue | null, maintenant: number): number {
  if (recue === null) return 0
  // Écart inconnu dans la démo : repli D12 (réception + dureeSec).
  const { echeanceMs, ecartMs } = echeanceQuestion(recue.question, null, recue.recueA)
  return tempsRestantMs(echeanceMs, ecartMs, maintenant)
}

export default function DemoTempsReel() {
  const [etat, dispatchReducer] = useReducer(reducerReponse, ETAT_INITIAL)
  const [recue, setRecue] = useState<QuestionRecue | null>(null)
  const [saisie, setSaisie] = useState<ReponseSaisie | null>(null)
  const [maintenant, setMaintenant] = useState(() => Date.now())
  const derniereQuestion = useRef<QuestionRecue | null>(null)

  // Garde la dernière question reçue : sert au décompte et à la fausse resynchronisation.
  const dispatch = useCallback((action: ActionReponse) => {
    if (action.type === 'QUESTION_RECUE' && action.question.idQuestion !== derniereQuestion.current?.question.idQuestion) {
      derniereQuestion.current = { question: action.question, recueA: Date.now() }
      setRecue(derniereQuestion.current)
      setSaisie(saisieVide(action.question))
    }
    dispatchReducer(action)
  }, [])

  const creerClient = useCallback(() => creerClientFactice(scenarioFactice(CODE_ACCES)), [])

  useTempsReelSeance({
    codeAcces: CODE_ACCES,
    jetonParticipant: 'jeton-demo',
    etat,
    dispatch,
    resteDuTemps: () => restant(derniereQuestion.current, Date.now()) > 0,
    resynchroniser: async (): Promise<Resynchronisation> => {
      const derniere = derniereQuestion.current
      const enCours = derniere !== null && restant(derniere, Date.now()) > 0
      return { question: enCours ? derniere.question : null, dejaRepondu: false }
    },
    surRenvoi: () => dispatch({ type: 'ENVOI_REUSSI' }),
    creerClient,
  })

  const tempsRestant = restant(recue, maintenant)
  const saisieEnCours = etat.ecran.nom === 'SAISIE'

  useEffect(() => {
    const minuteur = setInterval(() => setMaintenant(Date.now()), 250)
    return () => clearInterval(minuteur)
  }, [])

  useEffect(() => {
    if (saisieEnCours && tempsRestant <= 0) dispatch({ type: 'TEMPS_ECOULE' })
  }, [saisieEnCours, tempsRestant, dispatch])

  const { ecran } = etat
  return (
    <>
      {etat.connexionPerdue && <BandeauConnexion />}
      {ecran.nom === 'CHARGEMENT' && <main className="ecran-etudiant"><p role="status">Chargement…</p></main>}
      {(ecran.nom === 'SAISIE' || ecran.nom === 'ENVOI') && saisie !== null && (
        <EcranQuestion
          question={ecran.question}
          saisie={saisie}
          onChangerSaisie={setSaisie}
          tempsRestantMs={tempsRestant}
          envoiEnCours={ecran.nom === 'ENVOI'}
          erreur={ecran.nom === 'SAISIE' ? ecran.erreur?.message ?? null : null}
          arriveeEnCours={false}
          onValider={() => {
            dispatch({ type: 'VALIDER', saisie, resteDuTemps: tempsRestant > 0 })
            setTimeout(() => dispatch({ type: 'ENVOI_REUSSI' }), 400)
          }}
        />
      )}
      {ecran.nom !== 'CHARGEMENT' && ecran.nom !== 'SAISIE' && ecran.nom !== 'ENVOI' && (
        <EcranResultat ecran={ecran} onRejoindre={() => {}} onRecharger={() => location.reload()} />
      )}
    </>
  )
}
