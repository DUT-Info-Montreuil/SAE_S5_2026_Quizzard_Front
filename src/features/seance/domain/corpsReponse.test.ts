// Corps de la requête : plan UC9, §3 et D16 (`idPropositions`, `liens`, `texteLibre`, ni horodatage ni idParticipant).
import { describe, expect, it } from 'vitest'
import { questionARelier, questionLibre, questionQcm } from '../../../test/fabriques.ts'
import { corpsReponse } from './corpsReponse.ts'

describe('corpsReponse', () => {
  it('QCM : {idQuestion, idPropositions} seulement', () => {
    expect(corpsReponse(questionQcm(), { type: 'QCM', propositions: [12] })).toStrictEqual({
      idQuestion: 1,
      idPropositions: [12],
    })
  })

  it('points à relier : {idQuestion, liens} seulement', () => {
    const liens = [{ gauche: 1, droite: 101 }, { gauche: 2, droite: 102 }]
    expect(corpsReponse(questionARelier(), { type: 'POINTS_A_RELIER', liens })).toStrictEqual({ idQuestion: 2, liens })
  })

  it('réponse libre : {idQuestion, texteLibre} seulement', () => {
    expect(corpsReponse(questionLibre(), { type: 'REPONSE_LIBRE', texte: 'HyperText' })).toStrictEqual({
      idQuestion: 3,
      texteLibre: 'HyperText',
    })
  })

  it('aucun horodatage, idParticipant ni requestId', () => {
    const corps = corpsReponse(questionQcm(), { type: 'QCM', propositions: [12] })
    for (const cle of Object.keys(corps ?? {})) {
      expect(cle).not.toMatch(/horodatage|date|heure|timestamp|idParticipant|requestId/i)
    }
  })

  it('saisie d\'un autre type : null', () => {
    expect(corpsReponse(questionQcm(), { type: 'REPONSE_LIBRE', texte: 'x' })).toBeNull()
  })
})
