// E8 « Question » : charte §1 et §9 (E8-1 à E8-5) ; plan UC9, D8, D9, D13, D15.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { questionARelier, questionQcm } from '../../../test/fabriques.ts'
import type { Lien, Question, ReponseSaisie } from '../domain/question.ts'
import { saisieVide } from '../domain/question.ts'
import { EcranQuestion } from './EcranQuestion.tsx'

interface Options {
  saisie?: ReponseSaisie
  tempsRestantMs?: number
  envoiEnCours?: boolean
  onValider?: () => void
  onChangerSaisie?: (saisie: ReponseSaisie) => void
}

function afficher(question: Question, options: Options = {}) {
  return render(
    <EcranQuestion
      question={question}
      saisie={options.saisie ?? saisieVide(question)}
      onChangerSaisie={options.onChangerSaisie ?? (() => {})}
      tempsRestantMs={options.tempsRestantMs ?? 15_000}
      envoiEnCours={options.envoiEnCours ?? false}
      erreur={null}
      arriveeEnCours={false}
      onValider={options.onValider ?? (() => {})}
    />,
  )
}

const valider = () => screen.getByRole('button', { name: 'Valider ma réponse' })
const choix12: ReponseSaisie = { type: 'QCM', propositions: [12] }

describe('E8 : bouton Valider', () => {
  it('désactivé si la réponse est incomplète', () => {
    afficher(questionQcm())
    expect(valider()).toBeDisabled()
  })

  it('actif si la réponse est complète et qu\'il reste du temps', () => {
    afficher(questionQcm(), { saisie: choix12 })
    expect(valider()).toBeEnabled()
  })

  it('désactivé à 0 s', () => {
    afficher(questionQcm(), { saisie: choix12, tempsRestantMs: 0 })
    expect(valider()).toBeDisabled()
  })

  it('désactivé pendant l\'envoi, et la réponse n\'est plus modifiable', () => {
    afficher(questionQcm(), { saisie: choix12, envoiEnCours: true })
    expect(valider()).toBeDisabled()
    for (const option of screen.getAllByRole('radio')) expect(option).toBeDisabled()
  })

  it('un clic appelle onValider', async () => {
    const onValider = vi.fn()
    afficher(questionQcm(), { saisie: choix12, onValider })
    await userEvent.click(valider())
    expect(onValider).toHaveBeenCalledTimes(1)
  })
})

describe('E8 : affichage', () => {
  it('lettres A à D affichées pour chaque proposition', () => {
    afficher(questionQcm())
    for (const lettre of ['A', 'B', 'C', 'D']) expect(screen.getByText(lettre)).toBeInTheDocument()
  })

  it('énoncé affiché', () => {
    afficher(questionQcm())
    expect(screen.getByRole('heading', { name: questionQcm().enonce })).toBeInTheDocument()
  })

  it('nombre de secondes affiché (pas seulement la couleur)', () => {
    afficher(questionQcm(), { tempsRestantMs: 15_000 })
    expect(screen.getByRole('timer')).toHaveAccessibleName('15 secondes restantes')
    expect(screen.getByRole('timer')).toHaveTextContent('0:15')
  })

  it('image affichée sous l\'énoncé si elle existe, avec un texte alternatif', () => {
    afficher(questionQcm({ image: '/images/question-1.png' }))
    // Le logo de l'IUT est aussi une image : on cherche celle de la question.
    const image = screen.getAllByRole('img').find((e) => e.getAttribute('src') === '/images/question-1.png')
    expect(image).toBeDefined()
    expect(image).toHaveAttribute('alt')
    expect(image?.getAttribute('alt')).not.toBe('')
  })

  it('aucune image si le champ est absent', () => {
    afficher(questionQcm())
    expect(document.querySelector('img')).toBeNull()
  })

  it('QCM sans choixMultiple : boutons radio (un seul choix)', () => {
    afficher(questionQcm())
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('QCM avec choixMultiple : cases à cocher', () => {
    afficher(questionQcm({ choixMultiple: true }))
    expect(screen.getAllByRole('checkbox')).toHaveLength(4)
  })
})

describe('E8 : points à relier, un élément n\'est relié qu\'une fois', () => {
  function RelierAvecEtat({ surChangement }: { surChangement: (liens: Lien[]) => void }) {
    const question = questionARelier()
    const [saisie, setSaisie] = useState<ReponseSaisie>(saisieVide(question))
    return (
      <EcranQuestion
        question={question}
        saisie={saisie}
        onChangerSaisie={(nouvelle) => {
          if (nouvelle.type === 'POINTS_A_RELIER') surChangement(nouvelle.liens)
          setSaisie(nouvelle)
        }}
        tempsRestantMs={20_000}
        envoiEnCours={false}
        erreur={null}
        arriveeEnCours={false}
        onValider={() => {}}
      />
    )
  }

  const uniques = (valeurs: number[]) => new Set(valeurs).size === valeurs.length

  it('toucher à gauche puis à droite relie ; un élément déjà relié n\'est jamais relié une seconde fois', async () => {
    const historique: Lien[][] = []
    render(<RelierAvecEtat surChangement={(liens) => historique.push(liens)} />)
    const bouton = (nom: RegExp) => screen.getByRole('button', { name: nom })

    await userEvent.click(bouton(/^1\. Haskell/))
    await userEvent.click(bouton(/^Fonctionnel/))
    expect(historique.at(-1)).toEqual([{ gauche: 1, droite: 101 }])

    // Java vers le même élément de droite : il ne peut pas être relié deux fois.
    await userEvent.click(bouton(/^2\. Java/))
    await userEvent.click(bouton(/^Fonctionnel/))

    for (const liens of historique) {
      expect(uniques(liens.map((l) => l.gauche))).toBe(true)
      expect(uniques(liens.map((l) => l.droite))).toBe(true)
    }
  })

  it('Valider s\'active quand chaque élément est relié', async () => {
    render(<RelierAvecEtat surChangement={() => {}} />)
    const bouton = (nom: RegExp) => screen.getByRole('button', { name: nom })
    expect(valider()).toBeDisabled()

    await userEvent.click(bouton(/^1\. Haskell/))
    await userEvent.click(bouton(/^Fonctionnel/))
    await userEvent.click(bouton(/^2\. Java/))
    await userEvent.click(bouton(/^Objet/))
    expect(valider()).toBeEnabled()
  })
})
