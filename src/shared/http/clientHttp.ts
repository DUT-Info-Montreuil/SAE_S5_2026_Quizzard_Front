// Client HTTP commun : toutes les features appellent le back par requete(), jamais par fetch directement.
// - cookies envoyés (credentials: 'include') pour la session de l'enseignant ;
// - en-tête X-Jeton-Participant quand un jeton d'étudiant est fourni ;
// - toute réponse non 2xx devient une ErreurHttp (statut, error, request_id, champs, code).
// Une panne réseau (aucune réponse du serveur) garde l'erreur d'origine de fetch :
// « l'erreur n'est pas une ErreurHttp » veut donc dire « le serveur n'a pas répondu ».
// Le jeton n'est jamais écrit dans un message d'erreur ni dans la console.

import { urlApi } from '../config/config.ts'
import { ErreurHttp, lireCorpsErreur } from './ErreurHttp.ts'

export type MethodeHttp = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface OptionsRequete {
  /** `GET` par défaut. */
  methode?: MethodeHttp
  /** Objet envoyé en JSON. */
  corps?: unknown
  /** Jeton de participant (routes /api/public/**), envoyé dans l'en-tête X-Jeton-Participant. */
  jetonParticipant?: string
  /** Pour annuler la requête (AbortController). */
  signal?: AbortSignal
}

export interface ReponseHttp<T> {
  /** Corps JSON de la réponse ; `null` si elle n'a pas de corps (204). */
  donnees: T | null
  /** En-tête Date (heure du serveur) ; `null` s'il est illisible, par exemple non exposé par CORS. */
  enTeteDate: string | null
}

// shortcut: JSON seulement ; ajouter une variante quand un écran enverra un fichier ou lira un PDF, une image ou un CSV.
export async function requete<T>(
  chemin: string,
  { methode = 'GET', corps, jetonParticipant, signal }: OptionsRequete = {},
): Promise<ReponseHttp<T>> {
  const enTetes = new Headers({ Accept: 'application/json' })
  if (corps !== undefined) enTetes.set('Content-Type', 'application/json')
  if (jetonParticipant !== undefined) enTetes.set('X-Jeton-Participant', jetonParticipant)
  // TODO(UC9): en-tête X-XSRF-TOKEN sur POST, PUT, PATCH, DELETE (CLAUDE.md, règle 2). Forme de GET /api/auth/csrf
  // inconnue (docs/API.md, point A3) et exclusion de /api/public/** à confirmer (plan UC9, question B8).

  const reponse = await fetch(urlApi + chemin, {
    method: methode,
    headers: enTetes,
    credentials: 'include',
    body: corps === undefined ? undefined : JSON.stringify(corps),
    signal,
  })

  if (!reponse.ok) {
    throw new ErreurHttp(reponse.status, await lireCorpsErreur(reponse))
  }

  const texte = await reponse.text()
  return {
    donnees: texte === '' ? null : (JSON.parse(texte) as T),
    enTeteDate: reponse.headers.get('Date'),
  }
}
