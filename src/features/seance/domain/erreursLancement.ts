// Cas d'erreur du lancement (UC7, tableau « Cas d'erreur »). Messages affichés : ceux de la spécification.

/** Ce que le domaine lit d'une erreur HTTP, sans dépendre de `shared/http`. */
export interface RefusDuServeur {
  statut: number
  /** Message du back ; `null` si le corps n'est pas au format du back. */
  error: string | null
  code?: string
  request_id: string | null
}

export const MESSAGE_LANCEMENT_ECHOUE = 'Le lancement a échoué, réessayez.'

/** Repli quand le corps de l'erreur ne vient pas du back. */
const MESSAGES_PAR_STATUT: Record<number, string> = {
  403: 'Action non autorisée.',
  404: "Ce quiz n'existe pas ou a été supprimé.",
}

export type EchecLancement =
  /** 401 : retour à l'écran de connexion. */
  | { type: 'NON_CONNECTE' }
  /** 409 : la reprendre ou la terminer ? */
  | { type: 'SESSION_DEJA_OUVERTE', message: string }
  /** 409 : autoriser l'entrée en identité non vérifiée ? */
  | { type: 'ANNUAIRE_INDISPONIBLE', message: string }
  | { type: 'MESSAGE', message: string, requestId: string | null }

/** @param refus `null` si le serveur n'a pas répondu (panne réseau). */
export function echecLancement(refus: RefusDuServeur | null): EchecLancement {
  if (refus === null) return { type: 'MESSAGE', message: MESSAGE_LANCEMENT_ECHOUE, requestId: null }
  const { statut, error, code, request_id } = refus
  if (statut === 401) return { type: 'NON_CONNECTE' }
  if (statut === 409 && error !== null && (code === 'SESSION_DEJA_OUVERTE' || code === 'ANNUAIRE_INDISPONIBLE')) {
    return { type: code, message: error }
  }
  // 500 : le message du back est générique, la spécification impose celui du lancement.
  if (statut >= 500) return { type: 'MESSAGE', message: MESSAGE_LANCEMENT_ECHOUE, requestId: request_id }
  return { type: 'MESSAGE', message: error ?? MESSAGES_PAR_STATUT[statut] ?? MESSAGE_LANCEMENT_ECHOUE, requestId: null }
}
