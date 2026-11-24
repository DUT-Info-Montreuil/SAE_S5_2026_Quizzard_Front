// Pseudonyme : UC8, « Services fonctionnels » ; plan UC8, D8.
import { describe, expect, it } from 'vitest'
import { longueurPseudonyme, nettoyerPseudonyme, pseudonymeValide } from './pseudonyme.ts'

describe('nettoyerPseudonyme', () => {
  it('retire les espaces de début et de fin', () => {
    expect(nettoyerPseudonyme('   Alice  ')).toBe('Alice')
  })

  it('réduit les espaces multiples à un seul', () => {
    expect(nettoyerPseudonyme('Alice   du\t\tSud')).toBe('Alice du Sud')
  })

  it('normalise en NFC', () => {
    expect(nettoyerPseudonyme('René')).toBe('René')
  })
})

describe('pseudonymeValide', () => {
  it.each([
    ['1 caractère', 'a', false],
    ['2 caractères', 'ab', true],
    ['20 caractères', 'a'.repeat(20), true],
    ['21 caractères', 'a'.repeat(21), false],
    ['vide après nettoyage', '    ', false],
    ['20 caractères entourés d\'espaces', `   ${'a'.repeat(20)}   `, true],
    ['caractère de contrôle', 'Al\u0007ice', false],
    ['caractère nul', 'Al\u0000ice', false],
  ])('%s', (_cas, saisie, attendu) => {
    expect(pseudonymeValide(saisie)).toBe(attendu)
  })

  it('compte un emoji comme un seul caractère', () => {
    expect(longueurPseudonyme('😀')).toBe(1)
    expect(pseudonymeValide('😀'.repeat(20))).toBe(true)
    expect(pseudonymeValide('😀'.repeat(21))).toBe(false)
  })

  it('compte « e » suivi d\'un accent combinant comme un caractère, après NFC', () => {
    expect(pseudonymeValide('é'.repeat(20))).toBe(true)
  })

  it('accepte une tabulation, transformée en espace par le nettoyage', () => {
    expect(pseudonymeValide('Al\tice')).toBe(true)
  })
})
