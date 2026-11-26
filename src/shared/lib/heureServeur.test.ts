// Heure du serveur et décompte : plan UC9, D9, D11, D12 ; CLAUDE.md, règle 5.
import { describe, expect, it, vi } from 'vitest'
import { ecartAvecServeur, lireInstantServeur, tempsRestantMs } from './heureServeur.ts'

const INSTANT = Date.UTC(2026, 10, 23, 10, 0, 0) // 23/11/2026 10:00:00 UTC

describe('lireInstantServeur (D11)', () => {
  it('lit un instant avec Z', () => {
    expect(lireInstantServeur('2026-11-23T10:00:00Z')).toBe(INSTANT)
  })

  it('lit un instant avec décalage : +01:00 donne le même instant que l\'heure UTC correspondante', () => {
    expect(lireInstantServeur('2026-11-23T11:00:00+01:00')).toBe(INSTANT)
    expect(lireInstantServeur('2026-11-23T06:30:00-03:30')).toBe(INSTANT)
  })

  it('garde les millisecondes', () => {
    expect(lireInstantServeur('2026-11-23T10:00:00.250Z')).toBe(INSTANT + 250)
  })

  it('un nombre est déjà en millisecondes', () => {
    expect(lireInstantServeur(INSTANT)).toBe(INSTANT)
  })

  it.each([
    ['sans fuseau (pas de fuseau inventé)', '2026-11-23T10:00:00'],
    ['texte illisible', 'demain matin'],
    ['date qui n\'existe pas', '2026-02-31T10:00:00Z'],
    ['heure impossible', '2026-11-23T25:00:00Z'],
  ])('%s : null', (_cas, texte) => {
    expect(lireInstantServeur(texte)).toBeNull()
  })

  it('nombre non fini : null', () => {
    expect(lireInstantServeur(Number.NaN)).toBeNull()
  })
})

describe('horloge de l\'appareil en retard de 10 s sur le serveur', () => {
  // L'appareil lit 10:00:00 quand le serveur est à 10:00:10.
  const enTeteDate = new Date(INSTANT + 10_000).toUTCString()
  const ecart = ecartAvecServeur(enTeteDate, INSTANT)

  it('l\'écart vaut 10 s, à ±0,5 s près (en-tête Date à la seconde)', () => {
    expect(ecart).not.toBeNull()
    expect(Math.abs((ecart ?? 0) - 10_000)).toBeLessThanOrEqual(500)
  })

  it('le temps restant suit l\'heure du serveur, pas celle de l\'appareil', () => {
    // Échéance à 10:00:30 (heure du serveur) : il reste 20 s, et non 30 s comme le croirait l'appareil.
    const restant = tempsRestantMs(INSTANT + 30_000, ecart ?? 0, INSTANT)
    expect(restant).toBeGreaterThanOrEqual(19_500)
    expect(restant).toBeLessThanOrEqual(20_000)
  })

  it('le temps restant n\'est jamais négatif', () => {
    expect(tempsRestantMs(INSTANT, ecart ?? 0, INSTANT + 60_000)).toBe(0)
  })
})

describe('en-tête Date absent ou illisible (D12)', () => {
  it('écart null', () => {
    expect(ecartAvecServeur(null, INSTANT)).toBeNull()
    expect(ecartAvecServeur('pas une date', INSTANT)).toBeNull()
  })

  it('avertit en développement, une seule fois', async () => {
    vi.resetModules()
    const avertir = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const module = await import('./heureServeur.ts')
    module.ecartAvecServeur(null, INSTANT)
    module.ecartAvecServeur(null, INSTANT)
    expect(import.meta.env.DEV).toBe(true)
    expect(avertir).toHaveBeenCalledTimes(1)
  })
})
