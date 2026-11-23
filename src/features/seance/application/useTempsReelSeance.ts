// Réception en temps réel de l'étudiant pendant une séance (plan UC9, B6).
// Ouvre un client STOMP à l'entrée de l'écran et le ferme à la sortie : en StrictMode, le premier client est fermé
// avant que le second s'ouvre, donc jamais de double abonnement.
// Réception seule : l'envoi de la réponse reste en REST (règle 4) ; le renvoi D14 est délégué à `surRenvoi`.
//
// Cycle :
// - chaque message reçu est converti par `convertirMessage` puis passé au reducer ;
// - coupure : CONNEXION_PERDUE (bandeau), la bibliothèque retente seule avec une attente croissante ;
// - (re)connexion : RECONNEXION (après une coupure ; si une réponse attend son renvoi D14, `surRenvoi` le lance
//   d'abord), puis resynchronisation par REST et RESYNCHRONISEE, qui corrige l'écran sans l'effacer ;
// - écran en CHARGEMENT alors que STOMP est connecté (renvoi D14 échoué) : resynchronisation tout de suite, aucune
//   reconnexion ne viendra la déclencher ;
// - JETON_REFUSE ou SEANCE_CLOTUREE : déconnexion définitive, sans reconnexion.

import { useEffect, useRef } from 'react'
import type { Dispatch } from 'react'
import { estEnDeveloppement } from '../../../shared/config/config.ts'
import { creerClientStomp } from '../../../shared/tempsReel/clientStomp.ts'
import type { ClientTempsReel } from '../../../shared/tempsReel/ClientTempsReel.ts'
import { destinationsSeance } from '../api/destinationsSeance.ts'
import type { CanalSeance } from '../api/destinationsSeance.ts'
import { convertirMessage, convertirRefus } from '../api/messagesSeance.ts'
import type { Resynchronisation } from '../api/messagesSeance.ts'
import type { CorpsReponse } from '../domain/corpsReponse.ts'
import type { ActionReponse, EtatReponse } from '../domain/machineReponse.ts'

export interface OptionsTempsReelSeance {
  codeAcces: string
  jetonParticipant: string
  /** État courant du reducer (lu à la reconnexion). */
  etat: EtatReponse
  dispatch: Dispatch<ActionReponse>
  /** Lecture de l'état par REST après une (re)connexion, par exemple avec `lireEtat`. */
  resynchroniser: (signal: AbortSignal) => Promise<Resynchronisation>
  /**
   * Renvoi du même corps à la reconnexion (D14) ; vrai si le renvoi est parti, maintenant ou avant (sa réponse est
   * attendue), faux s'il n'est plus possible (temps écoulé).
   */
  surRenvoi: (corps: CorpsReponse) => boolean
  /** Fabrique du client ; `creerClientStomp` par défaut, un faux client pour les tests et les démos. */
  creerClient?: () => ClientTempsReel
}

export function useTempsReelSeance({
  codeAcces,
  jetonParticipant,
  etat,
  dispatch,
  resynchroniser,
  surRenvoi,
  creerClient = creerClientStomp,
}: OptionsTempsReelSeance): void {
  // Dernières valeurs des props, lues par les rappels du client sans le recréer.
  const courant = useRef({ etat, dispatch, resynchroniser, surRenvoi })
  useEffect(() => {
    courant.current = { etat, dispatch, resynchroniser, surRenvoi }
  })
  /** Relit l'état par REST si STOMP est connecté ; fourni par l'effet de connexion. */
  const relireEtat = useRef(() => {})

  useEffect(() => {
    const client = creerClient()
    const controleur = new AbortController()
    let arrete = false
    let estConnecte = false

    function arreter() {
      arrete = true
      controleur.abort()
      client.deconnecter()
    }

    function emettre(action: ActionReponse) {
      if (arrete) return
      courant.current.dispatch(action)
      if (action.type === 'JETON_REFUSE' || action.type === 'SEANCE_CLOTUREE') arreter()
    }

    function resynchroniserParRest() {
      if (!estConnecte) return
      courant.current.resynchroniser(controleur.signal).then(
        // TODO(UC9): `dejaRepondu` pas encore fourni par GET .../etat (plan UC9, question B7). En attendant, une
        // réponse confirmée reste confirmée tant que la page n'est pas rechargée (RESYNCHRONISEE garde l'écran).
        // Une lecture qui revient pendant une coupure est ignorée : la reconnexion en relancera une.
        (resynchronisation) => {
          if (estConnecte) emettre({ type: 'RESYNCHRONISEE', ...resynchronisation })
        },
        () => {
          // L'écran garde son état ; CHARGEMENT en sort par une nouvelle question ou un résultat.
          if (!controleur.signal.aborted && estEnDeveloppement) {
            console.warn('[temps réel] resynchronisation par REST impossible')
          }
        },
      )
    }
    relireEtat.current = resynchroniserParRest

    const destinations = destinationsSeance(codeAcces)
    for (const canal of Object.keys(destinations) as CanalSeance[]) {
      client.sAbonner(destinations[canal], (corps) => {
        const action = convertirMessage(canal, corps)
        if (action !== null) emettre(action)
      })
    }

    client.connecter({ 'X-Jeton-Participant': jetonParticipant }, {
      connecte(reconnexion) {
        estConnecte = true
        if (reconnexion) {
          const { etat: { ecran }, surRenvoi } = courant.current
          // Sans renvoi possible, le reducer passe en CHARGEMENT ; sinon il garde ENVOI jusqu'à la réponse HTTP.
          const renvoiEnCours = ecran.nom === 'ENVOI' && ecran.renvoi && surRenvoi(ecran.corps)
          emettre({ type: 'RECONNEXION', renvoiEnCours })
        }
        resynchroniserParRest()
      },
      coupe() {
        estConnecte = false
        emettre({ type: 'CONNEXION_PERDUE' })
      },
      refuse(message) {
        const action = convertirRefus(message)
        if (action !== null) emettre(action)
      },
    })

    return () => {
      relireEtat.current = () => {}
      arreter()
    }
  }, [codeAcces, jetonParticipant, creerClient])

  // CHARGEMENT après l'échec du renvoi D14 : si STOMP est resté connecté, aucune reconnexion ne relira l'état.
  // Au montage, le client n'est pas encore connecté : la connexion fera la lecture.
  const enChargement = etat.ecran.nom === 'CHARGEMENT'
  useEffect(() => {
    if (enChargement) relireEtat.current()
  }, [enChargement])
}
