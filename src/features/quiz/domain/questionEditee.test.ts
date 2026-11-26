import { describe, expect, it } from 'vitest'
import {
  basculerEcran, DEROULE_PAR_DEFAUT, imageAcceptee, PROPOSITIONS_MAX, questionComplete, questionVide, reduireQuestion,
} from './questionEditee.ts'
import type { ActionQuestion, QuestionEditee } from './questionEditee.ts'

const appliquer = (q: QuestionEditee, ...actions: ActionQuestion[]) => actions.reduce(reduireQuestion, q)

describe('question éditée (Charte Editeur, éléments 5 à 8)', () => {
  it('QCM complet : énoncé, 2 propositions remplies et 1 bonne réponse au moins', () => {
    const q = questionVide('QCM')
    const [a, b] = q.propositions
    expect(questionComplete(q)).toBe(false)
    const remplie = appliquer(q,
      { type: 'ENONCE', valeur: 'Quelle structure ?' },
      { type: 'PROPOSITION', id: a.id, libelle: 'Pile' },
      { type: 'PROPOSITION', id: b.id, libelle: 'File' })
    expect(questionComplete(remplie)).toBe(false)
    expect(questionComplete(reduireQuestion(remplie, { type: 'BASCULER_CORRECTE', id: b.id }))).toBe(true)
  })

  it('points à relier : 2 paires remplies au moins ; réponse libre : une réponse acceptée', () => {
    const relier = questionVide('POINTS_A_RELIER')
    const [p1, p2] = relier.paires
    expect(questionComplete(appliquer(relier,
      { type: 'ENONCE', valeur: 'Relie.' },
      { type: 'PAIRE', id: p1.id, cote: 'gauche', valeur: 'Java' },
      { type: 'PAIRE', id: p1.id, cote: 'droite', valeur: 'Objet' },
      { type: 'PAIRE', id: p2.id, cote: 'gauche', valeur: 'Haskell' },
      { type: 'PAIRE', id: p2.id, cote: 'droite', valeur: 'Fonctionnel' }))).toBe(true)
    expect(questionComplete(appliquer(questionVide('REPONSE_LIBRE'),
      { type: 'ENONCE', valeur: 'Mot-clé ?' },
      { type: 'REPONSE_ACCEPTEE', indice: 0, valeur: 'final' }))).toBe(true)
  })

  it('bornes : 2 à 4 propositions, 2 paires au moins, durée et points positifs', () => {
    let q = questionVide('QCM')
    for (let i = 0; i < 5; i++) q = reduireQuestion(q, { type: 'AJOUTER_PROPOSITION' })
    expect(q.propositions).toHaveLength(PROPOSITIONS_MAX)
    const deux = questionVide('QCM')
    expect(reduireQuestion(deux, { type: 'RETIRER_PROPOSITION', id: deux.propositions[0].id })).toBe(deux)
    expect(reduireQuestion(deux, { type: 'RETIRER_PAIRE', id: deux.paires[0].id })).toBe(deux)
    expect(reduireQuestion(deux, { type: 'DUREE', valeur: 0 })).toBe(deux)
    expect(reduireQuestion(deux, { type: 'POINTS_MAX', valeur: -1 })).toBe(deux)
    expect(reduireQuestion(deux, { type: 'POINTS_MAX', valeur: 500 }).pointsMax).toBe(500)
  })

  it('écrans intermédiaires : activer sans modifier le déroulé d\'origine', () => {
    const d = basculerEcran(DEROULE_PAR_DEFAUT, 'CLASSEMENT')
    expect(d.ecrans.find((e) => e.type === 'CLASSEMENT')?.actif).toBe(true)
    expect(DEROULE_PAR_DEFAUT.ecrans.find((e) => e.type === 'CLASSEMENT')?.actif).toBe(false)
  })

  it('image : PNG, JPEG ou WebP, 2 Mo au plus', () => {
    expect(imageAcceptee({ type: 'image/png', size: 2 * 1024 * 1024 })).toBe(true)
    expect(imageAcceptee({ type: 'image/webp', size: 2 * 1024 * 1024 + 1 })).toBe(false)
    expect(imageAcceptee({ type: 'image/gif', size: 10 })).toBe(false)
  })
})
