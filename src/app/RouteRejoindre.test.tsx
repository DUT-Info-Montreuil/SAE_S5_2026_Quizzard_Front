// Parcours E7 → E8 assemblé (plan UC8, B4 ; D3, D12, D13 ; critères d'acceptation §9). Faux `fetch`, faux client
// STOMP (module remplacé), routeur en mémoire avec les vraies routes de E7 et de E8/E9.
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { enregistrerJeton, lireJeton } from '../features/seance/application/jetonParticipant.ts'
import { creerClientFactice } from '../shared/tempsReel/ClientTempsReelFactice.ts'
import type { EvenementFactice } from '../shared/tempsReel/ClientTempsReelFactice.ts'
import { RouteQuestion } from './RouteQuestion.tsx'
import { RouteRejoindre } from './RouteRejoindre.tsx'

const scenarioStomp: { evenements: EvenementFactice[] } = { evenements: [] }
vi.mock('../shared/tempsReel/clientStomp.ts', () => ({
  creerClientStomp: () => creerClientFactice(scenarioStomp.evenements),
}))

const CODE = 'AB12'
const SESSION = { titreCours: 'Réseaux', titreQuiz: 'Quiz 1', estNotee: false, etat: 'EN_COURS' }

const json = (corps: unknown, statut: number) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { 'Content-Type': 'application/json', Date: new Date().toUTCString() },
  })

/** Faux back : quiz, entrée (201 après un court délai) et état de la séance (aucune question). */
function fauxBack(session: unknown = SESSION) {
  const faux = vi.fn<typeof fetch>(async (url, options) => {
    const chemin = String(url)
    if (chemin.endsWith('/participants')) {
      await new Promise((fin) => setTimeout(fin, 50))
      return json({ idParticipant: 7, jeton: 'jeton-secret', pseudonyme: 'Alice' }, 201)
    }
    if (chemin.endsWith('/etat')) return json({ question: null }, 200)
    if (options?.method === 'GET') return json(session, 200)
    return json({ error: 'inattendu', request_id: 'r' }, 500)
  })
  vi.stubGlobal('fetch', faux)
  return faux
}

const appels = (faux: ReturnType<typeof fauxBack>, fin: string) => faux.mock.calls.filter(([url]) => String(url).endsWith(fin))

function monter(entrees: string[]) {
  const routeur = createMemoryRouter([
    { path: '/rejoindre/:codeAcces', Component: RouteRejoindre },
    { path: '/rejoindre/:codeAcces/question', Component: RouteQuestion },
    { path: '*', element: <p>Ailleurs</p> },
  ], { initialEntries: entrees, initialIndex: entrees.length - 1 })
  render(<StrictMode><RouterProvider router={routeur} /></StrictMode>)
  return routeur
}

const champ = () => screen.findByRole('textbox', { name: 'Pseudonyme' })
const bouton = () => screen.getByRole('button', { name: 'Entrer dans le quiz' })

describe('route /rejoindre/:codeAcces', () => {
  it('jeton déjà présent : E8 directement, sans consulter le quiz ni créer de participant', async () => {
    scenarioStomp.evenements = []
    enregistrerJeton(CODE, 'jeton-existant')
    const faux = fauxBack()
    const routeur = monter([`/rejoindre/${CODE}`])

    expect(routeur.state.location.pathname).toBe(`/rejoindre/${CODE}/question`)
    await screen.findByText(/prochaine question/i)
    expect(appels(faux, `/sessions/${CODE}`)).toHaveLength(0)
    expect(appels(faux, '/participants')).toHaveLength(0)
  })

  it('pseudonyme invalide : message, aucune requête d\'entrée', async () => {
    const faux = fauxBack()
    monter([`/rejoindre/${CODE}`])
    await userEvent.type(await champ(), ' a {Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Ton pseudonyme doit faire de 2 à 20 caractères.')
    expect(appels(faux, '/participants')).toHaveLength(0)
  })

  it('quiz noté : message, sans formulaire', async () => {
    fauxBack({ ...SESSION, estNotee: true })
    monter([`/rejoindre/${CODE}`])
    expect(await screen.findByRole('alert')).toHaveTextContent('Ce quiz est noté : connecte-toi avec ton compte IUT.')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('succès : un seul POST malgré double clic et Entrée, jeton gardé, E8, Retour ne revient pas sur E7', async () => {
    scenarioStomp.evenements = []
    const faux = fauxBack()
    const routeur = monter(['/avant', `/rejoindre/${CODE}`])
    const saisie = await champ()
    await userEvent.type(saisie, '  Alice  ')
    await userEvent.dblClick(bouton())
    await userEvent.type(saisie, '{Enter}{Enter}')

    await screen.findByText(/prochaine question/i)
    expect(appels(faux, '/participants')).toHaveLength(1)
    expect(JSON.parse(String(appels(faux, '/participants')[0][1]?.body))).toStrictEqual({ pseudonyme: 'Alice' })
    expect(lireJeton(CODE)).toBe('jeton-secret')
    expect(routeur.state.location.pathname).toBe(`/rejoindre/${CODE}/question`)

    await act(() => routeur.navigate(-1))
    expect(routeur.state.location.pathname).toBe('/avant')
  })

  it('jeton refusé sur E8 (JETON_INVALIDE) : jeton supprimé, « Rejoindre » ramène au formulaire E7', async () => {
    scenarioStomp.evenements = [{ delaiMs: 0, type: 'refus', message: 'JETON_INVALIDE' }]
    enregistrerJeton(CODE, 'jeton-perime')
    fauxBack()
    const routeur = monter([`/rejoindre/${CODE}/question`])

    await userEvent.click(await screen.findByRole('button', { name: 'Rejoindre' }))
    expect(lireJeton(CODE)).toBeNull()
    expect(await champ()).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe(`/rejoindre/${CODE}`)
  })

  it('succès : le jeton est déjà enregistré au moment de la navigation vers E8', async () => {
    scenarioStomp.evenements = []
    fauxBack()
    const routeur = monter([`/rejoindre/${CODE}`])
    const jetonsALaNavigation: (string | null)[] = []
    const desabonner = routeur.subscribe((etat) => {
      if (etat.location.pathname.endsWith('/question')) jetonsALaNavigation.push(lireJeton(CODE))
    })
    await userEvent.type(await champ(), 'Alice{Enter}')
    await screen.findByText(/prochaine question/i)
    desabonner()
    expect(jetonsALaNavigation.length).toBeGreaterThan(0)
    expect(jetonsALaNavigation.every((jeton) => jeton === 'jeton-secret')).toBe(true)
  })

  it('pseudonyme pris : proposition choisie en un clic, puis entrée et E8', async () => {
    scenarioStomp.evenements = []
    const faux = fauxBack()
    let essais = 0
    faux.mockImplementation(async (url, options) => {
      const chemin = String(url)
      if (chemin.endsWith('/participants')) {
        essais += 1
        return essais === 1
          ? json({ error: 'Pris.', request_id: 'r', code: 'PSEUDONYME_DEJA_PRIS', suggestion: 'Alice2' }, 409)
          : json({ idParticipant: 7, jeton: 'jeton-secret', pseudonyme: 'Alice2' }, 201)
      }
      if (chemin.endsWith('/etat')) return json({ question: null }, 200)
      if (options?.method === 'GET') return json(SESSION, 200)
      return json({ error: 'inattendu', request_id: 'r' }, 500)
    })
    monter([`/rejoindre/${CODE}`])
    await userEvent.type(await champ(), 'Alice{Enter}')
    await userEvent.click(await screen.findByRole('button', { name: 'Alice2' }))
    await userEvent.click(bouton())

    await screen.findByText(/prochaine question/i)
    const corps = appels(faux, '/participants').map(([, options]) => JSON.parse(String(options?.body)))
    expect(corps).toStrictEqual([{ pseudonyme: 'Alice' }, { pseudonyme: 'Alice2' }])
  })

  it('rien dans la console (ni pseudonyme ni jeton)', async () => {
    scenarioStomp.evenements = []
    const espions = (['log', 'info', 'warn', 'error', 'debug'] as const).map((nom) => vi.spyOn(console, nom))
    fauxBack()
    monter([`/rejoindre/${CODE}`])
    await userEvent.type(await champ(), 'Alice{Enter}')
    await screen.findByText(/prochaine question/i)
    for (const espion of espions) {
      for (const appel of espion.mock.calls) expect(JSON.stringify(appel)).not.toMatch(/Alice|jeton-secret/)
    }
  })
})
