// Consultation du quiz et entrée dans le quiz : plan UC8, §3, D9 et D14. Faux `fetch`, aucun serveur.
import { describe, expect, it, vi } from 'vitest'
import { ErreurHttp } from '../../../shared/http/ErreurHttp.ts'
import { consulterSession, rejoindreSession } from './rejoindreApi.ts'

function fauxFetch(reponse: () => Response | Promise<Response>) {
  const faux = vi.fn<typeof fetch>(async () => reponse())
  vi.stubGlobal('fetch', faux)
  return faux
}

const json = (corps: unknown, statut: number) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json' } })

const SESSION = { titreCours: 'Réseaux', titreQuiz: 'Quiz 1', estNotee: false, etat: 'EN_COURS' }

describe('consulterSession', () => {
  it('GET /api/public/sessions/{codeAcces}, code encodé, sans jeton', async () => {
    const faux = fauxFetch(() => json(SESSION, 200))
    await consulterSession('a b/c')

    const [url, options] = faux.mock.calls[0]
    expect(String(url)).toMatch(/\/api\/public\/sessions\/a%20b%2Fc$/)
    expect(options?.method).toBe('GET')
    expect(new Headers(options?.headers).has('X-Jeton-Participant')).toBe(false)
  })

  it('200 : OUVERTE avec titres et estNotee', async () => {
    fauxFetch(() => json(SESSION, 200))
    expect(await consulterSession('AB12')).toEqual({
      resultat: 'OUVERTE', session: { titreCours: 'Réseaux', titreQuiz: 'Quiz 1', estNotee: false },
    })
  })

  it('200 avec etat CLOTUREE : traité comme un 409', async () => {
    fauxFetch(() => json({ ...SESSION, etat: 'CLOTUREE' }, 200))
    const resultat = await consulterSession('AB12')
    expect(resultat.resultat).toBe('REFUSEE')
    if (resultat.resultat === 'REFUSEE') expect(resultat.erreur.statut).toBe(409)
  })

  it.each([
    ['titre manquant', { ...SESSION, titreQuiz: undefined }],
    ['estNotee non booléen', { ...SESSION, estNotee: 'non' }],
    ['etat inconnu', { ...SESSION, etat: 'AUTRE' }],
    ['corps nul', null],
  ])('corps mal formé (%s) : Error', async (_cas, corps) => {
    fauxFetch(() => json(corps, 200))
    await expect(consulterSession('AB12')).rejects.toThrow(Error)
  })

  it('404 : REFUSEE avec le statut', async () => {
    fauxFetch(() => json({ error: 'Inconnu', request_id: 'r' }, 404))
    const resultat = await consulterSession('AB12')
    expect(resultat.resultat).toBe('REFUSEE')
    if (resultat.resultat === 'REFUSEE') expect(resultat.erreur).toMatchObject({ statut: 404 })
  })

  it('aucune réponse : ECHEC_RESEAU', async () => {
    fauxFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    expect(await consulterSession('AB12')).toEqual({ resultat: 'ECHEC_RESEAU' })
  })

  it('annulation : relancée', async () => {
    const controleur = new AbortController()
    fauxFetch(() => {
      controleur.abort()
      return Promise.reject(new DOMException('Annulé', 'AbortError'))
    })
    await expect(consulterSession('AB12', controleur.signal)).rejects.toThrow('Annulé')
  })
})

describe('rejoindreSession', () => {
  it('POST …/participants avec le pseudonyme nettoyé, sans jeton', async () => {
    const faux = fauxFetch(() => json({ idParticipant: 1, jeton: 'jeton-secret', pseudonyme: 'René Dupont' }, 201))
    await rejoindreSession('AB/12', '  René   Dupont ')

    const [url, options] = faux.mock.calls[0]
    expect(String(url)).toMatch(/\/api\/public\/sessions\/AB%2F12\/participants$/)
    expect(options?.method).toBe('POST')
    expect(new Headers(options?.headers).has('X-Jeton-Participant')).toBe(false)
    expect(JSON.parse(String(options?.body))).toStrictEqual({ pseudonyme: 'René Dupont' })
  })

  it('201 : REJOINT avec le jeton seulement', async () => {
    fauxFetch(() => json({ idParticipant: 1, jeton: 'jeton-secret', pseudonyme: 'Alice' }, 201))
    expect(await rejoindreSession('AB12', 'Alice')).toEqual({ resultat: 'REJOINT', jeton: 'jeton-secret' })
  })

  it.each([
    ['sans jeton', { idParticipant: 1, pseudonyme: 'Alice' }],
    ['jeton vide', { idParticipant: 1, jeton: '', pseudonyme: 'Alice' }],
  ])('201 %s : Error, sans pseudonyme dans le message', async (_cas, corps) => {
    fauxFetch(() => json(corps, 201))
    const erreur = await rejoindreSession('AB12', 'Alice').catch((e: unknown) => e)
    expect(erreur).toBeInstanceOf(Error)
    expect(String((erreur as Error).message)).not.toContain('Alice')
  })

  it('409 : suggestion lue dans le corps, jamais dans le message', async () => {
    fauxFetch(() => json({
      error: 'Ce pseudonyme est déjà pris.', request_id: 'r', code: 'PSEUDONYME_DEJA_PRIS', suggestion: 'Alice2',
    }, 409))
    const resultat = await rejoindreSession('AB12', 'Alice')

    expect(resultat.resultat).toBe('REFUSEE')
    if (resultat.resultat !== 'REFUSEE') return
    expect(resultat.erreur).toBeInstanceOf(ErreurHttp)
    expect(resultat.erreur).toMatchObject({ statut: 409, code: 'PSEUDONYME_DEJA_PRIS', suggestion: 'Alice2' })
    expect(resultat.erreur.message).not.toContain('Alice2')
  })

  it('suggestion qui n\'est pas une chaîne : ignorée', async () => {
    fauxFetch(() => json({ error: 'x', request_id: 'r', suggestion: 42 }, 409))
    const resultat = await rejoindreSession('AB12', 'Alice')
    if (resultat.resultat === 'REFUSEE') expect(resultat.erreur.suggestion).toBeUndefined()
  })

  it('aucune réponse : ECHEC_RESEAU', async () => {
    fauxFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    expect(await rejoindreSession('AB12', 'Alice')).toEqual({ resultat: 'ECHEC_RESEAU' })
  })
})
