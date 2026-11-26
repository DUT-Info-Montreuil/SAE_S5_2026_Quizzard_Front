// Assemblage de l'UC8 « Rejoindre un quiz » côté étudiant (plan UC8, B2, D12, D13 et D16).
// Relie le reducer de E7 (domaine), les deux appels REST (api) et le stockage du jeton (`jetonParticipant`).
//
// - Chargement : GET au montage, annulé au démontage (AbortController).
// - Envoi : le POST part quand l'écran passe en envoi (ENTRER valide), une seule fois ; un double clic ou Entrée
//   répétée ne fait qu'un envoi (le reducer ignore ENTRER pendant l'envoi, D13).
// - Succès : le jeton est gardé, puis `onRejoint` est appelé (navigation vers E8, D12). Si le jeton ne peut pas être
//   gardé, l'écran revient au formulaire avec MESSAGE_ECHEC (question U5).
// - Le POST n'est pas annulé au démontage : le participant est peut-être déjà créé, son jeton est gardé quand même.
//
// L'API est injectable : la vraie par défaut, une fausse pour la démo et les tests.

import { useCallback, useEffect, useEffectEvent, useReducer, useRef } from 'react'
import { consulterSession, rejoindreSession } from '../api/rejoindreApi.ts'
import { ETAT_INITIAL_REJOINDRE, peutEntrer, reducerRejoindre } from '../domain/ecranRejoindre.ts'
import type { EcranRejoindre } from '../domain/ecranRejoindre.ts'
import { enregistrerJeton } from './jetonParticipant.ts'

export interface ApiRejoindre {
  consulterSession: typeof consulterSession
  rejoindreSession: typeof rejoindreSession
}

const API_REJOINDRE: ApiRejoindre = { consulterSession, rejoindreSession }

export interface OptionsRejoindreQuiz {
  codeAcces: string
  /** Appelé une fois le jeton gardé : navigation vers E8. */
  onRejoint: () => void
  /** Appels REST ; les vrais par défaut. Doit être stable (identité inchangée). */
  api?: ApiRejoindre
}

export interface RejoindreQuiz {
  ecran: EcranRejoindre
  /** « Entrer dans le quiz » actif. */
  peutEntrer: boolean
  changerSaisie: (texte: string) => void
  entrer: () => void
  choisirSuggestion: () => void
}

export function useRejoindreQuiz({ codeAcces, onRejoint, api = API_REJOINDRE }: OptionsRejoindreQuiz): RejoindreQuiz {
  const [ecran, dispatch] = useReducer(reducerRejoindre, ETAT_INITIAL_REJOINDRE)
  const surRejoint = useEffectEvent(onRejoint)

  useEffect(() => {
    const controleur = new AbortController()
    api.consulterSession(codeAcces, controleur.signal).then(
      (resultat) => {
        if (resultat.resultat === 'OUVERTE') dispatch({ type: 'SESSION_CHARGEE', session: resultat.session })
        else if (resultat.resultat === 'REFUSEE') dispatch({ type: 'CHARGEMENT_REFUSE', erreur: resultat.erreur })
        else dispatch({ type: 'CHARGEMENT_ECHOUE' })
      },
      // Annulation (démontage) : rien à faire. Corps mal formé : échec du chargement.
      () => { if (!controleur.signal.aborted) dispatch({ type: 'CHARGEMENT_ECHOUE' }) },
    )
    return () => controleur.abort()
  }, [api, codeAcces])

  /** Vrai entre le départ du POST et sa réponse : un seul POST par envoi. */
  const envoiParti = useRef(false)
  const enEnvoi = ecran.nom === 'FORMULAIRE' && ecran.envoi
  const saisie = ecran.nom === 'FORMULAIRE' ? ecran.saisie : ''
  useEffect(() => {
    if (!enEnvoi || envoiParti.current) return
    envoiParti.current = true
    api.rejoindreSession(codeAcces, saisie).then(
      (resultat) => {
        envoiParti.current = false
        if (resultat.resultat === 'REFUSEE') dispatch({ type: 'ENVOI_REFUSE', erreur: resultat.erreur })
        else if (resultat.resultat === 'ECHEC_RESEAU') dispatch({ type: 'ENVOI_ECHOUE' })
        else if (enregistrerJeton(codeAcces, resultat.jeton)) surRejoint()
        else dispatch({ type: 'ENVOI_ECHOUE' })
      },
      // Corps du 201 mal formé : traité comme une panne (provisoire, question U1).
      () => {
        envoiParti.current = false
        dispatch({ type: 'ENVOI_ECHOUE' })
      },
    )
  }, [api, codeAcces, enEnvoi, saisie])

  const changerSaisie = useCallback((texte: string) => dispatch({ type: 'SAISIE', texte }), [])
  const entrer = useCallback(() => dispatch({ type: 'ENTRER' }), [])
  const choisirSuggestion = useCallback(() => dispatch({ type: 'SUGGESTION_CHOISIE' }), [])

  return { ecran, peutEntrer: peutEntrer(ecran), changerSaisie, entrer, choisirSuggestion }
}
