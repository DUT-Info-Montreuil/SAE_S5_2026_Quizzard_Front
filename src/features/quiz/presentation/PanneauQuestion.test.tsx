import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEROULE_PAR_DEFAUT, questionVide } from '../domain/questionEditee.ts'
import { ApercuQuestion } from './ApercuQuestion.tsx'
import { BoutonEnregistrer } from './BoutonEnregistrer.tsx'
import { PanneauQuestion } from './PanneauQuestion.tsx'

function monter() {
  const onQuestion = vi.fn()
  const onDeroule = vi.fn()
  const question = questionVide('QCM')
  render(<PanneauQuestion question={question} deroule={DEROULE_PAR_DEFAUT} onQuestion={onQuestion} onDeroule={onDeroule} />)
  return { question, onQuestion, onDeroule }
}

describe('panneau de la question (éléments 5 à 8, 12, 15, 16)', () => {
  it('type, bonne réponse, durée et barème remontent en actions', async () => {
    const { question, onQuestion } = monter()
    await userEvent.click(screen.getByRole('radio', { name: 'Points à relier' }))
    expect(onQuestion).toHaveBeenCalledWith({ type: 'TYPE', valeur: 'POINTS_A_RELIER' })
    await userEvent.click(screen.getByRole('checkbox', { name: 'B est une bonne réponse' }))
    expect(onQuestion).toHaveBeenCalledWith({ type: 'BASCULER_CORRECTE', id: question.propositions[1].id })
    await userEvent.click(screen.getByRole('radio', { name: '45 s' }))
    expect(onQuestion).toHaveBeenCalledWith({ type: 'DUREE', valeur: 45 })
    await userEvent.click(screen.getByRole('switch', { name: 'Points partiels' }))
    expect(onQuestion).toHaveBeenCalledWith({ type: 'BASCULER_POINTS_PARTIELS' })
    expect(screen.getByLabelText('Points maximum')).toHaveValue(new Intl.NumberFormat('fr-FR').format(1000))
  })

  it('passage automatique et écran « Classement »', async () => {
    const { onDeroule } = monter()
    await userEvent.click(screen.getByRole('radio', { name: 'Auto' }))
    expect(onDeroule).toHaveBeenCalledWith({ ...DEROULE_PAR_DEFAUT, passage: 'AUTO' })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Afficher l\'écran « Classement »' }))
    expect(onDeroule.mock.lastCall?.[0].ecrans[2].actif).toBe(true)
  })
})

describe('aperçu de la question (éléments 4 et 18)', () => {
  it('affiche l\'en-tête, les lettres et la bonne réponse ; annonce les formats après un refus', () => {
    const question = {
      ...questionVide('QCM'),
      enonce: 'Quelle structure ?',
      propositions: [{ id: 1, libelle: 'Pile', correcte: false }, { id: 2, libelle: 'Table', correcte: true }],
    }
    const props = { titreQuiz: 'Quiz 1', numero: 1, total: 3, question, onChoisirImage: () => {}, onRetirerImage: () => {} }
    const { rerender } = render(<ApercuQuestion {...props} imageRefusee={false} />)
    expect(screen.getByText('Quiz 1 · Question 1 sur 3')).toBeVisible()
    expect(screen.getByText('Table').closest('li')).toHaveTextContent('B. TableBonne réponse')
    expect(screen.getByRole('button', { name: 'Retirer' })).toBeDisabled()
    expect(screen.queryByRole('alert')).toBeNull()
    rerender(<ApercuQuestion {...props} imageRefusee />)
    expect(screen.getByRole('alert')).toHaveTextContent('PNG, JPEG ou WebP · 2 Mo maximum')
  })
})

describe('Enregistrer (élément 10)', () => {
  it('désactivé sans modification ; alerte du navigateur tant que rien n\'est enregistré', () => {
    const { rerender } = render(<BoutonEnregistrer modifie={false} enCours={false} onEnregistrer={() => {}} />)
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
    rerender(<BoutonEnregistrer modifie enCours={false} onEnregistrer={() => {}} />)
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeEnabled()
    const evenement = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(evenement)
    expect(evenement.defaultPrevented).toBe(true)
  })
})
