// Interface du client temps réel (plan UC9, B6) : réception seule, le front n'envoie rien par STOMP (règle 4).
// Deux implémentations : `creerClientStomp` (clientStomp.ts) et `creerClientFactice` (ClientTempsReelFactice.ts).

export interface EcouteursConnexion {
  /** Connexion établie ; `reconnexion` est vrai après une coupure. Les abonnements sont déjà rétablis. */
  connecte: (reconnexion: boolean) => void
  /** Connexion coupée ; le client retente seul la connexion. */
  coupe: () => void
  /** Trame ERROR du serveur, avec son en-tête `message` (chaîne vide s'il manque). */
  refuse: (message: string) => void
}

export interface ClientTempsReel {
  /** Ouvre la connexion ; `enTetes` part dans la trame CONNECT. À appeler une seule fois. */
  connecter: (enTetes: Record<string, string>, ecouteurs: EcouteursConnexion) => void
  /**
   * S'abonne à une destination, maintenant ou dès la connexion, et à nouveau après chaque reconnexion.
   * `rappel` reçoit le corps brut du message. Renvoie la fonction de désabonnement.
   */
  sAbonner: (destination: string, rappel: (corps: string) => void) => () => void
  /** Désabonne tout et ferme la connexion, sans reconnexion. */
  deconnecter: () => void
}
