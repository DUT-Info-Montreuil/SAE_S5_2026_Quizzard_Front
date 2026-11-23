// Envoi de la réponse et lecture de l'état par REST : plan UC9, D1, D14, D16 ; CLAUDE.md, règle 2.
// Faux client HTTP : `fetch` remplacé, aucun serveur.
import { describe, expect, it, vi } from 'vitest'
import { ErreurHttp } from '../../../shared/http/ErreurHttp.ts'
import { envoyerReponse, lireEtat } from './reponsesApi.ts'

const DATE_SERVEUR = 'Mon, 23 Nov 2026 10:00:10 GMT'

function fauxFetch(reponse: () => Response | Promise<Response>) {
  const faux = vi.fn<typeof fetch>(async () => reponse())
  vi.stubGlobal('fetch', faux)
  return faux
}

const json = (corps: unknown, statut: number, enTetes: Record<string, string> = {}) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json', ...enTetes } })

describe('envoyerReponse', () => {
  const corps = { idQuestion: 1, idPropositions: [12] }

  it('POST /api/public/sessions/{codeAcces}/reponses, jeton dans X-Jeton-Participant, corps JSON inchangé', async () => {
    const faux = fauxFetch(() => json({ idQuestion: 1, horodatageServeur: '2026-11-23T10:00:05Z' }, 201))
    await envoyerReponse('AB12', 'jeton-secret', corps)

    expect(faux).toHaveBeenCalledTimes(1)
    const [url, options] = faux.mock.calls[0]
    expect(String(url)).toMatch(/\/api\/public\/sessions\/AB12\/reponses$/)
    expect(options?.method).toBe('POST')
    expect(new Headers(options?.headers).get('X-Jeton-Participant')).toBe('jeton-secret')
    expect(JSON.parse(String(options?.body))).toStrictEqual(corps)
  })

  it('201 : ACCEPTEE avec l\'écart, et rien d\'autre (pointsProvisoires jamais exposé)', async () => {
    fauxFetch(() => json({ idQuestion: 1, horodatageServeur: '2026-11-23T10:00:05Z', pointsProvisoires: 875 }, 201, {
      Date: DATE_SERVEUR,
    }))
    const resultat = await envoyerReponse('AB12', 'jeton', corps)

    expect(Object.keys(resultat).sort()).toEqual(['ecartMs', 'resultat'])
    expect(resultat.resultat).toBe('ACCEPTEE')
    expect(JSON.stringify(resultat)).not.toContain('pointsProvisoires')
  })

  it('201 sans en-tête Date : écart null', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    fauxFetch(() => json({ idQuestion: 1, horodatageServeur: 'x' }, 201))
    expect(await envoyerReponse('AB12', 'jeton', corps)).toEqual({ resultat: 'ACCEPTEE', ecartMs: null })
  })

  it('réponse en erreur : REFUSEE avec le statut et le code du back', async () => {
    fauxFetch(() => json({ error: 'Trop tard', request_id: 'r1', code: 'HORS_DELAI' }, 409))
    const resultat = await envoyerReponse('AB12', 'jeton', corps)

    expect(resultat.resultat).toBe('REFUSEE')
    if (resultat.resultat !== 'REFUSEE') return
    expect(resultat.erreur).toBeInstanceOf(ErreurHttp)
    expect(resultat.erreur).toMatchObject({ statut: 409, code: 'HORS_DELAI' })
  })

  it('aucune réponse du serveur : ECHEC_RESEAU', async () => {
    fauxFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    expect(await envoyerReponse('AB12', 'jeton', corps)).toEqual({ resultat: 'ECHEC_RESEAU' })
  })
})

describe('lireEtat', () => {
  it('GET /api/public/sessions/{codeAcces}/etat avec le jeton, sans corps', async () => {
    const faux = fauxFetch(() => json({ question: null }, 200, { Date: DATE_SERVEUR }))
    const etat = await lireEtat('AB12', 'jeton-secret')

    const [url, options] = faux.mock.calls[0]
    expect(String(url)).toMatch(/\/api\/public\/sessions\/AB12\/etat$/)
    expect(options?.method).toBe('GET')
    expect(options?.body).toBeUndefined()
    expect(new Headers(options?.headers).get('X-Jeton-Participant')).toBe('jeton-secret')
    expect(etat.question).toBeNull()
    expect(etat.dejaRepondu).toBe(false)
    expect(etat.ecartMs).not.toBeNull()
  })
})
