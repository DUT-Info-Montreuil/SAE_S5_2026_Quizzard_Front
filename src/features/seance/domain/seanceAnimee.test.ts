import { describe, expect, it } from 'vitest'
import { correctionJson, etatJson, etatQuestionOuverteJson, questionJson } from '../../../test/fabriquesAnimation.ts'
import { convertirMessageAnimation, lireEtatSeance } from '../api/lecturesAnimation.ts'
import type { CanalAnimation } from '../api/destinationsAnimation.ts'
import { barres, libelleSuivant, reduireSeance } from './seanceAnimee.ts'
import type { SeanceEnDirect } from './seanceAnimee.ts'

const relu = (etat: SeanceEnDirect | null, json: unknown, recuA = 1000) =>
  reduireSeance(etat, { type: 'ETAT_RELU', seance: lireEtatSeance(json)!, ecartMs: 0, recuA })

const message = (etat: SeanceEnDirect | null, canal: CanalAnimation, corps: object) => {
  const action = convertirMessageAnimation(canal, JSON.stringify(corps), 1000)
  return action === null ? etat : reduireSeance(etat, action)
}

describe('réducteur de la séance', () => {
  it('cale la fin de la question sur le temps restant donné par le serveur', () => {
    expect(relu(null, etatQuestionOuverteJson())?.fin).toEqual({ echeanceMs: 16_000, ecartMs: 0 })
  })

  it('démarre une question reçue par STOMP avec l\'échéance et l\'écart du serveur', () => {
    const s = message(relu(null, etatJson()), 'question', questionJson())
    expect(s?.seance).toMatchObject({ statut: 'EN_COURS', position: 1, questionOuverte: true })
    expect(s?.fin).toEqual({ echeanceMs: Date.UTC(2026, 10, 25, 13, 1, 20), ecartMs: 0 })
  })

  it('ignore une lecture REST partie avant la clôture et arrivée après', () => {
    const close = message(relu(null, etatQuestionOuverteJson()), 'correction', correctionJson())
    const apres = relu(close, etatQuestionOuverteJson())
    expect(apres?.seance.questionOuverte).toBe(false)
    expect(apres?.seance.correction).not.toBeNull()
    expect(apres?.fin).toBeNull()
  })

  it('ignore une question, une correction, une répartition et un écran d\'une autre question', () => {
    const s = relu(null, etatQuestionOuverteJson({ position: 2, question: questionJson({ idQuestion: 13, position: 2 }) }))
    expect(message(s, 'question', questionJson())).toBe(s)
    expect(message(s, 'correction', correctionJson())).toBe(s)
    expect(message(s, 'repartition', { idQuestion: 12, total: 3, propositions: [] })).toBe(s)
    expect(message(s, 'ecran', { idQuestion: 12, type: 'REPARTITION' })).toBe(s)
  })

  it('garde la répartition la plus complète', () => {
    const s = message(relu(null, etatQuestionOuverteJson()), 'repartition', { idQuestion: 12, total: 5, propositions: [] })
    expect(relu(s, etatQuestionOuverteJson())?.seance.repartition?.total).toBe(5)
  })

  it('termine la séance : plus de lien, de QR code ni d\'action possible', () => {
    const s = message(relu(null, etatQuestionOuverteJson()), 'etat', { etat: 'CLOTUREE', position: 1 })
    expect(s?.seance).toMatchObject({ statut: 'CLOTUREE', lienAcces: null, qrCode: null })
    expect(message(s, 'question', questionJson({ position: 2 }))).toBe(s)
    expect(relu(s, etatQuestionOuverteJson())?.seance.statut).toBe('CLOTUREE')
  })

  it('efface l\'écran intermédiaire à la question suivante', () => {
    let s = message(relu(null, etatQuestionOuverteJson()), 'correction', correctionJson())
    s = message(s, 'ecran', { idQuestion: 12, position: 1, type: 'BONNE_REPONSE', rang: 0 })
    expect(s?.ecran).toBe('BONNE_REPONSE')
    s = message(s, 'question', questionJson({ idQuestion: 13, position: 2 }))
    expect(s?.ecran).toBeNull()
    expect(s?.seance.correction).toBeNull()
  })
})

describe('lecture des données du back', () => {
  it('refuse un état ou un message mal formé', () => {
    expect(lireEtatSeance(etatJson({ statut: 'EN_ATTENTE' }))).toBeNull()
    expect(lireEtatSeance(etatJson({ question: { idQuestion: 1 } }))).toBeNull()
    expect(convertirMessageAnimation('question', '{', 0)).toBeNull()
    expect(convertirMessageAnimation('ecran', '{"idQuestion":1,"type":"AUTRE"}', 0)).toBeNull()
    expect(convertirMessageAnimation('connectes', '{}', 0)).toBeNull()
  })
})

describe('règles d\'affichage', () => {
  it('nomme la commande selon la position', () => {
    expect(libelleSuivant({ position: 0, nbQuestions: 2 })).toBe('Démarrer')
    expect(libelleSuivant({ position: 1, nbQuestions: 2 })).toBe('Suivant')
    expect(libelleSuivant({ position: 2, nbQuestions: 2 })).toBe('Terminer')
  })

  it('compte zéro pour une proposition jamais cochée', () => {
    const b = barres(
      [{ idProposition: 41, libelle: 'LDAP' }, { idProposition: 42, libelle: 'SMTP' }],
      { idQuestion: 12, total: 4, propositions: [{ idProposition: 41, nombre: 4 }] }, null)
    expect(b.map((x) => [x.lettre, x.nombre, x.part, x.bonne])).toEqual([['A', 4, 1, false], ['B', 0, 0, false]])
  })
})
