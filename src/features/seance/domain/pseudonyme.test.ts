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

describe('pseudonyme (B5, d\'après la spec UC8 « Pseudonyme et jeton »)', () => {
  it('« é » composé et décomposé donnent le même pseudonyme et la même longueur', () => {
    const compose = nettoyerPseudonyme('Andr\u00e9')
    const decompose = nettoyerPseudonyme('Andre\u0301')
    expect(decompose).toBe(compose)
    expect(longueurPseudonyme(decompose)).toBe(5)
  })

  it('espaces au début, à la fin et multiples, ensemble', () => {
    expect(nettoyerPseudonyme('  Le   petit    prince  ')).toBe('Le petit prince')
  })

  it.each([
    ['chaîne vide', ''],
    ['un seul espace', ' '],
    ['seulement des espaces', '          '],
  ])('%s : invalide', (_cas, saisie) => {
    expect(pseudonymeValide(saisie)).toBe(false)
  })

  it('21 caractères bruts qui en font 20 après réduction des espaces : valide', () => {
    const saisie = `${'a'.repeat(9)}  ${'b'.repeat(10)}`
    expect([...saisie]).toHaveLength(21)
    expect(pseudonymeValide(saisie)).toBe(true)
  })

  it('emoji composé (famille, ZWJ) : compté en points de code, règle provisoire du plan (D8, K3)', () => {
    expect(longueurPseudonyme('\u{1F468}\u200D\u{1F469}\u200D\u{1F467}')).toBe(5)
  })
})
