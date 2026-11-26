// UC7, écran E5 : suivi et pilotage d'une séance.
// - l'état complet est lu par REST à l'ouverture, à chaque (re)connexion STOMP et après chaque commande ;
// - les changements arrivent par STOMP ; tant que STOMP n'est pas connecté (coupure, refus), l'état est relu par REST ;
// - les commandes passent par REST (CLAUDE.md, règle 4) ;
// - le réducteur ignore ce qui arrive en retard : l'ordre entre REST et STOMP n'a pas d'importance.

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { ErreurHttp } from '../../../shared/http/ErreurHttp.ts'
import { tempsRestantMs } from '../../../shared/lib/heureServeur.ts'
import { creerClientStomp } from '../../../shared/tempsReel/clientStomp.ts'
import type { ClientTempsReel } from '../../../shared/tempsReel/ClientTempsReel.ts'
import {
  cloreQuestionCourante, cloturerSeance, consulterSeance, demarrerQuestionSuivante,
} from '../api/animationApi.ts'
import type { LectureSeance } from '../api/animationApi.ts'
import { destinationsAnimation } from '../api/destinationsAnimation.ts'
import type { CanalAnimation } from '../api/destinationsAnimation.ts'
import { convertirMessageAnimation } from '../api/lecturesAnimation.ts'
import { estTerminee, reduireSeance } from '../domain/seanceAnimee.ts'

/** Relecture par REST tant que le temps réel n'est pas connecté. */
const INTERVALLE_RELECTURE_MS = 2000
/** Le serveur clôt 250 ms après l'échéance ; passé ce délai sans message, l'état est relu. */
const ATTENTE_CLOTURE_MS = 1500

/** La commande est arrivée après coup (clôture automatique, autre onglet) : la relecture suffit. */
const CODES_SANS_MESSAGE = ['AUCUNE_QUESTION_OUVERTE', 'SEANCE_TERMINEE']
/** Même texte que le 500 du back. */
const MESSAGE_PANNE = 'Une erreur est survenue. Réessayez dans un instant.'

export interface ErreurSeance {
  message: string
  /** À transmettre à l'équipe, pour un incident (5xx). */
  requestId: string | null
}

function versErreur(erreur: unknown): ErreurSeance {
  if (!(erreur instanceof ErreurHttp)) return { message: MESSAGE_PANNE, requestId: null }
  return {
    message: erreur.error ?? MESSAGE_PANNE,
    requestId: erreur.statut >= 500 ? erreur.request_id : null,
  }
}

export interface OptionsSeanceEnDirect {
  idSession: number
  /** 401 : retour à l'écran de connexion. */
  onNonConnecte: () => void
  /** `creerClientStomp` par défaut ; un faux client dans les tests. */
  creerClient?: () => ClientTempsReel
}

export function useSeanceEnDirect({
  idSession, onNonConnecte, creerClient = creerClientStomp,
}: OptionsSeanceEnDirect) {
  const [direct, dispatch] = useReducer(reduireSeance, null)
  /** Séance inaccessible (403, 404) : rien à afficher, plus rien à relire. */
  const [refus, setRefus] = useState<ErreurSeance | null>(null)
  const [erreur, setErreur] = useState<ErreurSeance | null>(null)
  const [connexionPerdue, setConnexionPerdue] = useState(false)
  const [tempsReelConnecte, setTempsReelConnecte] = useState(false)
  const [commandeEnCours, setCommandeEnCours] = useState(false)
  const verrou = useRef(false)

  const surNonConnecte = useRef(onNonConnecte)
  useEffect(() => {
    surNonConnecte.current = onNonConnecte
  })

  const appliquer = useCallback((lecture: LectureSeance) => {
    setConnexionPerdue(false)
    dispatch({ type: 'ETAT_RELU', ...lecture })
  }, [])

  const relire = useCallback(async (signal?: AbortSignal) => {
    try {
      const lecture = await consulterSeance(idSession, signal)
      if (!signal?.aborted) appliquer(lecture)
    } catch (e) {
      if (signal?.aborted) return
      if (e instanceof ErreurHttp && e.statut === 401) surNonConnecte.current()
      else if (e instanceof ErreurHttp && e.statut < 500) setRefus(versErreur(e))
      else setConnexionPerdue(true)
    }
  }, [idSession, appliquer])

  const arret = refus !== null || (direct !== null && estTerminee(direct.seance))

  // Lecture à l'ouverture, puis relecture régulière sans temps réel ou après une lecture manquée.
  const aRelire = !arret && (!tempsReelConnecte || connexionPerdue)
  useEffect(() => {
    if (!aRelire) return
    const controleur = new AbortController()
    let minuteur: ReturnType<typeof setTimeout>
    const boucle = async () => {
      await relire(controleur.signal)
      if (!controleur.signal.aborted) minuteur = setTimeout(boucle, INTERVALLE_RELECTURE_MS)
    }
    void boucle()
    return () => {
      controleur.abort()
      clearTimeout(minuteur)
    }
  }, [aRelire, relire])

  // Temps réel, dès que le code d'accès est connu et jusqu'à la fin de la séance.
  const codeAcces = direct?.seance.codeAcces
  useEffect(() => {
    if (codeAcces === undefined || arret) return
    const controleur = new AbortController()
    const client = creerClient()
    const destinations = destinationsAnimation(codeAcces)
    for (const canal of Object.keys(destinations) as CanalAnimation[]) {
      client.sAbonner(destinations[canal], (corps) => {
        const action = convertirMessageAnimation(canal, corps, Date.now())
        if (action !== null) dispatch(action)
      })
    }
    // L'enseignant est reconnu par son cookie de session : aucun en-tête.
    client.connecter({}, {
      connecte() {
        setTempsReelConnecte(true)
        // Le broker ne rejoue pas les messages émis avant l'abonnement.
        void relire(controleur.signal)
      },
      coupe: () => setTempsReelConnecte(false),
      refuse() {
        // Connexion refusée : insister ne sert à rien, la relecture par REST prend le relais.
        client.deconnecter()
        setTempsReelConnecte(false)
      },
    })
    return () => {
      controleur.abort()
      client.deconnecter()
      setTempsReelConnecte(false)
    }
  }, [codeAcces, arret, creerClient, relire])

  // Filet de sécurité : question toujours ouverte après son échéance (message de clôture perdu).
  const fin = direct?.fin ?? null
  const echeanceLocaleMs = fin === null ? null : fin.echeanceMs - fin.ecartMs
  useEffect(() => {
    if (echeanceLocaleMs === null) return
    const controleur = new AbortController()
    const minuteur = setTimeout(
      () => void relire(controleur.signal), tempsRestantMs(echeanceLocaleMs, 0) + ATTENTE_CLOTURE_MS)
    return () => {
      controleur.abort()
      clearTimeout(minuteur)
    }
  }, [echeanceLocaleMs, relire])

  const executer = async (commande: (idSession: number) => Promise<LectureSeance>) => {
    if (verrou.current) return
    verrou.current = true
    setCommandeEnCours(true)
    setErreur(null)
    try {
      appliquer(await commande(idSession))
    } catch (e) {
      if (e instanceof ErreurHttp && e.statut === 401) {
        surNonConnecte.current()
      } else {
        if (!(e instanceof ErreurHttp && CODES_SANS_MESSAGE.includes(e.code ?? ''))) setErreur(versErreur(e))
        await relire()
      }
    } finally {
      verrou.current = false
      setCommandeEnCours(false)
    }
  }

  return {
    direct,
    refus,
    erreur,
    connexionPerdue,
    commandeEnCours,
    questionSuivante: () => executer(demarrerQuestionSuivante),
    cloreQuestion: () => executer(cloreQuestionCourante),
    terminer: () => executer(cloturerSeance),
  }
}
