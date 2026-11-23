// Messages STOMP reçus par l'étudiant : plan UC9, §3 (contrat provisoire, question O1) et B6.
import { describe, expect, it, vi } from 'vitest'
import { convertirMessage, convertirRefus } from './messagesSeance.ts'

const QUESTION = {
  idQuestion: 1,
  position: 1,
  type: 'QCM',
  enonce: 'Quelle structure garantit un accès en O(1) en moyenne ?',
  propositions: [{ idProposition: 11, libelle: 'Liste chaînée' }, { idProposition: 12, libelle: 'Table de hachage' }],
  dureeSec: 20,
  echeance: '2026-11-23T10:00:20Z',
}

describe('convertirMessage : messages du contrat', () => {
  it('/question → QUESTION_RECUE avec la question', () => {
    expect(convertirMessage('question', JSON.stringify(QUESTION))).toEqual({ type: 'QUESTION_RECUE', question: QUESTION })
  })

  it('/question avec choixMultiple et image : champs gardés', () => {
    const avecChamps = { ...QUESTION, choixMultiple: true, image: '/images/1.png' }
    expect(convertirMessage('question', JSON.stringify(avecChamps))).toEqual({ type: 'QUESTION_RECUE', question: avecChamps })
  })

  it('/etat avec etat = CLOTUREE → SEANCE_CLOTUREE', () => {
    const corps = JSON.stringify({ etat: 'CLOTUREE', position: 1, idQuestion: 1, echeance: null })
    expect(convertirMessage('etat', corps)).toEqual({ type: 'SEANCE_CLOTUREE' })
  })

  it('/user/queue/resultat → RESULTAT_RECU', () => {
    const resultat = { points: 875, scoreTotal: 1200, rang: 3, nombreParticipants: 24, evolution: 2 }
    expect(convertirMessage('resultat', JSON.stringify(resultat))).toEqual({ type: 'RESULTAT_RECU', resultat })
  })
})

describe('convertirMessage : message mal formé ignoré', () => {
  it.each([
    ['question', 'pas du JSON'],
    ['question', JSON.stringify({ ...QUESTION, idQuestion: 'deux' })],
    ['question', JSON.stringify({ ...QUESTION, type: 'INCONNU' })],
    ['question', JSON.stringify({ ...QUESTION, propositions: [{ libelle: 'sans id' }] })],
    ['etat', JSON.stringify({ position: 1 })],
    ['resultat', JSON.stringify({ points: 875 })],
  ] as const)('%s : %s → null', (canal, corps) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(convertirMessage(canal, corps)).toBeNull()
  })

  it('l\'avertissement ne contient pas le message (donnée personnelle possible)', () => {
    const avertir = vi.spyOn(console, 'warn').mockImplementation(() => {})
    convertirMessage('resultat', JSON.stringify({ pseudonyme: 'Zébulon' }))
    expect(avertir).toHaveBeenCalled()
    expect(JSON.stringify(avertir.mock.calls)).not.toContain('Zébulon')
  })
})

describe('convertirRefus (trame ERROR)', () => {
  it('JETON_INVALIDE → JETON_REFUSE', () => {
    expect(convertirRefus('JETON_INVALIDE')).toEqual({ type: 'JETON_REFUSE' })
  })

  it('autre erreur : null (la connexion sera retentée)', () => {
    expect(convertirRefus('Broker indisponible')).toBeNull()
  })
})
