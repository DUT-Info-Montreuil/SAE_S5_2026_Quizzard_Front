// E9 « Résultat et classement » : charte §1, §9 (E9-1 à E9-4) et §10 (rang de l'étudiant seul) ; UC9, cas d'erreur.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { lireErreurEnvoi } from '../domain/erreursReponse.ts'
import type { ResultatQuestion } from '../domain/question.ts'
import { EcranResultat } from './EcranResultat.tsx'
import type { EcranE9 } from './EcranResultat.tsx'

function afficher(ecran: EcranE9, onRejoindre = () => {}) {
  return render(<EcranResultat ecran={ecran} onRejoindre={onRejoindre} onRecharger={() => {}} />)
}

const resultat: ResultatQuestion = { points: 875, scoreTotal: 1200, rang: 3, nombreParticipants: 24, evolution: 2 }
const ATTENTE_E9_4 = /prochaine question/i

describe('E9 : chaque état', () => {
  it('CONFIRMEE : « Réponse enregistrée » puis attente', () => {
    afficher({ nom: 'CONFIRMEE', idQuestion: 1 })
    expect(screen.getByText('Réponse enregistrée')).toBeInTheDocument()
    expect(screen.getByText(ATTENTE_E9_4)).toBeInTheDocument()
  })

  it('TEMPS_ECOULE : confirmation à l\'expiration du temps, sans « Réponse enregistrée »', () => {
    afficher({ nom: 'TEMPS_ECOULE', idQuestion: 1 })
    expect(screen.getByText(/temps écoulé/i)).toBeInTheDocument()
    expect(screen.queryByText('Réponse enregistrée')).not.toBeInTheDocument()
  })

  it.each([
    ['QUESTION_CLOSE', 'Cette session est terminée.'],
    ['HORS_DELAI', 'Temps écoulé : réponse non prise en compte.'],
    ['DEJA_REPONDU', 'Tu as déjà répondu.'],
  ])('REFUSEE %s : message exact de l\'UC9', (code, message) => {
    afficher({ nom: 'REFUSEE', idQuestion: 1, erreur: lireErreurEnvoi({ statut: 409, code, error: null }, true) })
    expect(screen.getByRole('alert')).toHaveTextContent(message)
  })

  it('SESSION_EXPIREE : message exact et bouton « Rejoindre » vers E7, sans attente', async () => {
    const onRejoindre = vi.fn()
    afficher(
      { nom: 'SESSION_EXPIREE', erreur: lireErreurEnvoi({ statut: 401, code: 'JETON_INVALIDE', error: null }, true) },
      onRejoindre,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Ta session a expiré, rejoins le quiz à nouveau.')
    expect(screen.queryByText(ATTENTE_E9_4)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Rejoindre' }))
    expect(onRejoindre).toHaveBeenCalledTimes(1)
  })

  it('ATTENTE : message d\'attente (E9-4)', () => {
    afficher({ nom: 'ATTENTE' })
    expect(screen.getByText(ATTENTE_E9_4)).toBeInTheDocument()
  })

  it('SEANCE_CLOSE : plus d\'attente de question', () => {
    afficher({ nom: 'SEANCE_CLOSE' })
    expect(screen.queryByText(ATTENTE_E9_4)).not.toBeInTheDocument()
  })

  it('RESULTAT : points de la question, score total, rang sur le nombre de participants', () => {
    afficher({ nom: 'RESULTAT', resultat })
    expect(screen.getByText(/\+\s?875 pts/)).toBeInTheDocument()
    expect(screen.getByText(/Score total : 1\s?200 pts/)).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText(/\/ 24/)).toBeInTheDocument()
  })
})

describe('E9 : évolution du rang, toujours doublée d\'un symbole', () => {
  it.each([
    [2, '▲', /2 places gagnées/],
    [-1, '▼', /1 place perdue/],
    [0, '=', /inchangé/i],
  ])('évolution %i : symbole %s et texte', (evolution, symbole, texte) => {
    afficher({ nom: 'RESULTAT', resultat: { ...resultat, evolution } })
    expect(screen.getByText(new RegExp(`^${symbole}`))).toBeInTheDocument()
    expect(screen.getByText(texte)).toBeInTheDocument()
  })
})

describe('E9 : jamais le classement complet', () => {
  it('seul le rang de l\'étudiant est affiché, même si le message contient d\'autres participants', () => {
    const avecClassement = {
      ...resultat,
      classement: [{ pseudonyme: 'Zébulon', rang: 1 }, { pseudonyme: 'Pollux', rang: 2 }],
    } as ResultatQuestion
    afficher({ nom: 'RESULTAT', resultat: avecClassement })
    expect(screen.queryByText(/Zébulon|Pollux/)).not.toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
})
