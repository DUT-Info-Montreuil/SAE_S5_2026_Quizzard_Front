import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { EnteteCours } from './EnteteCours.tsx'

const COURS = {
  idCours: 4, titre: 'Réseaux', idVersion: 9, numeroVersion: 2, nbPages: 12, nbQuiz: 3,
  dateModification: '2026-11-25T14:00:00',
}

const json = (corps: unknown, statut = 200) => Response.json(corps, { status: statut })
const erreur = (statut: number, error: string, plus: object = {}) =>
  json({ error, request_id: 'req-1', ...plus }, statut)

/** Back simulé pour `GET /api/cours/{idCours}`. Renvoie les chemins appelés. */
function back(repondre: () => Response) {
  const chemins: string[] = []
  vi.stubGlobal('fetch', async (url: string, options: RequestInit) => {
    expect(options.method ?? 'GET').toBe('GET')
    chemins.push(new URL(url).pathname)
    return repondre()
  })
  return chemins
}

function afficher(idCours: string | undefined) {
  const onNonConnecte = vi.fn()
  const contenu = vi.fn(() => <p>Éditeur</p>)
  render(
    <MemoryRouter>
      <EnteteCours idCours={idCours} onNonConnecte={onNonConnecte}>{contenu}</EnteteCours>
    </MemoryRouter>,
  )
  return { onNonConnecte, contenu }
}

describe('ouvrir un cours', () => {
  it('affiche le titre et la dernière version, puis le contenu avec idVersion', async () => {
    const chemins = back(() => json(COURS))
    const { contenu } = afficher('4')
    expect(await screen.findByRole('heading', { name: 'Réseaux' })).toBeVisible()
    expect(screen.getByText('v2 · 12 pages · 3 quiz')).toBeVisible()
    expect(screen.getByText('Éditeur')).toBeVisible()
    expect(contenu).toHaveBeenLastCalledWith(expect.objectContaining({ idVersion: 9 }))
    expect(chemins).toEqual(['/api/cours/4'])
  })

  it('identifiant illisible : introuvable sans appel', () => {
    const chemins = back(() => json(COURS))
    afficher('abc')
    expect(screen.getByRole('alert')).toHaveTextContent("n'existe pas")
    expect(chemins).toHaveLength(0)
  })

  it('404 COURS_INTROUVABLE : introuvable', async () => {
    back(() => erreur(404, 'Cours introuvable.', { code: 'COURS_INTROUVABLE' }))
    afficher('42')
    expect(await screen.findByRole('alert')).toHaveTextContent("n'existe pas")
  })

  it('réponse sans idVersion : échec, puis réessayer', async () => {
    let incomplet = true
    back(() => json(incomplet ? { ...COURS, idVersion: undefined } : COURS))
    afficher('4')
    expect(await screen.findByRole('alert')).toHaveTextContent("Impossible d'ouvrir ce cours")
    incomplet = false
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(await screen.findByRole('heading', { name: 'Réseaux' })).toBeVisible()
  })

  it('500 : message et référence', async () => {
    back(() => erreur(500, 'x'))
    afficher('4')
    expect(await screen.findByText('Référence : req-1')).toBeVisible()
  })

  it('401 : retour à la connexion', async () => {
    back(() => erreur(401, 'Vous devez être connecté.'))
    const { onNonConnecte } = afficher('4')
    await vi.waitFor(() => expect(onNonConnecte).toHaveBeenCalledOnce())
  })
})
