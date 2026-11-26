import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { backSimule, erreurJson, etatJson, reponseJson } from '../../../test/fabriquesAnimation.ts'
import { BoutonLancerPresentation } from './BoutonLancerPresentation.tsx'

const LANCER = 'POST /api/quiz/3/sessions'
const DEJA = 'Une session est déjà ouverte pour le cours « Réseaux ». La reprendre ou la terminer ?'
const ANNUAIRE = "L'annuaire de l'IUT est indisponible. Autoriser l'entrée en identité non vérifiée ?"
const lancee = () => reponseJson({ idSession: 7 }, 201)

async function cliquerLancer() {
  const onSeance = vi.fn()
  const onNonConnecte = vi.fn()
  render(<BoutonLancerPresentation idQuiz={3} onSeance={onSeance} onNonConnecte={onNonConnecte} />)
  await userEvent.click(screen.getByRole('button', { name: 'Lancer la présentation' }))
  return { onSeance, onNonConnecte }
}

describe('Lancer la présentation', () => {
  it('lance le quiz et donne la séance créée', async () => {
    const corps: unknown[] = []
    backSimule((_, c) => {
      corps.push(c)
      return lancee()
    })
    const { onSeance } = await cliquerLancer()
    expect(onSeance).toHaveBeenCalledExactlyOnceWith(7)
    expect(corps).toEqual([{ autoriserIdentiteNonVerifiee: false }])
  })

  it('un double clic ne lance qu\'une fois', async () => {
    const requetes = backSimule(lancee)
    render(<BoutonLancerPresentation idQuiz={3} onSeance={() => {}} onNonConnecte={() => {}} />)
    await userEvent.dblClick(screen.getByRole('button'))
    expect(requetes).toEqual([LANCER])
  })

  it('désactivé, avec une alerte, si une question est incomplète', () => {
    render(<BoutonLancerPresentation idQuiz={3} quizPret={false} onSeance={() => {}} onNonConnecte={() => {}} />)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByText(/incomplète/)).toBeVisible()
  })

  it('401 : retour à la connexion', async () => {
    backSimule(() => erreurJson(401, 'Vous devez être connecté.'))
    expect((await cliquerLancer()).onNonConnecte).toHaveBeenCalledOnce()
  })

  it.each([
    [403, 'Action non autorisée.', undefined],
    [404, "Ce quiz n'existe pas ou a été supprimé.", undefined],
    [422, 'Le quiz contient une question incomplète (page 6). Complétez-la avant de lancer.', 'QUIZ_INCOMPLET'],
  ])('%i : message du back, sans quitter l\'éditeur', async (statut, message, code) => {
    backSimule(() => erreurJson(statut, message, code))
    const { onSeance } = await cliquerLancer()
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(onSeance).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Lancer la présentation' })).toBeEnabled()
  })

  it('500 : message du lancement et référence', async () => {
    backSimule(() => erreurJson(500, 'Une erreur est survenue. Réessayez dans un instant.'))
    await cliquerLancer()
    expect(await screen.findByRole('alert')).toHaveTextContent('Le lancement a échoué, réessayez.Référence : req-1')
  })

  it('serveur injoignable : message du lancement', async () => {
    backSimule(() => {
      throw new TypeError('Failed to fetch')
    })
    await cliquerLancer()
    expect(await screen.findByRole('alert')).toHaveTextContent('Le lancement a échoué, réessayez.')
  })

  it('session déjà ouverte : la reprendre', async () => {
    const requetes = backSimule((r) =>
      r === LANCER ? erreurJson(409, DEJA, 'SESSION_DEJA_OUVERTE') : reponseJson(etatJson({ idSession: 5 })))
    const { onSeance } = await cliquerLancer()
    expect(await screen.findByRole('alertdialog', { name: DEJA })).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'La reprendre' }))
    expect(onSeance).toHaveBeenCalledExactlyOnceWith(5)
    expect(requetes).toEqual([LANCER, 'GET /api/sessions/ouverte'])
  })

  it('session déjà ouverte : la terminer puis lancer', async () => {
    let terminee = false
    const requetes = backSimule((r) => {
      if (r === LANCER) return terminee ? lancee() : erreurJson(409, DEJA, 'SESSION_DEJA_OUVERTE')
      if (r.endsWith('/cloture')) terminee = true
      return reponseJson(etatJson({ idSession: 5 }))
    })
    const { onSeance } = await cliquerLancer()
    await userEvent.click(await screen.findByRole('button', { name: 'La terminer et lancer ce quiz' }))
    expect(onSeance).toHaveBeenCalledExactlyOnceWith(7)
    expect(requetes).toEqual([LANCER, 'GET /api/sessions/ouverte', 'POST /api/sessions/5/cloture', LANCER])
  })

  it('annuaire indisponible : autoriser relance avec l\'autorisation, annuler ne fait rien', async () => {
    const requetes = backSimule((_, corps) =>
      (corps as { autoriserIdentiteNonVerifiee: boolean }).autoriserIdentiteNonVerifiee
        ? lancee()
        : erreurJson(409, ANNUAIRE, 'ANNUAIRE_INDISPONIBLE'))
    const { onSeance } = await cliquerLancer()
    await userEvent.click(await screen.findByRole('button', { name: 'Annuler' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(requetes).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: 'Lancer la présentation' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Autoriser' }))
    expect(onSeance).toHaveBeenCalledExactlyOnceWith(7)
  })
})
