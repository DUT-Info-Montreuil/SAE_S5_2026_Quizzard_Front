// Stockage du jeton de participant : plan UC8, D2.
import { describe, expect, it, vi } from 'vitest'
import { enregistrerJeton, lireJeton, supprimerJeton } from './jetonParticipant.ts'

describe('jetonParticipant', () => {
  it('aller-retour : enregistrer, lire, supprimer', () => {
    expect(enregistrerJeton('AB12', 'jeton')).toBe(true)
    expect(lireJeton('AB12')).toBe('jeton')
    expect(sessionStorage.getItem('quizzard.jeton.AB12')).toBe('jeton')
    supprimerJeton('AB12')
    expect(lireJeton('AB12')).toBeNull()
  })

  it('une clé par code d\'accès', () => {
    enregistrerJeton('AB12', 'j1')
    enregistrerJeton('CD34', 'j2')
    supprimerJeton('AB12')
    expect(lireJeton('AB12')).toBeNull()
    expect(lireJeton('CD34')).toBe('j2')
  })

  it('stockage indisponible : rien ne plante', () => {
    const panne = () => { throw new DOMException('Bloqué', 'SecurityError') }
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(panne)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(panne)
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(panne)

    expect(enregistrerJeton('AB12', 'jeton')).toBe(false)
    expect(lireJeton('AB12')).toBeNull()
    expect(() => supprimerJeton('AB12')).not.toThrow()
  })
})
