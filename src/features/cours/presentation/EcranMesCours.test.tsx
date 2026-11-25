import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { EcranMesCours } from './EcranMesCours.tsx'

const COURS = {
  idCours: 4, titre: 'Réseaux', numeroVersion: 1, nbPages: 12, nbQuiz: 0, dateModification: '2026-11-25T14:00:00',
}
const DOUBLON = 'Vous avez déjà importé ce PDF dans le cours « Réseaux ». Importer quand même ?'

const json = (corps: unknown, statut = 200) => Response.json(corps, { status: statut })
const erreur = (statut: number, error: string, plus: object = {}) =>
  json({ error, request_id: 'req-1', ...plus }, statut)

/** Back simulé : `liste` répond au GET, `importer` au POST. Renvoie les formulaires reçus. */
function back({ liste = () => json([]), importer = () => json(COURS, 201) }: {
  liste?: () => Response
  importer?: (corps: FormData) => Response
}) {
  const envois: FormData[] = []
  vi.stubGlobal('fetch', async (url: string, options: RequestInit) => {
    if (url.endsWith('/api/auth/csrf')) return erreur(404, 'Ressource introuvable.')
    expect(new URL(url).pathname).toBe('/api/cours')
    if (options.method === 'GET') return liste()
    expect(new Headers(options.headers).has('Content-Type')).toBe(false)
    const corps = options.body as FormData
    envois.push(corps)
    return importer(corps)
  })
  return envois
}

function afficher() {
  const onNonConnecte = vi.fn()
  render(<MemoryRouter><EcranMesCours onNonConnecte={onNonConnecte} /></MemoryRouter>)
  return onNonConnecte
}

const bouton = (name: string) => screen.getByRole('button', { name })

async function choisir(fichier = new File(['%PDF-1.7'], 'Réseaux.pdf', { type: 'application/pdf' })) {
  await userEvent.click(bouton('Importer un PDF'))
  await userEvent.setup({ applyAccept: false }).upload(screen.getByLabelText(/Fichier PDF/), fichier)
}

describe('liste des cours', () => {
  it('affiche les cours', async () => {
    back({ liste: () => json([COURS]) })
    afficher()
    expect(await screen.findByRole('rowheader', { name: 'Réseaux' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Ouvrir Réseaux' })).toHaveAttribute('href', '/cours/4')
  })

  it('état vide', async () => {
    back({})
    afficher()
    expect(await screen.findByText(/Aucun cours pour l'instant/)).toBeVisible()
  })

  it('401 : retour à la connexion', async () => {
    back({ liste: () => erreur(401, 'Vous devez être connecté.') })
    const onNonConnecte = afficher()
    await vi.waitFor(() => expect(onNonConnecte).toHaveBeenCalledOnce())
  })

  it('500 : message, puis réessayer', async () => {
    let panne = true
    back({ liste: () => (panne ? erreur(500, 'x') : json([COURS])) })
    afficher()
    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger vos cours')
    panne = false
    await userEvent.click(bouton('Réessayer'))
    expect(await screen.findByRole('rowheader', { name: 'Réseaux' })).toBeVisible()
  })

  it('liste absente du serveur (405) : l\'import reste possible', async () => {
    back({ liste: () => erreur(405, 'x') })
    afficher()
    expect(await screen.findByRole('alert')).toHaveTextContent('pas encore disponible')
    await choisir()
    await userEvent.click(bouton('Importer'))
    expect(await screen.findByRole('rowheader', { name: 'Réseaux' })).toBeVisible()
  })
})

describe('importer un PDF', () => {
  it('propose le titre, envoie le formulaire une fois et ajoute le cours', async () => {
    const envois = back({})
    afficher()
    await choisir()
    expect(screen.getByLabelText('Titre du cours')).toHaveValue('Réseaux')
    await userEvent.dblClick(bouton('Importer'))
    expect(await screen.findByText(/importé en version 1 \(12 pages\)/)).toBeVisible()
    expect(screen.getByRole('rowheader', { name: 'Réseaux' })).toBeVisible()
    expect(envois).toHaveLength(1)
    expect((envois[0].get('fichier') as File).name).toBe('Réseaux.pdf')
    expect(envois[0].get('titre')).toBe('Réseaux')
    expect(envois[0].get('confirmerDoublon')).toBe('false')
  })

  it('un titre saisi n\'est pas remplacé par un nouveau fichier', async () => {
    back({})
    afficher()
    await choisir()
    const titre = screen.getByLabelText('Titre du cours')
    await userEvent.clear(titre)
    await userEvent.type(titre, 'Mon titre')
    const autre = new File(['x'], 'autre.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText(/Fichier PDF/), autre)
    expect(titre).toHaveValue('Mon titre')
  })

  it('refuse sans appel un fichier qui n\'est pas un PDF', async () => {
    const envois = back({})
    afficher()
    await choisir(new File(['x'], 'cours.docx'))
    await userEvent.click(bouton('Importer'))
    expect(screen.getByText("Le fichier n'est pas un PDF.")).toBeVisible()
    expect(envois).toHaveLength(0)
  })

  it('doublon : confirmer renvoie le même fichier', async () => {
    const envois = back({
      importer: (c) => (c.get('confirmerDoublon') === 'true'
        ? json(COURS, 201)
        : erreur(409, DOUBLON, { code: 'DOUBLON_COURS' })),
    })
    afficher()
    await choisir()
    await userEvent.click(bouton('Importer'))
    expect(await screen.findByRole('alertdialog', { name: DOUBLON })).toBeVisible()
    await userEvent.click(bouton('Ne pas importer'))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await userEvent.click(bouton('Importer'))
    await userEvent.click(await screen.findByRole('button', { name: 'Importer quand même' }))
    expect(await screen.findByText(/importé en version 1/)).toBeVisible()
    expect(envois.map((e) => e.get('confirmerDoublon'))).toEqual(['false', 'false', 'true'])
    expect((envois[2].get('fichier') as File).name).toBe('Réseaux.pdf')
  })

  it.each([
    [413, 'Le fichier envoyé est trop volumineux.', {}, /Fichier PDF/],
    [415, "Le fichier n'est pas un PDF.", { code: 'FICHIER_NON_PDF' }, /Fichier PDF/],
    [422, 'PDF illisible.', { code: 'PDF_ILLISIBLE', champs: { fichier: 'PDF illisible.' } }, /Fichier PDF/],
    [422, 'Titre refusé.', { code: 'TITRE_INVALIDE', champs: { titre: 'Titre refusé.' } }, 'Titre du cours'],
  ])('%i %s : sous le champ concerné', async (statut, message, plus, champ) => {
    back({ importer: () => erreur(statut, message, plus) })
    afficher()
    await choisir()
    await userEvent.click(bouton('Importer'))
    expect(await screen.findByText(message)).toBeVisible()
    expect(screen.getByLabelText(champ)).toHaveAccessibleDescription(message)
  })

  it('500 : message de l\'import et référence', async () => {
    back({ importer: () => erreur(500, 'x') })
    afficher()
    await choisir()
    await userEvent.click(bouton('Importer'))
    expect(await screen.findByText("L'import a échoué, réessayez.")).toBeVisible()
    expect(screen.getByText('Référence : req-1')).toBeVisible()
  })

  it('serveur injoignable : message de l\'import', async () => {
    back({
      importer: () => {
        throw new TypeError('Failed to fetch')
      },
    })
    afficher()
    await choisir()
    await userEvent.click(bouton('Importer'))
    expect(await screen.findByText("L'import a échoué, réessayez.")).toBeVisible()
  })

  it('401 : retour à la connexion', async () => {
    back({ importer: () => erreur(401, 'Vous devez être connecté.') })
    const onNonConnecte = afficher()
    await choisir()
    await userEvent.click(bouton('Importer'))
    await vi.waitFor(() => expect(onNonConnecte).toHaveBeenCalledOnce())
  })
})
