// E7 assemblé avec le hook et une fausse API (plan UC8, B5 ; UC8, E7-1 à E7-5 et cas d'erreur ; plan D5, D10, D11,
// D13, D15). Aucun serveur.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErreurHttp } from '../../../shared/http/ErreurHttp.ts'
import type { ResultatConsultation, ResultatRejoindre } from '../api/rejoindreApi.ts'
import type { ApiRejoindre } from '../application/useRejoindreQuiz.ts'
import { MENTION_INFORMATION } from './mentionInformation.ts'
import { PageRejoindre } from './PageRejoindre.tsx'

const SESSION = { titreCours: 'CM 1 Programmation avancée', titreQuiz: 'Quiz 1', estNotee: false }

function fausseApi(
  consultation: ResultatConsultation = { resultat: 'OUVERTE', session: SESSION },
  entrees: ResultatRejoindre[] = [{ resultat: 'REJOINT', jeton: 'jeton-secret' }],
) {
  let appel = 0
  return {
    consulterSession: vi.fn<ApiRejoindre['consulterSession']>(async () => consultation),
    rejoindreSession: vi.fn<ApiRejoindre['rejoindreSession']>(async () => entrees[Math.min(appel++, entrees.length - 1)]),
  }
}

function afficher(api: ApiRejoindre, onRejoint = vi.fn()) {
  render(<PageRejoindre codeAcces="AB12" onRejoint={onRejoint} api={api} />)
  return onRejoint
}

const champ = () => screen.findByRole('textbox', { name: 'Pseudonyme' })
const bouton = () => screen.getByRole('button', { name: 'Entrer dans le quiz' })

describe('E7 assemblé', () => {
  it('formulaire : titres, champ, bouton et mention d\'information', async () => {
    afficher(fausseApi())
    await champ()
    expect(screen.getByText('CM 1 Programmation avancée • Quiz 1')).toBeInTheDocument()
    expect(bouton()).toBeInTheDocument()
    expect(screen.getByText(MENTION_INFORMATION)).toBeInTheDocument()
  })

  it.each([
    ['quiz inexistant (404)', { resultat: 'REFUSEE', erreur: new ErreurHttp(404, null) } as const,
      'Ce quiz n\'existe pas : vérifie le lien ou scanne à nouveau le QR code.'],
    ['quiz terminé (409)', { resultat: 'REFUSEE', erreur: new ErreurHttp(409, null) } as const, 'Ce quiz est terminé.'],
    ['quiz noté', { resultat: 'OUVERTE', session: { ...SESSION, estNotee: true } } as const,
      'Ce quiz est noté : connecte-toi avec ton compte IUT.'],
  ])('%s : message exact, sans formulaire ni mention', async (_cas, consultation, message) => {
    afficher(fausseApi(consultation))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entrer dans le quiz' })).not.toBeInTheDocument()
    expect(screen.queryByText(MENTION_INFORMATION)).not.toBeInTheDocument()
  })

  it('bouton désactivé tant que le pseudonyme nettoyé est invalide', async () => {
    afficher(fausseApi())
    const saisie = await champ()
    expect(bouton()).toBeDisabled()
    await userEvent.type(saisie, '   ')
    expect(bouton()).toBeDisabled()
    await userEvent.type(saisie, 'a')
    expect(bouton()).toBeDisabled()
    await userEvent.type(saisie, 'b')
    expect(bouton()).toBeEnabled()
    await userEvent.type(saisie, 'c'.repeat(19))
    expect(bouton()).toBeDisabled()
  })

  it('bouton désactivé pendant l\'envoi', async () => {
    const api = fausseApi()
    let terminer: (resultat: ResultatRejoindre) => void = () => {}
    api.rejoindreSession.mockImplementation(() => new Promise((fin) => { terminer = fin }))
    afficher(api)
    await userEvent.type(await champ(), 'Alice')
    await userEvent.click(bouton())
    expect(bouton()).toBeDisabled()
    terminer({ resultat: 'ECHEC_RESEAU' })
    await vi.waitFor(() => expect(bouton()).toBeEnabled())
  })

  it('Entrée envoie le formulaire', async () => {
    const api = fausseApi()
    const onRejoint = afficher(api)
    await userEvent.type(await champ(), 'Alice{Enter}')
    await vi.waitFor(() => expect(onRejoint).toHaveBeenCalledTimes(1))
    expect(api.rejoindreSession).toHaveBeenCalledWith('AB12', 'Alice')
  })

  it('proposition utilisable en un clic, puis envoyée', async () => {
    const erreur = new ErreurHttp(409, { error: 'x', request_id: null, code: 'PSEUDONYME_DEJA_PRIS', suggestion: 'Alice2' })
    const api = fausseApi(undefined, [{ resultat: 'REFUSEE', erreur }, { resultat: 'REJOINT', jeton: 'j' }])
    const onRejoint = afficher(api)
    const saisie = await champ()
    await userEvent.type(saisie, 'Alice{Enter}')

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('Ce pseudonyme est déjà pris. Essaie celui qui t\'est proposé.')
    await userEvent.click(screen.getByRole('button', { name: 'Alice2' }))
    expect(saisie).toHaveValue('Alice2')
    await userEvent.click(bouton())
    await vi.waitFor(() => expect(onRejoint).toHaveBeenCalledTimes(1))
    expect(api.rejoindreSession).toHaveBeenLastCalledWith('AB12', 'Alice2')
  })

  it('500 à l\'envoi : message de la spec, saisie gardée', async () => {
    const api = fausseApi(undefined, [{ resultat: 'REFUSEE', erreur: new ErreurHttp(500, null) }])
    afficher(api)
    const saisie = await champ()
    await userEvent.type(saisie, 'Alice{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('Une erreur est survenue. Réessayez dans un instant.')
    expect(saisie).toHaveValue('Alice')
  })
})
