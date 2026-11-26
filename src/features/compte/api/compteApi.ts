// Profil et déconnexion (docs/API.md du back, §3.1). TODO(UC1): routes documentées, pas encore écrites côté back.

import { requete } from '../../../shared/http/clientHttp.ts'
import { jetonCsrf, oublierJetonCsrf } from '../../../shared/http/csrf.ts'
import type { Profil } from '../domain/profil.ts'

export async function lireProfil(signal?: AbortSignal): Promise<Profil> {
  const { donnees } = await requete<unknown>('/api/auth/moi', { signal })
  const { nom, prenom } = (donnees ?? {}) as Record<string, unknown>
  if (typeof nom !== 'string' || typeof prenom !== 'string') throw new Error('Profil illisible')
  return { nom, prenom }
}

export async function deconnecter(): Promise<void> {
  await requete<unknown>('/api/auth/deconnexion', { methode: 'POST' })
  // Le jeton CSRF suit la session : on en redemande un.
  oublierJetonCsrf()
  await jetonCsrf()
}
