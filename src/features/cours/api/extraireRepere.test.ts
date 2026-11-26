// Extraction du repère (plan UC3, D10 et B3). Faux document : PDF.js ne tourne pas sous jsdom.
import { describe, expect, it, vi } from 'vitest'
import type { DocumentPdf } from '../../../shared/pdf/documentPdf.ts'
import { extraireRepere } from './extraireRepere.ts'

function fauxDocument(lireTextePage: DocumentPdf['lireTextePage']): DocumentPdf {
  return { nbPages: 12, rendrePage: vi.fn(), lireTextePage: vi.fn(lireTextePage), fermer: vi.fn() }
}

describe('extraireRepere', () => {
  it('lit la page numeroPage et nettoie le texte (fin de page)', async () => {
    const document = fauxDocument(async () => `  ${'a'.repeat(400)}\n fin   de page `)
    const repere = await extraireRepere(document, 4)
    expect(document.lireTextePage).toHaveBeenCalledWith(4)
    expect(repere).toHaveLength(300)
    expect(repere?.endsWith('a fin de page')).toBe(true)
  })

  it('numeroPage 0 : texte de la page 1, début de page', async () => {
    const document = fauxDocument(async () => `Début du cours ${'b'.repeat(400)}`)
    const repere = await extraireRepere(document, 0)
    expect(document.lireTextePage).toHaveBeenCalledWith(1)
    expect(repere?.startsWith('Début du cours')).toBe(true)
  })

  it('page sans texte → undefined', async () => {
    await expect(extraireRepere(fauxDocument(async () => '   '), 2)).resolves.toBeUndefined()
  })

  it('extraction en échec → undefined, sans erreur levée', async () => {
    const document = fauxDocument(async () => {
      throw new Error('PDF.js en panne')
    })
    await expect(extraireRepere(document, 2)).resolves.toBeUndefined()
  })
})
