import { beforeEach, describe, expect, it, vi } from 'vitest'

// Le jeton est gardé dans le module : chaque test repart d'un module neuf.
let requete: typeof import('./clientHttp.ts').requete
let envois: { chemin: string, jeton: string | null }[]
let jetons: string[]

beforeEach(async () => {
  vi.resetModules()
  requete = (await import('./clientHttp.ts')).requete
  envois = []
  jetons = ['ancien', 'nouveau']
  vi.stubGlobal('fetch', (url: string, options: RequestInit) => {
    const chemin = new URL(url).pathname
    if (chemin === '/api/auth/csrf') {
      const token = jetons.shift()
      return Promise.resolve(token === undefined ? new Response('', { status: 404 }) : Response.json({ token }))
    }
    const jeton = new Headers(options.headers).get('X-XSRF-TOKEN')
    envois.push({ chemin, jeton })
    return Promise.resolve(new Response('{}', { status: chemin === '/api/refus' && jeton !== 'nouveau' ? 403 : 200 }))
  })
})

describe('jeton CSRF', () => {
  it('part sur une requête qui modifie, pas sur une lecture ni une route publique', async () => {
    await requete('/api/a', { methode: 'POST' })
    await requete('/api/b')
    await requete('/api/public/c', { methode: 'POST' })
    expect(envois.map((e) => e.jeton)).toEqual(['ancien', null, null])
  })

  it('est renouvelé une fois après un 403', async () => {
    await requete('/api/refus', { methode: 'POST' })
    expect(envois.map((e) => e.jeton)).toEqual(['ancien', 'nouveau'])
  })

  it('403 sans jeton disponible : erreur, sans nouvel essai', async () => {
    jetons = []
    await expect(requete('/api/refus', { methode: 'POST' })).rejects.toMatchObject({ statut: 403 })
    expect(envois).toHaveLength(1)
  })
})
