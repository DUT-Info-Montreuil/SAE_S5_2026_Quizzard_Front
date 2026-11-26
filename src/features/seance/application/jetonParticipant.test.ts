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

describe('jetonParticipant (B5)', () => {
  it('enregistrer remplace le jeton du même code', () => {
    enregistrerJeton('AB12', 'ancien')
    enregistrerJeton('AB12', 'nouveau')
    expect(lireJeton('AB12')).toBe('nouveau')
  })

  it('des codes proches ne se mélangent pas', () => {
    enregistrerJeton('AB', 'j1')
    enregistrerJeton('AB.12', 'j2')
    enregistrerJeton('AB/12', 'j3')
    supprimerJeton('AB.12')
    expect(lireJeton('AB')).toBe('j1')
    expect(lireJeton('AB.12')).toBeNull()
    expect(lireJeton('AB/12')).toBe('j3')
  })

  it('stockage plein à l\'écriture : false, sans erreur levée, rien de gardé', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Plein', 'QuotaExceededError')
    })
    expect(() => enregistrerJeton('AB12', 'jeton')).not.toThrow()
    expect(enregistrerJeton('AB12', 'jeton')).toBe(false)
    expect(lireJeton('AB12')).toBeNull()
  })
})
