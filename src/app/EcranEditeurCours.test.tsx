// Assemblage de E3 (plan UC3, D5 et B5) : un 401 mène à l'écran de connexion avec le retour vers l'éditeur ;
// identifiant de cours invalide → « Cours introuvable. » sans appel au back. Faux `fetch`, aucun serveur.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { ApiEditeurCours } from '../features/cours/application/useEditeurCours.ts'
import type { Cours, PageInseree } from '../features/cours/domain/cours.ts'
import { fauxDocumentPdf, installerFauxNavigateur } from '../test/fauxNavigateur.ts'
import { EcranEditeurCours } from './EcranEditeurCours.tsx'
import { RouteEditeur } from './RouteEditeur.tsx'

function Connexion() {
  const { pathname, search } = useLocation()
  return <p>connexion : {pathname + search}</p>
}

describe('EcranEditeurCours', () => {
  it('401 au chargement → /connexion?retour=/cours/7/editeur', async () => {
    const faux = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ error: 'Non authentifié', request_id: 'r' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }))
    vi.stubGlobal('fetch', faux)
    render(
      <MemoryRouter initialEntries={['/cours/7/editeur']}>
        <Routes>
          <Route path="/cours/:idCours/editeur" element={<EcranEditeurCours idCours={7} />} />
          <Route path="/connexion" element={<Connexion />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText(`connexion : /connexion?retour=${encodeURIComponent('/cours/7/editeur')}`)).toBeInTheDocument()
    expect(new URL(String(faux.mock.calls[0][0])).pathname).toBe('/api/cours/7')
  })
})

describe('RouteEditeur', () => {
  it.each(['abc', '0', '-3', '1.5'])('identifiant %j : « Cours introuvable. », aucun appel au back', (id) => {
    const faux = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', faux)
    render(
      <MemoryRouter initialEntries={[`/cours/${id}/editeur`]}>
        <Routes>
          <Route path="/cours/:idCours/editeur" element={<RouteEditeur />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Cours introuvable.')
    expect(faux).not.toHaveBeenCalled()
  })
})

describe('EcranEditeurCours, élément 11 « Lancer la présentation » (UC7)', () => {
  function Seance() {
    const { pathname, state } = useLocation()
    return <p>séance : {pathname} depuis {(state as { retour: string }).retour}</p>
  }

  it('lance le quiz de la page sélectionnée puis ouvre E5', async () => {
    installerFauxNavigateur()
    const cours: Cours = { idCours: 7, titre: 'Réseaux', archive: false, version: { idVersion: 3, numero: 2, nbPages: 4 } }
    const pages: PageInseree[] = [
      { idPage: 1, numeroPage: 1, ordre: 0, type: 'QUIZ', titreQuiz: 'Quiz 1', idQuiz: 40 },
      { idPage: 2, numeroPage: 2, ordre: 0, type: 'QUIZ', titreQuiz: 'Quiz 2', idQuiz: 41 },
    ]
    const api: ApiEditeurCours = {
      lireCours: async () => cours,
      lirePagesInserees: async () => pages,
      lireQuizDuCours: async () => [{ idQuiz: 40, titre: 'Quiz 1' }, { idQuiz: 41, titre: 'Quiz 2' }],
      lireFichierPdf: async () => new ArrayBuffer(8),
      insererPageQuiz: vi.fn(),
      retirerPage: vi.fn(),
      deplacerPage: vi.fn(),
    }
    const faux = vi.fn<typeof fetch>(async (url) => new Response(
      String(url).endsWith('/api/auth/csrf') ? '{}' : JSON.stringify({ idSession: 9 }),
      { status: String(url).endsWith('/api/auth/csrf') ? 404 : 201, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', faux)
    render(
      <MemoryRouter initialEntries={['/cours/7/editeur']}>
        <Routes>
          <Route
            path="/cours/:idCours/editeur"
            element={<EcranEditeurCours idCours={7} options={{ api, ouvrirPdf: async () => fauxDocumentPdf(4) }} />}
          />
          <Route path="/seances/:idSession" element={<Seance />} />
        </Routes>
      </MemoryRouter>,
    )

    const liste = await screen.findByRole('combobox', { name: 'Quiz à lancer' })
    expect(liste).toHaveValue('40')
    // Sélection de la seconde page de quiz : plus de liste, c'est son quiz qui est lancé.
    await userEvent.click(screen.getAllByRole('button', { name: /Page de quiz/ })[1])
    expect(screen.queryByRole('combobox')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Lancer la présentation' }))

    expect(await screen.findByText('séance : /seances/9 depuis /cours/7/editeur')).toBeInTheDocument()
    const lancement = faux.mock.calls.find(([url]) => String(url).endsWith('/sessions'))
    expect(new URL(String(lancement?.[0])).pathname).toBe('/api/quiz/41/sessions')
  })
})
