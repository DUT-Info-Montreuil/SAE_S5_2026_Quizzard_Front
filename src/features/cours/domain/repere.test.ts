// Repère de texte : plan UC3, D10.
import { describe, expect, it } from 'vitest'
import { nettoyerRepere } from './repere.ts'

describe('nettoyerRepere', () => {
  it('espaces normalisés (sauts de ligne, tabulations, espaces multiples), bords retirés', () => {
    expect(nettoyerRepere('  Fin\n du\t\tcours   ', 3)).toBe('Fin du cours')
  })

  it('page vide ou blanche : undefined', () => {
    expect(nettoyerRepere('', 2)).toBeUndefined()
    expect(nettoyerRepere(' \n\t ', 0)).toBeUndefined()
  })

  it('numeroPage > 0 : les 300 derniers caractères', () => {
    const texte = `${'a'.repeat(50)}${'b'.repeat(300)}`
    expect(nettoyerRepere(texte, 4)).toBe('b'.repeat(300))
  })

  it('numeroPage 0 : les 300 premiers caractères (page 1)', () => {
    const texte = `${'a'.repeat(300)}${'b'.repeat(50)}`
    expect(nettoyerRepere(texte, 0)).toBe('a'.repeat(300))
  })

  it('texte court : gardé entier', () => {
    expect(nettoyerRepere('Introduction', 0)).toBe('Introduction')
  })

  it('ne coupe pas une paire de substitution, en fin (page 0) ni en début (page > 0)', () => {
    const emoji = '😀' // deux unités UTF-16
    const debut = nettoyerRepere(`${'a'.repeat(299)}${emoji}`, 0)
    expect(debut).toBe('a'.repeat(299))
    const fin = nettoyerRepere(`${emoji}${'a'.repeat(299)}`, 1)
    expect(fin).toBe('a'.repeat(299))
  })

  it('jamais plus de 300 unités UTF-16 (limite du back)', () => {
    expect(nettoyerRepere('😀'.repeat(400), 1)?.length).toBeLessThanOrEqual(300)
    expect(nettoyerRepere('😀'.repeat(400), 0)?.length).toBeLessThanOrEqual(300)
  })
})
