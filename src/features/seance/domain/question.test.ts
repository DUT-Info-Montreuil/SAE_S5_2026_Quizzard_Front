// Règles de saisie : plan UC9, D8 et D13 ; UC9, « valider » (élément relié deux fois, texte vide ou > 1 000 caractères).
import { describe, expect, it } from 'vitest'
import { questionARelier, questionLibre, questionQcm } from '../../../test/fabriques.ts'
import { basculerProposition, relier, reponseComplete, saisieVide } from './question.ts'

describe('reponseComplete', () => {
  describe('QCM', () => {
    it('vide : incomplète', () => {
      expect(reponseComplete(questionQcm(), { type: 'QCM', propositions: [] })).toBe(false)
    })

    it('un choix : complète', () => {
      expect(reponseComplete(questionQcm(), { type: 'QCM', propositions: [12] })).toBe(true)
    })

    it('choix unique (choixMultiple absent) : deux choix refusés', () => {
      expect(reponseComplete(questionQcm(), { type: 'QCM', propositions: [11, 12] })).toBe(false)
    })

    it('choix multiple : deux choix acceptés, un seul suffit', () => {
      const question = questionQcm({ choixMultiple: true })
      expect(reponseComplete(question, { type: 'QCM', propositions: [11, 12] })).toBe(true)
      expect(reponseComplete(question, { type: 'QCM', propositions: [11] })).toBe(true)
    })

    it('proposition d\'une autre question : incomplète', () => {
      expect(reponseComplete(questionQcm(), { type: 'QCM', propositions: [99] })).toBe(false)
    })
  })

  describe('points à relier', () => {
    const question = questionARelier()

    it('aucun lien : incomplète', () => {
      expect(reponseComplete(question, { type: 'POINTS_A_RELIER', liens: [] })).toBe(false)
    })

    it('un élément de gauche non relié : incomplète', () => {
      expect(reponseComplete(question, { type: 'POINTS_A_RELIER', liens: [{ gauche: 1, droite: 101 }] })).toBe(false)
    })

    it('chaque élément relié une fois : complète', () => {
      const liens = [{ gauche: 1, droite: 101 }, { gauche: 2, droite: 102 }]
      expect(reponseComplete(question, { type: 'POINTS_A_RELIER', liens })).toBe(true)
    })

    it('élément de gauche relié deux fois : incomplète', () => {
      const liens = [{ gauche: 1, droite: 101 }, { gauche: 1, droite: 102 }]
      expect(reponseComplete(question, { type: 'POINTS_A_RELIER', liens })).toBe(false)
    })

    it('élément de droite relié deux fois : incomplète', () => {
      const liens = [{ gauche: 1, droite: 101 }, { gauche: 2, droite: 101 }]
      expect(reponseComplete(question, { type: 'POINTS_A_RELIER', liens })).toBe(false)
    })
  })

  describe('réponse libre', () => {
    const question = questionLibre()
    const libre = (texte: string) => reponseComplete(question, { type: 'REPONSE_LIBRE', texte })

    it('vide ou seulement des espaces : incomplète', () => {
      expect(libre('')).toBe(false)
      expect(libre('   ')).toBe(false)
    })

    it('1000 caractères : complète', () => {
      expect(libre('a'.repeat(1000))).toBe(true)
    })

    it('1001 caractères : incomplète', () => {
      expect(libre('a'.repeat(1001))).toBe(false)
    })
  })

  it('saisie d\'un autre type que la question : incomplète', () => {
    expect(reponseComplete(questionLibre(), { type: 'QCM', propositions: [11] })).toBe(false)
  })
})

describe('basculerProposition (D13)', () => {
  it('choix unique : un nouveau choix remplace le précédent', () => {
    expect(basculerProposition([11], 12)).toEqual([12])
  })

  it('choix multiple : les choix se cumulent', () => {
    expect(basculerProposition([11], 12, true)).toEqual([11, 12])
  })

  it('un second clic décoche', () => {
    expect(basculerProposition([11], 11)).toEqual([])
  })
})

describe('relier (D8) : un élément n\'est relié qu\'une fois', () => {
  it('relier à nouveau un élément de gauche remplace son lien', () => {
    expect(relier([{ gauche: 1, droite: 101 }], 1, 102)).toEqual([{ gauche: 1, droite: 102 }])
  })

  it('relier à nouveau un élément de droite remplace son lien', () => {
    expect(relier([{ gauche: 1, droite: 101 }], 2, 101)).toEqual([{ gauche: 2, droite: 101 }])
  })
})

describe('saisieVide', () => {
  it('donne une saisie vide du type de la question', () => {
    expect(saisieVide(questionQcm())).toEqual({ type: 'QCM', propositions: [] })
    expect(saisieVide(questionARelier())).toEqual({ type: 'POINTS_A_RELIER', liens: [] })
    expect(saisieVide(questionLibre())).toEqual({ type: 'REPONSE_LIBRE', texte: '' })
  })
})
