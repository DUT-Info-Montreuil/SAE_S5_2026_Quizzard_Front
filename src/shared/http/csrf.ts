// Jeton CSRF des routes enseignant (plan UC3, D4 ; docs/API.md §3).
// Demandé une seule fois par GET /api/auth/csrf, gardé en mémoire, puis relu après un 403 (oublierJetonCsrf).
// Si la route échoue (absente, back en SECURITE_OUVERTE), le jeton vaut null : la requête part sans en-tête.
// Le jeton n'est jamais écrit dans la console ni dans un message d'erreur.

import { urlApi } from '../config/config.ts'

let jetonEnCours: Promise<string | null> | null = null

/** Jeton CSRF à envoyer dans X-XSRF-TOKEN ; `null` si le back n'en donne pas. */
export function jetonCsrf(): Promise<string | null> {
  jetonEnCours ??= demanderJeton()
  return jetonEnCours
}

/** Oublie le jeton : le prochain appel à `jetonCsrf()` le redemande au back. */
export function oublierJetonCsrf(): void {
  jetonEnCours = null
}

async function demanderJeton(): Promise<string | null> {
  try {
    const reponse = await fetch(urlApi + '/api/auth/csrf', {
      headers: { Accept: 'application/json' },
      credentials: 'include',
    })
    if (!reponse.ok) return null
    return lireJetonCsrf(await reponse.json())
  } catch {
    return null
  }
}

// TODO(UC3): forme du corps de GET /api/auth/csrf non confirmée par le back (docs/API.md A3, plan UC3 Q4).
// Valeur provisoire : champ `token`. Seul endroit à changer quand le back la fixera.
function lireJetonCsrf(corps: unknown): string | null {
  if (typeof corps !== 'object' || corps === null) return null
  const { token } = corps as Record<string, unknown>
  return typeof token === 'string' && token !== '' ? token : null
}
