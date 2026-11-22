// Appels au back pour l'UC9 « Répondre à une question » (plan UC9, bloc B3 ; docs/API.md du back §3.5).
// Tout passe par requete() de shared/http, jamais par fetch directement.

import { ErreurHttp } from '../../../shared/http/ErreurHttp.ts'
import { requete } from '../../../shared/http/clientHttp.ts'
import { ecartAvecServeur } from '../../../shared/lib/heureServeur.ts'
import type { CorpsReponse } from '../domain/corpsReponse.ts'

export type ResultatEnvoi =
  /** 201 : réponse enregistrée. `ecartMs` : écart avec le serveur relevé sur l'en-tête Date (`null` si illisible). */
  | { resultat: 'ACCEPTEE', ecartMs: number | null }
  /** Réponse HTTP en erreur : à passer telle quelle au reducer (`ENVOI_REFUSE`), qui la traduit par la table du domaine. */
  | { resultat: 'REFUSEE', erreur: ErreurHttp }
  /** Aucune réponse du serveur : la réponse a peut-être été enregistrée ; renvoyer le même corps (D14). */
  | { resultat: 'ECHEC_RESEAU' }

/**
 * Envoie la réponse de l'étudiant : `POST /api/public/sessions/{codeAcces}/reponses`.
 * Le corps vient de `corpsReponse()` du domaine. Le `201` contient `pointsProvisoires` : il est ignoré ici et ne
 * sort pas de cette fonction (D7).
 * Une annulation (`signal`) est relancée telle quelle : ce n'est pas une panne réseau.
 */
export async function envoyerReponse(
  codeAcces: string,
  jetonParticipant: string,
  corps: CorpsReponse,
  signal?: AbortSignal,
): Promise<ResultatEnvoi> {
  try {
    const { enTeteDate } = await requete<unknown>(
      `/api/public/sessions/${encodeURIComponent(codeAcces)}/reponses`,
      { methode: 'POST', corps, jetonParticipant, signal },
    )
    return { resultat: 'ACCEPTEE', ecartMs: ecartAvecServeur(enTeteDate) }
  } catch (erreur) {
    if (erreur instanceof ErreurHttp) return { resultat: 'REFUSEE', erreur }
    if (signal?.aborted) throw erreur
    return { resultat: 'ECHEC_RESEAU' }
  }
}

// TODO(UC9): forme de « état courant + score » inconnue (plan UC9, question B7 ; `dejaRepondu` et `heureServeur`
// demandés au back). Signatures seules, à implémenter quand le back aura fixé le format.
export type EtatSessionEtudiant = unknown

/** `GET /api/public/sessions/{codeAcces}/etat`. */
export type LireEtat = (codeAcces: string, jetonParticipant: string) => Promise<EtatSessionEtudiant>

/** `POST /api/public/sessions/{codeAcces}/reconnexion`. */
export type Reconnexion = (codeAcces: string, jetonParticipant: string) => Promise<EtatSessionEtudiant>
