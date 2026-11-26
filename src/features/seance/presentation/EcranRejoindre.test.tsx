// E7 « Rejoindre » : UC8 (E7-1 à E7-5, cas d'erreur) ; plan UC8, §5, D4, D5, D10, D13 et D15.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { EcranRejoindre as EtatEcranRejoindre, SessionPublique } from '../domain/ecranRejoindre.ts'
import { EcranRejoindre } from './EcranRejoindre.tsx'
import { MENTION_INFORMATION } from './mentionInformation.ts'

const SESSION: SessionPublique = { titreCours: 'CM 1 Programmation avancée', titreQuiz: 'Quiz 1', estNotee: false }

function formulaire(champs: Partial<Extract<EtatEcranRejoindre, { nom: 'FORMULAIRE' }>> = {}): EtatEcranRejoindre {
  return { nom: 'FORMULAIRE', session: SESSION, saisie: '', erreur: null, suggestion: null, envoi: false, ...champs }
}

function afficher(ecran: EtatEcranRejoindre, peutEntrer = false) {
  const actions = { onSaisie: vi.fn(), onEntrer: vi.fn(), onSuggestion: vi.fn(), onRecharger: vi.fn() }
  render(<EcranRejoindre ecran={ecran} peutEntrer={peutEntrer} {...actions} />)
  return actions
}

const bouton = () => screen.getByRole('button', { name: 'Entrer dans le quiz' })

describe('E7 : états sans formulaire', () => {
  it('CHARGEMENT : « Chargement… » et logo', () => {
    afficher({ nom: 'CHARGEMENT' })
    expect(screen.getByRole('status')).toHaveTextContent('Chargement…')
    expect(screen.getByRole('img', { name: 'IUT de Montreuil' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it.each([
    ['INTROUVABLE', 'Ce quiz n\'existe pas : vérifie le lien ou scanne à nouveau le QR code.'],
    ['TERMINE', 'Ce quiz est terminé.'],
  ] as const)('%s : message seul, sans titres ni formulaire', (nom, message) => {
    afficher({ nom, message })
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByText(/Quiz 1/)).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('QUIZ_NOTE : titres et message, sans champ ni bouton', () => {
    const message = 'Ce quiz est noté : connecte-toi avec ton compte IUT.'
    afficher({ nom: 'QUIZ_NOTE', session: SESSION, message })
    expect(screen.getByText('CM 1 Programmation avancée • Quiz 1')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText(MENTION_INFORMATION)).not.toBeInTheDocument()
  })

  it('ECHEC_CHARGEMENT : message et « Recharger »', async () => {
    const { onRecharger } = afficher({ nom: 'ECHEC_CHARGEMENT', message: 'Une erreur est survenue. Réessayez dans un instant.' })
    await userEvent.click(screen.getByRole('button', { name: 'Recharger' }))
    expect(onRecharger).toHaveBeenCalledTimes(1)
  })
})

describe('E7 : formulaire', () => {
  it('E7-1 à E7-5 : titres, champ « Pseudonyme », bouton, mention', () => {
    afficher(formulaire())
    expect(screen.getByText('CM 1 Programmation avancée • Quiz 1')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Choisis ton pseudo pour rejoindre')
    expect(screen.getByRole('textbox', { name: 'Pseudonyme' })).toBeInTheDocument()
    expect(bouton()).toBeInTheDocument()
    expect(screen.getByText(MENTION_INFORMATION)).toBeInTheDocument()
  })

  it('champ adapté au clavier mobile, sans maxLength', () => {
    afficher(formulaire())
    const champ = screen.getByRole('textbox', { name: 'Pseudonyme' })
    expect(champ).toHaveAttribute('autocomplete', 'nickname')
    expect(champ).toHaveAttribute('autocapitalize', 'off')
    expect(champ).toHaveAttribute('autocorrect', 'off')
    expect(champ).toHaveAttribute('spellcheck', 'false')
    expect(champ).not.toHaveAttribute('maxlength')
  })

  it('compteur : longueur du pseudonyme nettoyé sur 20, relié au champ', () => {
    afficher(formulaire({ saisie: '  René   D  ' }))
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('6/20')
  })

  it('la saisie est remontée par onSaisie', async () => {
    const { onSaisie } = afficher(formulaire())
    await userEvent.type(screen.getByRole('textbox'), 'A')
    expect(onSaisie).toHaveBeenCalledWith('A')
  })

  it('bouton désactivé si peutEntrer est faux, actif sinon', () => {
    afficher(formulaire({ saisie: 'a' }), false)
    expect(bouton()).toBeDisabled()
  })

  it('clic sur « Entrer dans le quiz » : onEntrer', async () => {
    const { onEntrer } = afficher(formulaire({ saisie: 'Alice' }), true)
    await userEvent.click(bouton())
    expect(onEntrer).toHaveBeenCalledTimes(1)
  })

  it('Entrée dans le champ : onEntrer, une seule fois', async () => {
    const { onEntrer } = afficher(formulaire({ saisie: 'Alice' }), true)
    await userEvent.type(screen.getByRole('textbox'), '{Enter}')
    expect(onEntrer).toHaveBeenCalledTimes(1)
  })

  it('Entrée avec un pseudonyme invalide : onEntrer (message du 422 par le reducer)', async () => {
    const { onEntrer } = afficher(formulaire({ saisie: 'a' }), false)
    await userEvent.type(screen.getByRole('textbox'), '{Enter}')
    expect(onEntrer).toHaveBeenCalledTimes(1)
  })

  it('erreur sous le champ, reliée au champ', () => {
    const erreur = 'Ton pseudonyme doit faire de 2 à 20 caractères.'
    afficher(formulaire({ saisie: 'a', erreur }))
    const champ = screen.getByRole('textbox')
    expect(screen.getByRole('alert')).toHaveTextContent(erreur)
    expect(champ).toHaveAttribute('aria-invalid', 'true')
    expect(champ).toHaveAccessibleDescription(`${erreur} 1/20`)
  })

  it('suggestion : bouton portant le pseudonyme proposé, qui appelle onSuggestion', async () => {
    const { onSuggestion } = afficher(formulaire({
      saisie: 'Alice', erreur: 'Ce pseudonyme est déjà pris. Essaie celui qui t\'est proposé.', suggestion: 'Alice2',
    }), true)
    await userEvent.click(screen.getByRole('button', { name: 'Alice2' }))
    expect(onSuggestion).toHaveBeenCalledTimes(1)
  })

  it('suggestion rendue comme texte, jamais comme HTML', () => {
    afficher(formulaire({ suggestion: '<b>Bob</b>' }))
    expect(screen.getByRole('button', { name: '<b>Bob</b>' })).toBeInTheDocument()
  })

  it('pendant l\'envoi : bouton désactivé, champ en lecture seule', () => {
    afficher(formulaire({ saisie: 'Alice', envoi: true }), false)
    expect(bouton()).toBeDisabled()
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly')
  })
})
