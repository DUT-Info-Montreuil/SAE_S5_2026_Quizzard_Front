// Client temps réel réel, sur @stomp/stompjs en WebSocket natif (pas de SockJS), point d'entrée `/ws`.
// Reconnexion automatique de la bibliothèque, avec attente croissante et bornée (docs/ARCHITECTURE.md §7).
// La bibliothèque ne se réabonne pas seule après une reconnexion : les abonnements sont rejoués ici.
// `debug` est muet : les trames (dont le jeton de la trame CONNECT) ne vont jamais dans la console.

import { Client, ReconnectionTimeMode } from '@stomp/stompjs'
import type { StompSubscription } from '@stomp/stompjs'
import { urlWs } from '../config/config.ts'
import type { ClientTempsReel } from './ClientTempsReel.ts'

/** Première attente avant de retenter, doublée à chaque échec. */
const ATTENTE_INITIALE_MS = 1000
/** Attente maximale entre deux tentatives. */
const ATTENTE_MAX_MS = 30_000

export function creerClientStomp(url: string = urlWs): ClientTempsReel {
  const rappels = new Map<string, (corps: string) => void>()
  const actifs = new Map<string, StompSubscription>()
  let dejaConnecte = false

  const client = new Client({
    brokerURL: url,
    reconnectDelay: ATTENTE_INITIALE_MS,
    maxReconnectDelay: ATTENTE_MAX_MS,
    reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
    debug: () => {},
  })

  function abonner(destination: string, rappel: (corps: string) => void) {
    actifs.set(destination, client.subscribe(destination, (message) => rappel(message.body)))
  }

  return {
    connecter(enTetes, ecouteurs) {
      client.connectHeaders = enTetes
      client.onConnect = () => {
        actifs.clear()
        rappels.forEach((rappel, destination) => abonner(destination, rappel))
        const reconnexion = dejaConnecte
        dejaConnecte = true
        ecouteurs.connecte(reconnexion)
      }
      // `active` est faux après deconnecter() : une fermeture voulue n'est pas une coupure.
      client.onWebSocketClose = () => {
        if (client.active) ecouteurs.coupe()
      }
      client.onStompError = (trame) => ecouteurs.refuse(trame.headers.message ?? '')
      client.activate()
    },

    sAbonner(destination, rappel) {
      rappels.set(destination, rappel)
      if (client.connected) abonner(destination, rappel)
      return () => {
        rappels.delete(destination)
        if (client.connected) actifs.get(destination)?.unsubscribe()
        actifs.delete(destination)
      }
    },

    deconnecter() {
      rappels.clear()
      actifs.clear()
      void client.deactivate()
    },
  }
}
