// Appels au back pour l'UC8 « Rejoindre un quiz » (plan UC8, §3, bloc B2 ; docs/API.md du back).
// Tout passe par requete() de shared/http, jamais par fetch directement. Aucun jeton n'est envoyé.
// Le pseudonyme et le jeton ne sont jamais écrits dans un message d'erreur ni dans la console (D14).

import { ErreurHttp } from '../../../shared/http/ErreurHttp.ts'
import { requete } from '../../../shared/http/clientHttp.ts'
import type { SessionPublique } from '../domain/ecranRejoindre.ts'
import { nettoyerPseudonyme } from '../domain/pseudonyme.ts'

export type ResultatConsultation =
  | { resultat: 'OUVERTE', session: SessionPublique }
  /** Réponse HTTP en erreur : à passer telle quelle au reducer (`CHARGEMENT_REFUSE`). */
  | { resultat: 'REFUSEE', erreur: ErreurHttp }
  | { resultat: 'ECHEC_RESEAU' }

export type ResultatRejoindre =
  | { resultat: 'REJOINT', jeton: string }
  /** Réponse HTTP en erreur : à passer telle quelle au reducer (`ENVOI_REFUSE`). */
  | { resultat: 'REFUSEE', erreur: ErreurHttp }
  /** Aucune réponse : le participant a peut-être été créé (plan UC8, question U1). */
  | { resultat: 'ECHEC_RESEAU' }

const ETATS = ['PREPAREE', 'EN_COURS', 'CLOTUREE'] as const
type EtatSession = typeof ETATS[number]

const chemin = (codeAcces: string) => `/api/public/sessions/${encodeURIComponent(codeAcces)}`

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null
}

/** `{titreCours, titreQuiz, estNotee, etat}` vérifié champ par champ ; `null` s'il est mal formé. */
export function convertirSessionPublique(donnees: unknown): (SessionPublique & { etat: EtatSession }) | null {
  if (!estObjet(donnees)) return null
  const { titreCours, titreQuiz, estNotee, etat } = donnees
  if (typeof titreCours !== 'string' || typeof titreQuiz !== 'string' || typeof estNotee !== 'boolean') return null
  if (!ETATS.includes(etat as EtatSession)) return null
  return { titreCours, titreQuiz, estNotee, etat: etat as EtatSession }
}

/** Jeton du `201` : chaîne non vide ; `null` sinon. `idParticipant` et `pseudonyme` ne sont pas lus (D12). */
export function convertirParticipantRejoint(donnees: unknown): string | null {
  if (!estObjet(donnees)) return null
  return typeof donnees.jeton === 'string' && donnees.jeton !== '' ? donnees.jeton : null
}

/**
 * `GET /api/public/sessions/{codeAcces}` : quiz affiché par E7.
 * Un `etat` `CLOTUREE` dans un `200` est traité comme un `409` (séance close). Une annulation (`signal`) est relancée
 * telle quelle. Lève une `Error` si le corps est mal formé.
 */
export async function consulterSession(codeAcces: string, signal?: AbortSignal): Promise<ResultatConsultation> {
  let donnees: unknown
  try {
    donnees = (await requete<unknown>(chemin(codeAcces), { signal })).donnees
  } catch (erreur) {
    if (erreur instanceof ErreurHttp) return { resultat: 'REFUSEE', erreur }
    if (signal?.aborted) throw erreur
    return { resultat: 'ECHEC_RESEAU' }
  }
  const session = convertirSessionPublique(donnees)
  if (session === null) throw new Error('Quiz mal formé.')
  const { etat, ...publique } = session
  if (etat === 'CLOTUREE') return { resultat: 'REFUSEE', erreur: new ErreurHttp(409, null) }
  return { resultat: 'OUVERTE', session: publique }
}

/**
 * `POST /api/public/sessions/{codeAcces}/participants` avec `{pseudonyme}` nettoyé (D9).
 * Le `suggestion` d'un `409` est lu par `ErreurHttp`. Une annulation (`signal`) est relancée telle quelle.
 * Lève une `Error` si le `201` n'a pas de jeton.
 */
export async function rejoindreSession(
  codeAcces: string,
  pseudonyme: string,
  signal?: AbortSignal,
): Promise<ResultatRejoindre> {
  let donnees: unknown
  try {
    donnees = (await requete<unknown>(`${chemin(codeAcces)}/participants`, {
      methode: 'POST',
      corps: { pseudonyme: nettoyerPseudonyme(pseudonyme) },
      signal,
    })).donnees
  } catch (erreur) {
    if (erreur instanceof ErreurHttp) return { resultat: 'REFUSEE', erreur }
    if (signal?.aborted) throw erreur
    return { resultat: 'ECHEC_RESEAU' }
  }
  const jeton = convertirParticipantRejoint(donnees)
  if (jeton === null) throw new Error('Réponse d\'entrée dans le quiz mal formée.')
  return { resultat: 'REJOINT', jeton }
}
