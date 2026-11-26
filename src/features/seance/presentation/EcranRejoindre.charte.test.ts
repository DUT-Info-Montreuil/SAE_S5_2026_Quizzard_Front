// Charte (docs/charte-graphique.md §1 et §11) : couleurs de E7 par les variables de tokens.css seulement.
// Les tailles de touche (44 px) et la largeur de 360 px ne se testent pas ici : jsdom ne calcule pas la mise en page.
import { describe, expect, it } from 'vitest'
import css from './EcranRejoindre.css?raw'

describe('EcranRejoindre.css', () => {
  it('aucune couleur écrite en dur', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i)
  })
})
