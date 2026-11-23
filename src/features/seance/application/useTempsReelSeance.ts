// Réception en temps réel de l'étudiant pendant une séance (plan UC9, B6).
// Ouvre un client STOMP à l'entrée de l'écran et le ferme à la sortie : en StrictMode, le premier client est fermé
// avant que le second s'ouvre, donc jamais de double abonnement.
// Réception seule : l'envoi de la réponse reste en REST (règle 4) ; le renvoi D14 est délégué à `surRenvoi`.
//
// Cycle :
// - chaque message reçu est converti par `convertirMessage` puis passé au reducer ;
// - coupure : CONNEXION_PERDUE (bandeau), la bibliothèque retente seule avec une attente croissante ;
// - (re)connexion : RECONNEXION (après une coupure), puis resynchronisation par REST et RESYNCHRONISEE ;
//   si une réponse attend son renvoi (D14) et qu'il reste du temps, `surRenvoi` est appelé à la place ;
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
  /** Vrai s'il reste du temps sur la question courante (D9). */
  resteDuTemps: () => boolean
  /** Lecture de l'état par REST après une (re)connexion, par exemple avec `lireEtat`. */
  resynchroniser: (signal: AbortSignal) => Promise<Resynchronisation>
  /** Renvoi du même corps après une coupure (D14). */
  surRenvoi: (corps: CorpsReponse) => void
  /** Fabrique du client ; `creerClientStomp` par défaut, un faux client pour les tests et les démos. */
  creerClient?: () => ClientTempsReel
}

export function useTempsReelSeance({
  codeAcces,
  jetonParticipant,
  etat,
  dispatch,
  resteDuTemps,
  resynchroniser,
  surRenvoi,
  creerClient = creerClientStomp,
}: OptionsTempsReelSeance): void {
  // Dernières valeurs des props, lues par les rappels du client sans le recréer.
  const courant = useRef({
    etat,
    dispatch,
    resteDuTemps,
    resynchroniser,
    surRenvoi,
    /** Dernière question confirmée (voir le TODO de `resynchroniserParRest`). */
    idConfirmee: null as number | null,
  })
  useEffect(() => {
    const { ecran } = etat
    const idConfirmee = ecran.nom === 'CONFIRMEE' && ecran.idQuestion !== null
      ? ecran.idQuestion
      : courant.current.idConfirmee
    courant.current = { etat, dispatch, resteDuTemps, resynchroniser, surRenvoi, idConfirmee }
  })

  useEffect(() => {
    const client = creerClient()
    const controleur = new AbortController()
    let arrete = false

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
      courant.current.resynchroniser(controleur.signal).then(
        ({ question, dejaRepondu }) => {
          // TODO(UC9): `dejaRepondu` pas encore fourni par GET .../etat (plan UC9, question B7). Valeur provisoire :
          // une question déjà confirmée sur cet appareil reste confirmée.
          const dejaConfirmee = question !== null && question.idQuestion === courant.current.idConfirmee
          emettre({ type: 'RESYNCHRONISEE', question, dejaRepondu: dejaRepondu || dejaConfirmee })
        },
        () => {
          // L'écran reste en CHARGEMENT jusqu'au prochain message (une nouvelle question en sort).
          if (!controleur.signal.aborted && estEnDeveloppement) {
            console.warn('[temps réel] resynchronisation par REST impossible')
          }
        },
      )
    }

    const destinations = destinationsSeance(codeAcces)
    for (const canal of Object.keys(destinations) as CanalSeance[]) {
      client.sAbonner(destinations[canal], (corps) => {
        const action = convertirMessage(canal, corps)
        if (action !== null) emettre(action)
      })
    }

    client.connecter({ 'X-Jeton-Participant': jetonParticipant }, {
      connecte(reconnexion) {
        if (reconnexion) {
          const { etat: { ecran }, resteDuTemps: tempsRestant, surRenvoi: renvoyer } = courant.current
          const resteDuTemps = tempsRestant()
          emettre({ type: 'RECONNEXION', resteDuTemps })
          if (ecran.nom === 'ENVOI' && ecran.renvoi && resteDuTemps) {
            renvoyer(ecran.corps)
            return
          }
        }
        resynchroniserParRest()
      },
      coupe() {
        emettre({ type: 'CONNEXION_PERDUE' })
      },
      refuse(message) {
        const action = convertirRefus(message)
        if (action !== null) emettre(action)
      },
    })

    return arreter
  }, [codeAcces, jetonParticipant, creerClient])
}
