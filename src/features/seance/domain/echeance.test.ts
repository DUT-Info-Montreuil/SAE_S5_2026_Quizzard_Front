// Échéance d'une question avec repli : plan UC9, D11 et D12.
import { describe, expect, it } from 'vitest'
import { questionQcm } from '../../../test/fabriques.ts'
import { echeanceQuestion } from './echeance.ts'

const RECUE_A = Date.UTC(2026, 10, 23, 10, 0, 5)

describe('echeanceQuestion', () => {
  it('échéance lisible et écart connu : échéance du serveur, sans repli', () => {
    const question = questionQcm({ echeance: '2026-11-23T10:00:20Z', dureeSec: 20 })
    expect(echeanceQuestion(question, 10_000, RECUE_A)).toEqual({
      echeanceMs: Date.UTC(2026, 10, 23, 10, 0, 20),
      ecartMs: 10_000,
      repli: false,
    })
  })

  it('en-tête Date absent (écart null) : réception + dureeSec, horloge de l\'appareil', () => {
    const question = questionQcm({ echeance: '2026-11-23T10:00:20Z', dureeSec: 20 })
    expect(echeanceQuestion(question, null, RECUE_A)).toEqual({ echeanceMs: RECUE_A + 20_000, ecartMs: 0, repli: true })
  })

  it('échéance sans fuseau : réception + dureeSec', () => {
    const question = questionQcm({ echeance: '2026-11-23T10:00:20', dureeSec: 30 })
    expect(echeanceQuestion(question, 10_000, RECUE_A)).toEqual({ echeanceMs: RECUE_A + 30_000, ecartMs: 0, repli: true })
  })
})
