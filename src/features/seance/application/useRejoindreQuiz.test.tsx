// Assemblage de E7 : plan UC8, B2, D12 et D13. Fausse API, aucun serveur.
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErreurHttp } from '../../../shared/http/ErreurHttp.ts'
import type { ResultatConsultation, ResultatRejoindre } from '../api/rejoindreApi.ts'
import { lireJeton } from './jetonParticipant.ts'
import { useRejoindreQuiz } from './useRejoindreQuiz.ts'
import type { ApiRejoindre } from './useRejoindreQuiz.ts'

const SESSION = { titreCours: 'Réseaux', titreQuiz: 'Quiz 1', estNotee: false }

function fausseApi(
  consultation: ResultatConsultation = { resultat: 'OUVERTE', session: SESSION },
  entree: () => Promise<ResultatRejoindre> = async () => ({ resultat: 'REJOINT', jeton: 'jeton-secret' }),
) {
  return {
    consulterSession: vi.fn<ApiRejoindre['consulterSession']>(async () => consultation),
    rejoindreSession: vi.fn<ApiRejoindre['rejoindreSession']>(entree),
  }
}

async function monter(api: ApiRejoindre, onRejoint = vi.fn()) {
  const rendu = renderHook(() => useRejoindreQuiz({ codeAcces: 'AB12', onRejoint, api }))
  await waitFor(() => expect(rendu.result.current.ecran.nom).not.toBe('CHARGEMENT'))
  return { ...rendu, onRejoint }
}

describe('useRejoindreQuiz', () => {
  it('charge le quiz au montage', async () => {
    const api = fausseApi()
    const { result } = await monter(api)
    expect(api.consulterSession).toHaveBeenCalledWith('AB12', expect.any(AbortSignal))
    expect(result.current.ecran).toMatchObject({ nom: 'FORMULAIRE', session: SESSION })
    expect(result.current.peutEntrer).toBe(false)
  })

  it('chargement refusé (404) : INTROUVABLE', async () => {
    const { result } = await monter(fausseApi({ resultat: 'REFUSEE', erreur: new ErreurHttp(404, null) }))
    expect(result.current.ecran.nom).toBe('INTROUVABLE')
  })

  it('corps mal formé au chargement : ECHEC_CHARGEMENT', async () => {
    const api = fausseApi()
    api.consulterSession.mockRejectedValue(new Error('Quiz mal formé.'))
    const { result } = await monter(api)
    expect(result.current.ecran.nom).toBe('ECHEC_CHARGEMENT')
  })

  it('pseudonyme invalide : aucune requête', async () => {
    const api = fausseApi()
    const { result } = await monter(api)
    act(() => result.current.changerSaisie(' a '))
    act(() => result.current.entrer())
    expect(api.rejoindreSession).not.toHaveBeenCalled()
    expect(result.current.ecran).toMatchObject({ erreur: 'Ton pseudonyme doit faire de 2 à 20 caractères.' })
  })

  it('succès : un seul POST, jeton gardé, puis onRejoint', async () => {
    const api = fausseApi()
    const { result, onRejoint } = await monter(api)
    act(() => result.current.changerSaisie('Alice'))
    act(() => {
      result.current.entrer()
      result.current.entrer()
    })
    expect(result.current.peutEntrer).toBe(false)
    await waitFor(() => expect(onRejoint).toHaveBeenCalledTimes(1))
    expect(api.rejoindreSession).toHaveBeenCalledTimes(1)
    expect(api.rejoindreSession).toHaveBeenCalledWith('AB12', 'Alice')
    expect(lireJeton('AB12')).toBe('jeton-secret')
  })

  it('409 avec suggestion : message et suggestion, puis clic sur la suggestion', async () => {
    const erreur = new ErreurHttp(409, { error: 'x', request_id: null, suggestion: 'Alice2' })
    const { result, onRejoint } = await monter(fausseApi(undefined, async () => ({ resultat: 'REFUSEE', erreur })))
    act(() => result.current.changerSaisie('Alice'))
    act(() => result.current.entrer())
    await waitFor(() => expect(result.current.ecran).toMatchObject({ envoi: false, suggestion: 'Alice2' }))
    act(() => result.current.choisirSuggestion())
    expect(result.current.ecran).toMatchObject({ saisie: 'Alice2', suggestion: null, erreur: null })
    expect(onRejoint).not.toHaveBeenCalled()
  })

  it('jeton impossible à garder : formulaire et message provisoire, pas de navigation', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Plein', 'QuotaExceededError') })
    const { result, onRejoint } = await monter(fausseApi())
    act(() => result.current.changerSaisie('Alice'))
    act(() => result.current.entrer())
    await waitFor(() => expect(result.current.ecran).toMatchObject({
      envoi: false, erreur: 'Une erreur est survenue. Réessayez dans un instant.',
    }))
    expect(onRejoint).not.toHaveBeenCalled()
  })

  it('panne réseau : formulaire, et un nouvel essai refait un POST', async () => {
    const api = fausseApi(undefined, async () => ({ resultat: 'ECHEC_RESEAU' }))
    const { result } = await monter(api)
    act(() => result.current.changerSaisie('Alice'))
    act(() => result.current.entrer())
    await waitFor(() => expect(result.current.ecran).toMatchObject({ envoi: false }))
    act(() => result.current.entrer())
    await waitFor(() => expect(api.rejoindreSession).toHaveBeenCalledTimes(2))
  })

  it('rien dans la console (ni pseudonyme ni jeton)', async () => {
    const espions = (['log', 'info', 'warn', 'error', 'debug'] as const).map((n) => vi.spyOn(console, n))
    const { result, onRejoint } = await monter(fausseApi())
    act(() => result.current.changerSaisie('Alice'))
    act(() => result.current.entrer())
    await waitFor(() => expect(onRejoint).toHaveBeenCalled())
    for (const espion of espions) expect(espion).not.toHaveBeenCalled()
  })
})
