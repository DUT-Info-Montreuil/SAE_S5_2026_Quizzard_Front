// API de l'éditeur E3 (plan UC3, B3 et §3). Faux `fetch`, aucun serveur.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErreurHttp } from '../../../shared/http/ErreurHttp.ts'
import { oublierJetonCsrf } from '../../../shared/http/csrf.ts'
import {
  deplacerPage,
  insererPageQuiz,
  lireCours,
  lireFichierPdf,
  lirePagesInserees,
  lireQuizDuCours,
  retirerPage,
} from './coursApi.ts'
import type { DemandeInsertion } from './coursApi.ts'

const json = (corps: unknown, statut = 200) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json' } })

/** Faux fetch : jeton CSRF puis `reponse()` pour toute autre adresse. */
function fauxFetch(reponse: () => Response | Promise<Response>) {
  const faux = vi.fn<typeof fetch>(async (url) =>
    String(url).endsWith('/api/auth/csrf') ? json({ token: 'jeton' }) : reponse(),
  )
  vi.stubGlobal('fetch', faux)
  return faux
}

/** Dernier appel hors CSRF : chemin, méthode et corps JSON. */
function dernierAppel(faux: ReturnType<typeof fauxFetch>) {
  const [url, init] = faux.mock.calls[faux.mock.calls.length - 1]
  return {
    chemin: new URL(String(url)).pathname,
    methode: init?.method,
    credentials: init?.credentials,
    corps: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
  }
}

const PAGES = [{ idPage: 7, numeroPage: 2, ordre: 0, type: 'QUIZ', titreQuiz: 'Quiz 1' }, { idPage: 8, numeroPage: 4, ordre: 0, type: 'CLASSEMENT', titreQuiz: null }]

const REPONSE_201 = {
  idPage: 9,
  idQuiz: 3,
  titreQuiz: 'Quiz 1',
  quizCree: true,
  idQuestion: 21,
  numeroPage: 4,
  ordre: 1,
  pages: [...PAGES, { idPage: 9, numeroPage: 4, ordre: 1, type: 'QUIZ', titreQuiz: 'Quiz 1' }],
}

beforeEach(() => oublierJetonCsrf())

describe('lireCours', () => {
  it('lit la réponse du back (dernière version à plat, archive absent = non archivé)', async () => {
    const faux = fauxFetch(() => json({
      idCours: 1,
      titre: 'Algorithmique',
      idVersion: 12,
      numeroVersion: 3,
      nbPages: 12,
      nbQuiz: 0,
      dateModification: '2026-11-25T10:00:00',
    }))
    await expect(lireCours(1)).resolves.toEqual({
      idCours: 1,
      titre: 'Algorithmique',
      archive: false,
      version: { idVersion: 12, numero: 3, nbPages: 12 },
    })
    expect(dernierAppel(faux)).toMatchObject({ chemin: '/api/cours/1', methode: 'GET', credentials: 'include' })
  })

  it('archive vrai → cours archivé', async () => {
    fauxFetch(() => json({ idCours: 1, titre: 'A', idVersion: 1, numeroVersion: 1, nbPages: 1, archive: true }))
    await expect(lireCours(1)).resolves.toMatchObject({ archive: true })
  })

  it.each([
    ['sans version', { idCours: 1, titre: 'A', nbPages: 1 }],
    ['archive mal formé', { idCours: 1, titre: 'A', idVersion: 1, numeroVersion: 1, nbPages: 1, archive: 'non' }],
    ['version mal formée', { idCours: 1, titre: 'A', idVersion: '1', numeroVersion: 1, nbPages: 1 }],
    ['pas un objet', [1, 2]],
  ])('%s → Error', async (_cas, corps) => {
    fauxFetch(() => json(corps))
    await expect(lireCours(1)).rejects.toThrow('Réponse mal formée')
  })

  it('404 → ErreurHttp levée telle quelle', async () => {
    fauxFetch(() => json({ error: 'Cours introuvable.', request_id: 'r1', code: 'COURS_INTROUVABLE' }, 404))
    await expect(lireCours(1)).rejects.toMatchObject({ statut: 404, code: 'COURS_INTROUVABLE' })
  })
})

describe('lirePagesInserees, lireQuizDuCours', () => {
  it('pages : chemin de la version, liste convertie', async () => {
    const faux = fauxFetch(() => json(PAGES))
    await expect(lirePagesInserees(1, 12)).resolves.toEqual(PAGES)
    expect(dernierAppel(faux).chemin).toBe('/api/cours/1/versions/12/pages')
  })

  it('pages : type inconnu → Error', async () => {
    fauxFetch(() => json([{ idPage: 7, numeroPage: 2, ordre: 0, type: 'IMAGE' }]))
    await expect(lirePagesInserees(1, 12)).rejects.toThrow('Réponse mal formée')
  })

  it('quiz : déduits des pages de la version, sans doublon ni page de classement', async () => {
    const faux = fauxFetch(() => json([
      { idPage: 7, numeroPage: 2, ordre: 0, type: 'QUIZ', idQuestion: 20, idQuiz: 3, titreQuiz: 'Quiz 1' },
      { idPage: 8, numeroPage: 4, ordre: 0, type: 'QUIZ', idQuestion: 21, idQuiz: 3, titreQuiz: 'Quiz 1' },
      { idPage: 9, numeroPage: 5, ordre: 0, type: 'CLASSEMENT', idQuestion: null, idQuiz: null, titreQuiz: null },
      { idPage: 10, numeroPage: 6, ordre: 0, type: 'QUIZ', idQuestion: 22, idQuiz: 4, titreQuiz: 'Quiz 2' },
    ]))
    await expect(lireQuizDuCours(1, 12)).resolves.toEqual([{ idQuiz: 3, titre: 'Quiz 1' }, { idQuiz: 4, titre: 'Quiz 2' }])
    expect(dernierAppel(faux).chemin).toBe('/api/cours/1/versions/12/pages')
  })

  it('quiz : titre absent → Error', async () => {
    fauxFetch(() => json([{ idPage: 7, numeroPage: 2, ordre: 0, type: 'QUIZ', idQuiz: 3 }]))
    await expect(lireQuizDuCours(1, 12)).rejects.toThrow('Réponse mal formée')
  })
})

describe('lireFichierPdf', () => {
  it('ArrayBuffer du fichier de la version, avec les cookies', async () => {
    const faux = fauxFetch(() => new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46])))
    const octets = await lireFichierPdf(1, 12)
    expect(new Uint8Array(octets)).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
    expect(dernierAppel(faux)).toMatchObject({ chemin: '/api/cours/1/versions/12/fichier', credentials: 'include' })
  })
})

describe('insererPageQuiz : corps', () => {
  const demande: DemandeInsertion = {
    idVersion: 12,
    emplacement: { numeroPage: 4, ordre: 1 },
    idQuiz: 3,
    repereTexte: 'fin de la page 4',
  }

  it('quiz existant et repère : tous les champs', async () => {
    const faux = fauxFetch(() => json(REPONSE_201, 201))
    await insererPageQuiz(1, demande)
    expect(dernierAppel(faux)).toEqual({
      chemin: '/api/cours/1/pages-quiz',
      methode: 'POST',
      credentials: 'include',
      corps: { idVersion: 12, numeroPage: 4, ordre: 1, idQuiz: 3, repereTexte: 'fin de la page 4' },
    })
  })

  it.each([undefined, ''])('nouveau quiz, repère %j : ni idQuiz ni repereTexte (clés absentes)', async (repereTexte) => {
    const faux = fauxFetch(() => json(REPONSE_201, 201))
    await insererPageQuiz(1, { ...demande, idQuiz: null, repereTexte })
    const { corps } = dernierAppel(faux)
    expect(corps).toEqual({ idVersion: 12, numeroPage: 4, ordre: 1 })
    expect(Object.keys(corps)).not.toContain('idQuiz')
  })
  it('aucun idEnseignant : lu dans la session par le back, jamais dans la requête (contrat UC3)', async () => {
    const faux = fauxFetch(() => json(REPONSE_201, 201))
    await insererPageQuiz(1, demande)
    const cles = Object.keys(dernierAppel(faux).corps)
    expect(cles).not.toContain('idEnseignant')
    expect(cles.every((cle) => ['idVersion', 'numeroPage', 'ordre', 'idQuiz', 'repereTexte'].includes(cle))).toBe(true)
  })
})

describe('insererPageQuiz : résultat', () => {
  const demande: DemandeInsertion = { idVersion: 12, emplacement: { numeroPage: 4, ordre: 1 }, idQuiz: null, repereTexte: undefined }

  it('201 → REUSSIE avec la réponse convertie', async () => {
    fauxFetch(() => json(REPONSE_201, 201))
    await expect(insererPageQuiz(1, demande)).resolves.toEqual({ resultat: 'REUSSIE', reponse: REPONSE_201 })
  })

  it('erreur HTTP → REFUSEE avec l\'ErreurHttp', async () => {
    fauxFetch(() => json({ error: 'x', request_id: 'r', code: 'VERSION_PERIMEE' }, 409))
    const resultat = await insererPageQuiz(1, demande)
    expect(resultat).toMatchObject({ resultat: 'REFUSEE', erreur: { statut: 409, code: 'VERSION_PERIMEE' } })
    if (resultat.resultat === 'REFUSEE') expect(resultat.erreur).toBeInstanceOf(ErreurHttp)
  })

  it('pas de réponse du serveur → ECHEC_RESEAU, une seule requête', async () => {
    const faux = fauxFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    await expect(insererPageQuiz(1, demande)).resolves.toEqual({ resultat: 'ECHEC_RESEAU' })
    expect(faux.mock.calls.filter(([url]) => String(url).endsWith('/pages-quiz'))).toHaveLength(1)
  })

  it('201 mal formé → ECHEC_RESEAU (relire avant de réessayer)', async () => {
    fauxFetch(() => json({ ...REPONSE_201, pages: undefined }, 201))
    await expect(insererPageQuiz(1, demande)).resolves.toEqual({ resultat: 'ECHEC_RESEAU' })
  })

  it('annulation : relancée telle quelle', async () => {
    const controleur = new AbortController()
    fauxFetch(() => {
      controleur.abort()
      return Promise.reject(new DOMException('Annulé', 'AbortError'))
    })
    await expect(insererPageQuiz(1, demande, controleur.signal)).rejects.toThrow('Annulé')
  })
})

describe('retirerPage, deplacerPage', () => {
  it('retrait : DELETE /api/pages/{idPage}, 204 → REUSSIE sans pages', async () => {
    const faux = fauxFetch(() => new Response(null, { status: 204 }))
    await expect(retirerPage(9)).resolves.toEqual({ resultat: 'REUSSIE', pages: null })
    expect(dernierAppel(faux)).toMatchObject({ chemin: '/api/pages/9', methode: 'DELETE', corps: undefined })
  })

  it('déplacement : PATCH /api/pages/{idPage} {numeroPage, ordre}, 200 → pages converties', async () => {
    const faux = fauxFetch(() => json(PAGES))
    await expect(deplacerPage(7, { numeroPage: 4, ordre: 1 })).resolves.toEqual({ resultat: 'REUSSIE', pages: PAGES })
    expect(dernierAppel(faux)).toMatchObject({ chemin: '/api/pages/7', methode: 'PATCH', corps: { numeroPage: 4, ordre: 1 } })
  })

  it('PAGE_INTROUVABLE → REFUSEE ; pas de réponse ou 200 mal formé → ECHEC_RESEAU', async () => {
    fauxFetch(() => json({ error: 'Page introuvable.', request_id: 'r', code: 'PAGE_INTROUVABLE' }, 404))
    await expect(retirerPage(9)).resolves.toMatchObject({ resultat: 'REFUSEE', erreur: { statut: 404, code: 'PAGE_INTROUVABLE' } })
    fauxFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    await expect(retirerPage(9)).resolves.toEqual({ resultat: 'ECHEC_RESEAU' })
    fauxFetch(() => json({ pages: 'non' }))
    await expect(deplacerPage(7, { numeroPage: 4, ordre: 1 })).resolves.toEqual({ resultat: 'ECHEC_RESEAU' })
  })
})
