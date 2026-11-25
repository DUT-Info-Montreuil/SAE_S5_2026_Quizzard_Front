// Client HTTP commun : CSRF des routes enseignant et variante binaire (plan UC3, D4, D6 ; CLAUDE.md, règle 2).
// Faux `fetch` qui répond selon l'adresse, aucun serveur.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requete, requeteBinaire } from './clientHttp.ts'
import { oublierJetonCsrf } from './csrf.ts'
import { ErreurHttp } from './ErreurHttp.ts'

const json = (corps: unknown, statut = 200) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json' } })

/** `routes` : réponse par fin d'adresse ; une liste est consommée dans l'ordre. */
function fauxFetch(routes: Record<string, (() => Response) | (() => Response)[]>) {
  const faux = vi.fn<typeof fetch>(async (url) => {
    const cle = Object.keys(routes).find((fin) => String(url).endsWith(fin))
    if (cle === undefined) throw new Error(`Route non prévue : ${String(url)}`)
    const route = routes[cle]
    const reponse = Array.isArray(route) ? route.shift() : route
    if (reponse === undefined) throw new Error(`Plus de réponse pour ${cle}`)
    return reponse()
  })
  vi.stubGlobal('fetch', faux)
  return faux
}

const adresses = (faux: ReturnType<typeof fauxFetch>) => faux.mock.calls.map(([url]) => new URL(String(url)).pathname)
const enTeteCsrf = (faux: ReturnType<typeof fauxFetch>, appel: number) =>
  new Headers(faux.mock.calls[appel][1]?.headers).get('X-XSRF-TOKEN')

beforeEach(() => oublierJetonCsrf())

describe('requete : CSRF', () => {
  it('GET : aucun appel à /api/auth/csrf, aucun en-tête', async () => {
    const faux = fauxFetch({ '/api/cours/1': () => json({}) })
    await requete('/api/cours/1')

    expect(adresses(faux)).toEqual(['/api/cours/1'])
    expect(enTeteCsrf(faux, 0)).toBeNull()
  })

  it('POST enseignant : jeton demandé une fois, envoyé dans X-XSRF-TOKEN, réutilisé ensuite', async () => {
    const faux = fauxFetch({
      '/api/auth/csrf': () => json({ token: 'jeton-a' }),
      '/pages-quiz': () => json({}, 201),
    })
    await requete('/api/cours/1/pages-quiz', { methode: 'POST', corps: {} })
    await requete('/api/cours/1/pages-quiz', { methode: 'POST', corps: {} })

    expect(adresses(faux)).toEqual(['/api/auth/csrf', '/api/cours/1/pages-quiz', '/api/cours/1/pages-quiz'])
    expect(faux.mock.calls[0][1]?.credentials).toBe('include')
    expect(enTeteCsrf(faux, 1)).toBe('jeton-a')
    expect(enTeteCsrf(faux, 2)).toBe('jeton-a')
  })

  it.each(['PUT', 'PATCH', 'DELETE'] as const)('%s enseignant : en-tête X-XSRF-TOKEN', async (methode) => {
    const faux = fauxFetch({ '/api/auth/csrf': () => json({ token: 'j' }), '/api/cours/1': () => json({}) })
    await requete('/api/cours/1', { methode })
    expect(enTeteCsrf(faux, 1)).toBe('j')
  })

  it('POST /api/public/** : aucun appel CSRF ni en-tête (UC8, UC9)', async () => {
    const faux = fauxFetch({ '/reponses': () => json({}, 201) })
    await requete('/api/public/sessions/AB12/reponses', { methode: 'POST', corps: {}, jetonParticipant: 'jp' })

    expect(adresses(faux)).toEqual(['/api/public/sessions/AB12/reponses'])
    expect(enTeteCsrf(faux, 0)).toBeNull()
  })

  it('route CSRF absente : envoi sans en-tête', async () => {
    const faux = fauxFetch({
      '/api/auth/csrf': () => json({ error: 'Introuvable', request_id: null }, 404),
      '/pages-quiz': () => json({}, 201),
    })
    await requete('/api/cours/1/pages-quiz', { methode: 'POST', corps: {} })
    expect(enTeteCsrf(faux, 1)).toBeNull()
  })

  it('403 : nouveau jeton puis un seul rejeu, qui réussit', async () => {
    const faux = fauxFetch({
      '/api/auth/csrf': [() => json({ token: 'ancien' }), () => json({ token: 'nouveau' })],
      '/pages-quiz': [() => json({ error: 'Interdit', request_id: 'r' }, 403), () => json({ idPage: 9 }, 201)],
    })
    const { donnees } = await requete('/api/cours/1/pages-quiz', { methode: 'POST', corps: { ordre: 0 } })

    expect(donnees).toEqual({ idPage: 9 })
    expect(adresses(faux)).toEqual(['/api/auth/csrf', '/api/cours/1/pages-quiz', '/api/auth/csrf', '/api/cours/1/pages-quiz'])
    expect(enTeteCsrf(faux, 3)).toBe('nouveau')
    expect(faux.mock.calls[3][1]?.body).toBe('{"ordre":0}')
  })

  it('403 deux fois : ErreurHttp 403, pas de second rejeu', async () => {
    const interdit = () => json({ error: 'Action non autorisée.', request_id: 'r' }, 403)
    const faux = fauxFetch({ '/api/auth/csrf': () => json({ token: 'j' }), '/pages-quiz': [interdit, interdit] })

    await expect(requete('/api/cours/1/pages-quiz', { methode: 'POST' })).rejects.toMatchObject({ statut: 403 })
    expect(faux).toHaveBeenCalledTimes(4)
  })

  it('403 sur GET ou sur /api/public/** : aucun rejeu', async () => {
    const faux = fauxFetch({ '/x': () => json({ error: 'Interdit', request_id: null }, 403) })
    await expect(requete('/api/cours/x')).rejects.toBeInstanceOf(ErreurHttp)
    await expect(requete('/api/public/x', { methode: 'POST' })).rejects.toBeInstanceOf(ErreurHttp)
    expect(adresses(faux)).toEqual(['/api/cours/x', '/api/public/x'])
  })
  it('401 sur un POST enseignant : ErreurHttp 401, ni rejeu ni nouveau jeton (redirection par l\'écran, D5)', async () => {
    const faux = fauxFetch({
      '/api/auth/csrf': () => json({ token: 'j' }),
      '/pages-quiz': () => json({ error: 'Non authentifié', request_id: 'r' }, 401),
    })
    await expect(requete('/api/cours/1/pages-quiz', { methode: 'POST', corps: {} })).rejects.toMatchObject({ statut: 401 })
    expect(adresses(faux)).toEqual(['/api/auth/csrf', '/api/cours/1/pages-quiz'])
  })
})

describe('requeteBinaire', () => {
  it('renvoie les octets de la réponse', async () => {
    fauxFetch({ '/fichier': () => new Response(new Uint8Array([37, 80, 68, 70]), { status: 200 }) })
    const octets = await requeteBinaire('/api/cours/1/versions/2/fichier')
    expect([...new Uint8Array(octets)]).toEqual([37, 80, 68, 70])
  })

  it('erreur : même ErreurHttp que requete()', async () => {
    fauxFetch({ '/fichier': () => json({ error: 'Cours introuvable.', request_id: 'r', code: 'COURS_INTROUVABLE' }, 404) })
    await expect(requeteBinaire('/api/cours/1/versions/2/fichier')).rejects.toMatchObject({
      statut: 404,
      code: 'COURS_INTROUVABLE',
      request_id: 'r',
    })
  })
})
