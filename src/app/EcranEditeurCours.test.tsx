// Assemblage de E3 (plan UC3, D5 et B5) : un 401 mène à l'écran de connexion avec le retour vers l'éditeur ;
// identifiant de cours invalide → « Cours introuvable. » sans appel au back. Faux `fetch`, aucun serveur.
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
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
