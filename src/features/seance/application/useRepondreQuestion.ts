// Assemblage de l'UC9 « Répondre à une question » côté étudiant (plan UC9, B7).
// Relie le reducer (domaine), l'envoi et la lecture de l'état par REST (api), le temps réel STOMP
// (`useTempsReelSeance`) et le décompte calé sur l'heure du serveur (shared/lib).
//
// - Chargement : l'écran reste en CHARGEMENT jusqu'à la lecture de l'état par REST, faite par `useTempsReelSeance` à
//   la connexion puis après chaque reconnexion. Un rechargement de la page suit le même chemin.
// - Décompte (D9) : échéance − (heure de l'appareil + écart avec le serveur), rafraîchi à chaque changement de seconde
//   du temps restant. Écart inconnu ou échéance illisible : repli D12 (réception + `dureeSec`), dans `echeanceQuestion`.
// - Envoi : l'appel part quand l'écran passe en ENVOI, une seule fois par corps ; un double clic ne fait qu'un envoi
//   (le second VALIDER est ignoré par le reducer, déjà en ENVOI).
// - Panne réseau (D14, précisé le 23/11/2026) : un seul renvoi automatique, tout de suite si STOMP est connecté,
//   sinon à la reconnexion. Si ce renvoi échoue aussi, la reconnexion suivante repasse par CHARGEMENT et relit l'état.
// - Nouvelle question : saisie remise à zéro (le reducer repasse en SAISIE).
//
// Le client temps réel (`creerClient`) et l'API (`api`) sont injectables : vrais par défaut, faux pour la démo et les
// tests.

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { estEnDeveloppement } from '../../../shared/config/config.ts'
import { tempsRestantMs } from '../../../shared/lib/heureServeur.ts'
import type { ClientTempsReel } from '../../../shared/tempsReel/ClientTempsReel.ts'
import { envoyerReponse, lireEtat } from '../api/reponsesApi.ts'
import type { CorpsReponse } from '../domain/corpsReponse.ts'
import { echeanceQuestion } from '../domain/echeance.ts'
import { ETAT_INITIAL, reducerReponse } from '../domain/machineReponse.ts'
import type { ActionReponse, EtatReponse } from '../domain/machineReponse.ts'
import { saisieVide } from '../domain/question.ts'
import type { Question, ReponseSaisie } from '../domain/question.ts'
import { supprimerJeton } from './jetonParticipant.ts'
import { useTempsReelSeance } from './useTempsReelSeance.ts'

export interface ApiSeance {
  envoyerReponse: typeof envoyerReponse
  lireEtat: typeof lireEtat
}

const API_SEANCE: ApiSeance = { envoyerReponse, lireEtat }

export interface OptionsRepondreQuestion {
  codeAcces: string
  jetonParticipant: string
  /** Fabrique du client temps réel ; `creerClientStomp` par défaut. Doit être stable (identité inchangée). */
  creerClient?: () => ClientTempsReel
  /** Appels REST ; les vrais par défaut. */
  api?: ApiSeance
}

export interface RepondreQuestion {
  etat: EtatReponse
  /** Saisie en cours de la question courante, `null` avant la première question. */
  saisie: ReponseSaisie | null
  changerSaisie: (saisie: ReponseSaisie) => void
  tempsRestantMs: number
  /** Question reçue par la lecture de l'état (arrivée en cours de question), pas par le temps réel. */
  arriveeEnCours: boolean
  valider: () => void
}

interface QuestionRecue {
  question: Question
  /** Heure de l'appareil à la réception (repli D12). */
  recueA: number
  arriveeEnCours: boolean
}

function restant(recue: QuestionRecue | null, ecartMs: number | null, maintenant: number): number {
  if (recue === null) return 0
  const echeance = echeanceQuestion(recue.question, ecartMs, recue.recueA)
  return tempsRestantMs(echeance.echeanceMs, echeance.ecartMs, maintenant)
}

export function useRepondreQuestion({
  codeAcces,
  jetonParticipant,
  creerClient,
  api = API_SEANCE,
}: OptionsRepondreQuestion): RepondreQuestion {
  const [etat, dispatchReducer] = useReducer(reducerReponse, ETAT_INITIAL)
  const [recue, setRecue] = useState<QuestionRecue | null>(null)
  const [saisie, setSaisie] = useState<ReponseSaisie | null>(null)
  const [ecartMs, setEcartMs] = useState<number | null>(null)
  const [maintenant, setMaintenant] = useState(() => Date.now())

  // Copies lues par les rappels asynchrones (réseau, temps réel), mises à jour en même temps que l'état.
  const courant = useRef<{ recue: QuestionRecue | null, ecartMs: number | null }>({ recue: null, ecartMs: null })
  const stompCoupe = useRef(false)
  /** Dernier corps envoyé : un résultat qui ne s'y rapporte plus (nouvelle question entre-temps) est ignoré. */
  const corpsEnvoye = useRef<CorpsReponse | null>(null)
  /** Corps déjà renvoyé une fois (D14) : pas de second renvoi. */
  const corpsRenvoye = useRef<CorpsReponse | null>(null)

  const resteDuTemps = useCallback(
    () => restant(courant.current.recue, courant.current.ecartMs, Date.now()) > 0,
    [],
  )

  // Garde le dernier écart connu : une réponse sans en-tête Date lisible ne l'efface pas.
  const noterEcart = useCallback((ecart: number | null) => {
    if (ecart === null) return
    courant.current.ecartMs = ecart
    setEcartMs(ecart)
  }, [])

  // Passe chaque action au reducer, après avoir noté une nouvelle question (réception, saisie vide) et l'état de STOMP.
  const dispatch = useCallback((action: ActionReponse) => {
    if (action.type === 'CONNEXION_PERDUE') stompCoupe.current = true
    if (action.type === 'RECONNEXION') stompCoupe.current = false
    const question = action.type === 'QUESTION_RECUE' || action.type === 'RESYNCHRONISEE' ? action.question : null
    if (question !== null && question.idQuestion !== courant.current.recue?.question.idQuestion) {
      const instant = Date.now()
      courant.current.recue = { question, recueA: instant, arriveeEnCours: action.type === 'RESYNCHRONISEE' }
      setRecue(courant.current.recue)
      setSaisie(saisieVide(question))
      setMaintenant(instant)
    }
    dispatchReducer(action)
  }, [])

  /** Envoie `corps` ; un renvoi n'est permis qu'une fois par corps (renvoie `false` sinon). */
  const envoyer = useCallback(function envoyer(corps: CorpsReponse, renvoi: boolean): boolean {
    if (renvoi) {
      if (corpsRenvoye.current === corps) return false
      corpsRenvoye.current = corps
    }
    corpsEnvoye.current = corps
    void api.envoyerReponse(codeAcces, jetonParticipant, corps).then((resultat) => {
      if (corpsEnvoye.current !== corps) return
      switch (resultat.resultat) {
        case 'ACCEPTEE':
          noterEcart(resultat.ecartMs)
          dispatch({ type: 'ENVOI_REUSSI' })
          break
        case 'REFUSEE':
          dispatch({ type: 'ENVOI_REFUSE', erreur: resultat.erreur, resteDuTemps: resteDuTemps() })
          break
        case 'ECHEC_RESEAU':
          dispatch({ type: 'ECHEC_RESEAU' })
          // STOMP toujours connecté : aucune reconnexion ne viendra déclencher le renvoi, il part tout de suite.
          if (!stompCoupe.current && resteDuTemps()) envoyer(corps, true)
          break
      }
    })
    return true
  }, [api, codeAcces, jetonParticipant, dispatch, noterEcart, resteDuTemps])

  const { ecran } = etat
  useEffect(() => {
    if (ecran.nom === 'ENVOI' && !ecran.renvoi && corpsEnvoye.current !== ecran.corps) envoyer(ecran.corps, false)
  }, [ecran, envoyer])

  useTempsReelSeance({
    codeAcces,
    jetonParticipant,
    etat,
    dispatch,
    resteDuTemps,
    resynchroniser: async (signal) => {
      const { ecartMs: ecart, ...resynchronisation } = await api.lireEtat(codeAcces, jetonParticipant, signal)
      noterEcart(ecart)
      return resynchronisation
    },
    surRenvoi: (corps) => envoyer(corps, true),
    creerClient,
  })

  // Décompte.
  const echeance = recue === null ? null : echeanceQuestion(recue.question, ecartMs, recue.recueA)
  const tempsRestant = echeance === null ? 0 : tempsRestantMs(echeance.echeanceMs, echeance.ecartMs, maintenant)
  useEffect(() => {
    if (tempsRestant <= 0) return
    // Réveil au prochain changement de seconde du temps restant (heure du serveur), pas de l'horloge de l'appareil.
    const minuteur = setTimeout(() => setMaintenant(Date.now()), (tempsRestant % 1000 || 1000) + 10)
    return () => clearTimeout(minuteur)
  }, [tempsRestant])

  const enSaisie = ecran.nom === 'SAISIE'
  useEffect(() => {
    if (enSaisie && recue !== null && tempsRestant <= 0) dispatch({ type: 'TEMPS_ECOULE' })
  }, [enSaisie, recue, tempsRestant, dispatch])

  // D12 : repli signalé en développement seulement, sans donnée personnelle.
  const repli = echeance?.repli ?? false
  const idQuestion = recue?.question.idQuestion
  useEffect(() => {
    if (repli && estEnDeveloppement) {
      console.warn(`[question ${idQuestion}] heure du serveur ou échéance inconnue : décompte calé sur dureeSec.`)
    }
  }, [repli, idQuestion])

  // Jeton supprimé quand il ne sert plus : session expirée (JETON_INVALIDE) ou séance close.
  useEffect(() => {
    if (ecran.nom === 'SESSION_EXPIREE' || ecran.nom === 'SEANCE_CLOSE') supprimerJeton(codeAcces)
  }, [ecran.nom, codeAcces])

  const valider = useCallback(() => {
    if (saisie !== null) dispatch({ type: 'VALIDER', saisie, resteDuTemps: resteDuTemps() })
  }, [saisie, dispatch, resteDuTemps])

  return {
    etat,
    saisie,
    changerSaisie: setSaisie,
    tempsRestantMs: tempsRestant,
    arriveeEnCours: recue?.arriveeEnCours ?? false,
    valider,
  }
}
