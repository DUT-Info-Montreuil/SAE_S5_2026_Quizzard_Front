// Client HTTP commun : toutes les features appellent le back par requete() ou requeteBinaire(), jamais par fetch
// directement.
// - cookies envoyés (credentials: 'include') pour la session de l'enseignant ;
// - en-tête X-Jeton-Participant quand un jeton d'étudiant est fourni ;
// - en-tête X-XSRF-TOKEN sur POST, PUT, PATCH, DELETE hors /api/public/** (csrf.ts), avec un seul rejeu après un 403 ;
// - toute réponse non 2xx devient une ErreurHttp (statut, error, request_id, champs, code).
// Une panne réseau (aucune réponse du serveur) garde l'erreur d'origine de fetch :
// « l'erreur n'est pas une ErreurHttp » veut donc dire « le serveur n'a pas répondu ».
// Les jetons ne sont jamais écrits dans un message d'erreur ni dans la console.

import { urlApi } from '../config/config.ts'
import { jetonCsrf, oublierJetonCsrf } from './csrf.ts'
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

export async function requete<T>(chemin: string, options: OptionsRequete = {}): Promise<ReponseHttp<T>> {
  const reponse = await envoyer(chemin, options, 'application/json')
  const texte = await reponse.text()
  return {
    donnees: texte === '' ? null : (JSON.parse(texte) as T),
    enTeteDate: reponse.headers.get('Date'),
  }
}

/** Même requête que `requete()`, mais le corps de la réponse est lu en binaire (PDF, image, CSV). */
export async function requeteBinaire(chemin: string, options: OptionsRequete = {}): Promise<ArrayBuffer> {
  const reponse = await envoyer(chemin, options, '*/*')
  return reponse.arrayBuffer()
}

const METHODES_MODIFIANTES: readonly MethodeHttp[] = ['POST', 'PUT', 'PATCH', 'DELETE']

async function envoyer(chemin: string, options: OptionsRequete, accept: string): Promise<Response> {
  // Les routes /api/public/** ignorent le CSRF côté back : ni appel à /api/auth/csrf ni en-tête (UC8, UC9).
  const avecCsrf =
    METHODES_MODIFIANTES.includes(options.methode ?? 'GET') && !chemin.startsWith('/api/public/')

  let reponse = await envoyerUneFois(chemin, options, accept, avecCsrf ? await jetonCsrf() : null)
  if (avecCsrf && reponse.status === 403) {
    // Jeton absent ou expiré : un nouveau jeton, puis un seul rejeu (docs/API.md §2). Un 403 ne crée rien.
    oublierJetonCsrf()
    reponse = await envoyerUneFois(chemin, options, accept, await jetonCsrf())
  }

  if (!reponse.ok) {
    throw new ErreurHttp(reponse.status, await lireCorpsErreur(reponse))
  }
  return reponse
}

function envoyerUneFois(
  chemin: string,
  { methode = 'GET', corps, jetonParticipant, signal }: OptionsRequete,
  accept: string,
  jeton: string | null,
): Promise<Response> {
  const enTetes = new Headers({ Accept: accept })
  if (corps !== undefined) enTetes.set('Content-Type', 'application/json')
  if (jetonParticipant !== undefined) enTetes.set('X-Jeton-Participant', jetonParticipant)
  if (jeton !== null) enTetes.set('X-XSRF-TOKEN', jeton)

  return fetch(urlApi + chemin, {
    method: methode,
    headers: enTetes,
    credentials: 'include',
    body: corps === undefined ? undefined : JSON.stringify(corps),
    signal,
  })
}
