// Jeton CSRF de la session de l'enseignant (docs/API.md §3), demandé à la première requête qui modifie puis gardé.
// Le jeton n'est jamais écrit dans la console.
// TODO(UC1): GET /api/auth/csrf n'existe pas encore côté back et la forme de son corps n'est pas fixée (docs/API.md,
// point A3). Valeur provisoire : `{token}`, la forme par défaut de Spring Security. Sans jeton (route absente, back
// avec SECURITE_OUVERTE=true), les requêtes partent sans l'en-tête.

import { urlApi } from '../config/config.ts'

let enCache: Promise<string | null> | undefined

async function demander(): Promise<string | null> {
  try {
    const reponse = await fetch(`${urlApi}/api/auth/csrf`, { credentials: 'include' })
    if (!reponse.ok) return null
    const corps: unknown = await reponse.json()
    const jeton = (corps as { token?: unknown } | null)?.token
    return typeof jeton === 'string' ? jeton : null
  } catch {
    return null
  }
}

/** @param renouveler vrai pour oublier le jeton gardé (refusé par le serveur). */
export function lireJetonCsrf(renouveler = false): Promise<string | null> {
  if (renouveler) enCache = undefined
  enCache ??= demander()
  return enCache
}
