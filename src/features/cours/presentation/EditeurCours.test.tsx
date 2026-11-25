// Écran E3 (éléments 1 à 4) : UC3, tableau des éléments de E3 ; plan UC3, D11, D12, D16 ; charte, §1 (couleur jamais
// seule porteuse du sens). L'état vient du reducer du domaine ; faux rendu de pages, aucun PDF.js.
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fauxRendrePage, installerFauxNavigateur } from '../../../test/fauxNavigateur.ts'
import type { Cours, PageQuizInseree } from '../domain/cours.ts'
import { ETAT_INITIAL, reduireEditeur } from '../domain/machineEditeur.ts'
import type { ActionEditeur, EtatEditeur } from '../domain/machineEditeur.ts'
import { EditeurCours } from './EditeurCours.tsx'

const cours = (archive = false): Cours => ({
  idCours: 7,
  titre: 'Réseaux',
  archive,
  version: { idVersion: 3, numero: 2, nbPages: 3 },
})

// PDF de 3 pages, une page de quiz en (2, 0) : 4 éléments affichés, 5 espaces d'insertion.
const CHARGE: ActionEditeur = {
  type: 'CHARGE',
  cours: cours(),
  nbPages: 3,
  pages: [{ idPage: 1, numeroPage: 2, ordre: 0, type: 'QUIZ' }],
  quiz: [{ idQuiz: 40, titre: 'Quiz 1' }, { idQuiz: 41, titre: 'Quiz 2' }],
}
const EMPLACEMENT = { numeroPage: 3, ordre: 0 }

const suite = (...actions: ActionEditeur[]): EtatEditeur => actions.reduce(reduireEditeur, ETAT_INITIAL)
const pret = () => suite(CHARGE)
const choix = (charge: ActionEditeur = CHARGE) => suite(charge, { type: 'OUVRIR_CHOIX', emplacement: EMPLACEMENT })
const envoi = () => reduireEditeur(choix(), { type: 'CONFIRMER', idQuiz: 40 })

function afficher(etat: EtatEditeur) {
  const props = {
    etat,
    rendrePage: fauxRendrePage(),
    onSelectionner: vi.fn(),
    onOuvrirChoix: vi.fn(),
    onAnnulerChoix: vi.fn(),
    onConfirmer: vi.fn(),
    onRecharger: vi.fn(),
  }
  const vue = render(<EditeurCours {...props} />)
  return { ...props, vue }
}

const boutonsInsertion = () => screen.queryAllByRole('button', { name: /^Insérer un quiz/ })
const liste = () => screen.getByRole('region', { name: 'Pages du cours' })

let observateurs: ReturnType<typeof installerFauxNavigateur>
beforeEach(() => {
  observateurs = installerFauxNavigateur()
})

describe('élément 1 : titre et version', () => {
  it('titre du cours et numéro de version affichés', () => {
    afficher(pret())
    expect(screen.getByText(/Réseaux/)).toBeInTheDocument()
    expect(screen.getByText(/version 2/)).toBeInTheDocument()
  })
})

describe('élément 2 : pages du cours', () => {
  it('page de quiz distinguée par une icône et un texte, en plus de la couleur ; page du PDF sans icône', () => {
    afficher(pret())
    const miniatures = within(liste()).getAllByRole('button', { name: /^(?!Insérer)/ })
    expect(miniatures).toHaveLength(4)
    const quiz = miniatures.find((m) => m.textContent?.includes('Page de quiz'))
    expect(quiz).toBeDefined()
    expect(quiz?.querySelector('svg')).not.toBeNull()
    expect(quiz).toHaveClass('miniature-quiz')
    for (const m of miniatures.filter((x) => x !== quiz)) {
      expect(m.querySelector('svg')).toBeNull()
      expect(m).not.toHaveClass('miniature-quiz')
    }
  })

  it('numérotation du dossier : la page de quiz en (2, 0) est la page 3, la page 3 du PDF devient la 4', () => {
    afficher(pret())
    const textes = within(liste()).getAllByRole('button', { name: /^(?!Insérer)/ }).map((m) => m.textContent)
    expect(textes).toEqual(['Page 1', 'Page 2', 'Page de quizPage 3', 'Page 4'])
  })

  it('clic sur une miniature : onSelectionner avec la page choisie', async () => {
    const { onSelectionner } = afficher(pret())
    await userEvent.click(within(liste()).getByRole('button', { name: /Page de quiz/ }))
    expect(onSelectionner).toHaveBeenCalledWith({ genre: 'PAGE_INSEREE', idPage: 1, titreQuiz: null })
  })

  it('miniature d\'une page du PDF rendue seulement une fois visible (D8)', () => {
    const { rendrePage } = afficher(pret())
    // L'aperçu rend la page 1 ; aucune miniature tant que rien n'est visible.
    const avant = rendrePage.mock.calls.length
    expect(liste().querySelectorAll('canvas')).toHaveLength(0)
    observateurs.changerVisibilite(true)
    expect(rendrePage.mock.calls.length - avant).toBe(3)
    expect(liste().querySelectorAll('canvas')).toHaveLength(3)
  })

  it('miniature sortie de la zone visible : rendu annulé, canvas retiré et vidé (gros PDF)', () => {
    const { rendrePage } = afficher(pret())
    observateurs.changerVisibilite(true)
    const canvas = [...liste().querySelectorAll('canvas')]
    const rendus = rendrePage.mock.results.slice(-3).map((r) => r.value)
    observateurs.changerVisibilite(false)
    expect(liste().querySelectorAll('canvas')).toHaveLength(0)
    for (const rendu of rendus) expect(rendu.annuler).toHaveBeenCalled()
    for (const c of canvas) expect([c.width, c.height]).toEqual([0, 0])
    // De retour à l'écran : rendue de nouveau.
    observateurs.changerVisibilite(true)
    expect(liste().querySelectorAll('canvas')).toHaveLength(3)
  })
})

describe('élément 3 : « Insérer un quiz ici »', () => {
  it('un bouton par espace : au début, entre chaque paire, à la fin ; infobulle « Insérer un quiz ici »', () => {
    afficher(pret())
    const boutons = boutonsInsertion()
    expect(boutons).toHaveLength(5)
    for (const b of boutons) {
      expect(b).toHaveAttribute('title', 'Insérer un quiz ici')
      expect(b).toBeEnabled()
    }
  })

  it('clic : onOuvrirChoix avec l\'emplacement de cet espace (après la page 4 = fin du PDF)', async () => {
    const { onOuvrirChoix } = afficher(pret())
    const boutons = boutonsInsertion()
    await userEvent.click(boutons[0])
    await userEvent.click(boutons[3])
    await userEvent.click(boutons[4])
    expect(onOuvrirChoix.mock.calls.map(([e]) => e)).toEqual([
      { numeroPage: 0, ordre: 0 },
      { numeroPage: 2, ordre: 1 },
      { numeroPage: 3, ordre: 0 },
    ])
  })

  it('pendant l\'insertion (ENVOI) : tous désactivés, aucun clic ne remonte', async () => {
    const { onOuvrirChoix } = afficher(envoi())
    const boutons = boutonsInsertion()
    expect(boutons).toHaveLength(5)
    for (const b of boutons) expect(b).toBeDisabled()
    await userEvent.click(boutons[0])
    expect(onOuvrirChoix).not.toHaveBeenCalled()
  })

  it('insertion bloquée (VERSION_PERIMEE) : tous désactivés', () => {
    const etat = reduireEditeur(envoi(), {
      type: 'INSERTION_REFUSEE',
      erreur: { statut: 409, code: 'VERSION_PERIMEE', error: null },
    })
    afficher(etat)
    for (const b of boutonsInsertion()) expect(b).toBeDisabled()
  })

  it('lecture seule (cours archivé) : aucun bouton d\'insertion actif', () => {
    afficher(suite({ ...CHARGE, cours: cours(true) } as ActionEditeur))
    expect(boutonsInsertion().filter((b) => !(b as HTMLButtonElement).disabled)).toHaveLength(0)
  })
})

describe('dialogue de choix du quiz (D11)', () => {
  const dialogue = () => screen.getByRole('dialog', { hidden: true })

  it('quiz par défaut présélectionné (premier quiz du cours)', () => {
    afficher(choix())
    expect(within(dialogue()).getByRole('radio', { name: 'Quiz 1', hidden: true })).toBeChecked()
  })

  it('aucun quiz dans le cours : « Nouveau quiz » présélectionné', () => {
    afficher(choix({ ...CHARGE, quiz: [] } as ActionEditeur))
    expect(within(dialogue()).getByRole('radio', { name: 'Nouveau quiz', hidden: true })).toBeChecked()
  })

  it('quiz de la dernière insertion présélectionné ensuite', () => {
    const reponse: PageQuizInseree = {
      idPage: 2,
      idQuiz: 41,
      titreQuiz: 'Quiz 2',
      quizCree: false,
      idQuestion: 90,
      numeroPage: 3,
      ordre: 0,
      pages: [{ idPage: 1, numeroPage: 2, ordre: 0, type: 'QUIZ' }, { idPage: 2, numeroPage: 3, ordre: 0, type: 'QUIZ' }],
    }
    const apres = reduireEditeur(reduireEditeur(choix(), { type: 'CONFIRMER', idQuiz: 41 }), {
      type: 'INSERTION_REUSSIE',
      reponse,
    })
    afficher(reduireEditeur(apres, { type: 'OUVRIR_CHOIX', emplacement: EMPLACEMENT }))
    expect(within(dialogue()).getByRole('radio', { name: 'Quiz 2', hidden: true })).toBeChecked()
  })

  it('au clavier : flèche vers « Quiz 2 », Tab jusqu\'à « Insérer », Entrée → onConfirmer(41)', async () => {
    const { onConfirmer } = afficher(choix())
    const quiz1 = within(dialogue()).getByRole('radio', { name: 'Quiz 1', hidden: true })
    expect(quiz1).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(within(dialogue()).getByRole('radio', { name: 'Quiz 2', hidden: true })).toBeChecked()
    const inserer = within(dialogue()).getByRole('button', { name: 'Insérer', hidden: true })
    for (let i = 0; i < 5 && document.activeElement !== inserer; i++) await userEvent.tab()
    expect(inserer).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onConfirmer).toHaveBeenCalledExactlyOnceWith(41)
  })

  it('au clavier : « Nouveau quiz » choisi → onConfirmer(null)', async () => {
    const { onConfirmer } = afficher(choix())
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(within(dialogue()).getByRole('radio', { name: 'Nouveau quiz', hidden: true })).toBeChecked()
    await userEvent.click(within(dialogue()).getByRole('button', { name: 'Insérer', hidden: true }))
    expect(onConfirmer).toHaveBeenCalledExactlyOnceWith(null)
  })

  it('Échap (événement cancel du dialogue) ou « Annuler » → onAnnulerChoix', async () => {
    const { onAnnulerChoix } = afficher(choix())
    // jsdom ne traduit pas Échap en `cancel` : l'événement natif est envoyé directement.
    fireEvent(dialogue(), new Event('cancel', { cancelable: true }))
    await userEvent.click(within(dialogue()).getByRole('button', { name: 'Annuler', hidden: true }))
    expect(onAnnulerChoix).toHaveBeenCalledTimes(2)
  })
})

describe('bandeau d\'erreur', () => {
  const refus = (statut: number, code: string) =>
    reduireEditeur(envoi(), { type: 'INSERTION_REFUSEE', erreur: { statut, code, error: 'texte du back' } })

  it('message exact de l\'UC3 dans role="alert", avec « Recharger » quand il dit « rechargez l\'éditeur »', async () => {
    const { onRecharger } = afficher(refus(422, 'EMPLACEMENT_INVALIDE'))
    const alerte = screen.getByRole('alert')
    expect(alerte).toHaveTextContent('Emplacement invalide : rechargez l\'éditeur.')
    expect(alerte).not.toHaveTextContent('texte du back')
    await userEvent.click(within(alerte).getByRole('button', { name: 'Recharger' }))
    expect(onRecharger).toHaveBeenCalledOnce()
  })

  it('sans « rechargez l\'éditeur » : pas de bouton « Recharger »', () => {
    afficher(refus(409, 'QUIZ_EN_SEANCE'))
    const alerte = screen.getByRole('alert')
    expect(alerte).toHaveTextContent('Ce quiz est en cours de séance : réessayez après sa clôture.')
    expect(within(alerte).queryByRole('button')).toBeNull()
  })
})

describe('élément 4 : aperçu', () => {
  it('après un 201 : nouvelle page sélectionnée, « Question à paramétrer » et titre du quiz', () => {
    const reponse: PageQuizInseree = {
      idPage: 2,
      idQuiz: 42,
      titreQuiz: 'Quiz 3',
      quizCree: true,
      idQuestion: 90,
      numeroPage: 3,
      ordre: 0,
      pages: [{ idPage: 1, numeroPage: 2, ordre: 0, type: 'QUIZ' }, { idPage: 2, numeroPage: 3, ordre: 0, type: 'QUIZ' }],
    }
    afficher(reduireEditeur(envoi(), { type: 'INSERTION_REUSSIE', reponse }))
    const apercu = screen.getByRole('region', { name: 'Aperçu de la page' })
    expect(apercu).toHaveTextContent('Question à paramétrer')
    expect(apercu).toHaveTextContent('Quiz 3')
    expect(apercu).toHaveTextContent('Page 5')
    const miniature = within(liste()).getAllByRole('button', { name: /Page 5/ })[0]
    expect(miniature).toHaveAttribute('aria-current', 'true')
  })
})
