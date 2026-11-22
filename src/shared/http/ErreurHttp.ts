// Erreur levée par le client HTTP pour toute réponse dont le statut n'est pas 2xx.
// Les champs reprennent le format d'erreur du back (docs/API.md §2) :
// { "error": "…", "request_id": "…", "champs": { "titre": "…" }, "code": "…" }

/** Corps d'erreur du back, une fois vérifié. */
export interface CorpsErreur {
  error: string
  request_id: string | null
  champs?: Record<string, string>
  /** Code métier de l'erreur (exemple : `DEJA_REPONDU`). Demandé au back, pas encore envoyé. */
  code?: string
}

export class ErreurHttp extends Error {
  /** Statut HTTP (401, 409, 422, 500…). */
  readonly statut: number
  /**
   * Message du back, en français et sans donnée personnelle : il peut s'afficher tel quel.
   * `null` si le corps n'est pas au format du back (panne du reverse proxy, réponse vide…) :
   * l'écran affiche alors son propre message.
   */
  readonly error: string | null
  /** Identifiant de la requête, à transmettre à l'équipe pour un incident. */
  readonly request_id: string | null
  /** Erreurs de validation (422) : un message par champ du formulaire. */
  readonly champs: Record<string, string> | undefined
  /** Code métier, s'il est fourni par le back. */
  readonly code: string | undefined

  constructor(statut: number, corps: CorpsErreur | null) {
    super(corps?.error ?? `Erreur HTTP ${statut}`)
    this.name = 'ErreurHttp'
    this.statut = statut
    this.error = corps?.error ?? null
    this.request_id = corps?.request_id ?? null
    this.champs = corps?.champs
    this.code = corps?.code
  }
}

/** Lit le corps d'une réponse en erreur ; `null` s'il n'est pas au format du back. */
export async function lireCorpsErreur(reponse: Response): Promise<CorpsErreur | null> {
  let corps: unknown
  try {
    corps = await reponse.json()
  } catch {
    return null
  }
  if (typeof corps !== 'object' || corps === null) return null
  const { error, request_id, champs, code } = corps as Record<string, unknown>
  if (typeof error !== 'string') return null
  return {
    error,
    request_id: typeof request_id === 'string' ? request_id : null,
    champs: estDictionnaireDeTextes(champs) ? champs : undefined,
    code: typeof code === 'string' ? code : undefined,
  }
}

function estDictionnaireDeTextes(valeur: unknown): valeur is Record<string, string> {
  return (
    typeof valeur === 'object' &&
    valeur !== null &&
    Object.values(valeur).every((texte) => typeof texte === 'string')
  )
}
