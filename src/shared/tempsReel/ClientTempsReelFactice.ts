// Faux client temps réel (plan UC9, B6), pour les tests et les démos : même interface que `creerClientStomp`,
// sans réseau. Il rejoue un scénario d'événements, chacun après `delaiMs` millisecondes depuis le précédent.

import type { ClientTempsReel } from './ClientTempsReel.ts'

export type EvenementFactice =
  | { delaiMs: number, type: 'message', destination: string, corps: string }
  | { delaiMs: number, type: 'coupure' }
  | { delaiMs: number, type: 'reconnexion' }
  | { delaiMs: number, type: 'refus', message: string }

/** Délai avant la première connexion. */
const DELAI_CONNEXION_MS = 100

export function creerClientFactice(scenario: readonly EvenementFactice[]): ClientTempsReel {
  const rappels = new Map<string, (corps: string) => void>()
  let minuteur: ReturnType<typeof setTimeout> | undefined
  let connecte = false

  return {
    connecter(_enTetes, ecouteurs) {
      function jouer(indice: number) {
        const evenement = scenario[indice]
        if (evenement === undefined) return
        minuteur = setTimeout(() => {
          switch (evenement.type) {
            case 'message':
              // Comme un broker : un message n'arrive qu'aux abonnés connectés à cet instant.
              if (connecte) rappels.get(evenement.destination)?.(evenement.corps)
              break
            case 'coupure':
              connecte = false
              ecouteurs.coupe()
              break
            case 'reconnexion':
              connecte = true
              ecouteurs.connecte(true)
              break
            case 'refus':
              ecouteurs.refuse(evenement.message)
              break
          }
          jouer(indice + 1)
        }, evenement.delaiMs)
      }

      minuteur = setTimeout(() => {
        connecte = true
        ecouteurs.connecte(false)
        jouer(0)
      }, DELAI_CONNEXION_MS)
    },

    sAbonner(destination, rappel) {
      rappels.set(destination, rappel)
      return () => {
        rappels.delete(destination)
      }
    },

    deconnecter() {
      clearTimeout(minuteur)
      rappels.clear()
      connecte = false
    },
  }
}
