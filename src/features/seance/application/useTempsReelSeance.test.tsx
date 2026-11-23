// Temps réel de l'étudiant : plan UC9, B6, §5 (coupure, bandeau, resynchronisation) ; charte §10 (réponse confirmée
// conservée). Faux service STOMP (`creerClientFactice`), faux client HTTP (`fetch` remplacé), faux timers.
import { act, renderHook } from '@testing-library/react'
import { StrictMode, useReducer } from 'react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { creerClientFactice } from '../../../shared/tempsReel/ClientTempsReelFactice.ts'
import type { EvenementFactice } from '../../../shared/tempsReel/ClientTempsReelFactice.ts'
import type { ClientTempsReel } from '../../../shared/tempsReel/ClientTempsReel.ts'
import { destinationsSeance } from '../api/destinationsSeance.ts'
import { lireEtat } from '../api/reponsesApi.ts'
import { ETAT_INITIAL, reducerReponse } from '../domain/machineReponse.ts'
import type { ActionReponse } from '../domain/machineReponse.ts'
import { useTempsReelSeance } from './useTempsReelSeance.ts'

const CODE = 'AB12'
const d = destinationsSeance(CODE)
const QUESTION = {
  idQuestion: 1,
  position: 1,
  type: 'QCM',
  enonce: 'Quelle structure garantit un accès en O(1) en moyenne ?',
  propositions: [{ idProposition: 11, libelle: 'Liste chaînée' }, { idProposition: 12, libelle: 'Table de hachage' }],
  dureeSec: 20,
  echeance: '2026-11-23T10:00:20Z',
}
const message = (delaiMs: number, destination: string, corps: unknown): EvenementFactice =>
  ({ delaiMs, type: 'message', destination, corps: JSON.stringify(corps) })

/** Faux `fetch` : `GET .../etat` renvoie la question en cours (`dejaRepondu` absent). */
function fauxFetchEtat(question: unknown = QUESTION) {
  const faux = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ question }), { status: 200 }))
  vi.stubGlobal('fetch', faux)
  return faux
}

/** Clients créés, avec leurs abonnements et leurs déconnexions. */
function espionner(scenario: EvenementFactice[]) {
  const clients: { abonnements: string[], deconnecte: boolean }[] = []
  const creerClient = (): ClientTempsReel => {
    const client = creerClientFactice(scenario)
    const suivi = { abonnements: [] as string[], deconnecte: false }
    clients.push(suivi)
    return {
      connecter: client.connecter,
      sAbonner(destination, rappel) {
        suivi.abonnements.push(destination)
        return client.sAbonner(destination, rappel)
      },
      deconnecter() {
        suivi.deconnecte = true
        client.deconnecter()
      },
    }
  }
  return { clients, creerClient }
}

function monter(scenario: EvenementFactice[], { strict = false } = {}) {
  const espion = espionner(scenario)
  const actions: ActionReponse[] = []
  const rendu = renderHook(
    () => {
      const [etat, dispatch] = useReducer(reducerReponse, ETAT_INITIAL)
      useTempsReelSeance({
        codeAcces: CODE,
        jetonParticipant: 'jeton',
        etat,
        dispatch: (action) => {
          actions.push(action)
          dispatch(action)
        },
        resynchroniser: async (signal) => {
          const { question, dejaRepondu } = await lireEtat(CODE, 'jeton', signal)
          return { question, dejaRepondu }
        },
        surRenvoi: () => true,
        creerClient: espion.creerClient,
      })
      return { etat, dispatch }
    },
    { wrapper: strict ? ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode> : undefined },
  )
  return { ...espion, actions, rendu }
}

const avancer = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const appelsEtat = (faux: ReturnType<typeof fauxFetchEtat>) =>
  faux.mock.calls.filter(([url]) => String(url).endsWith(`/api/public/sessions/${CODE}/etat`)).length

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useTempsReelSeance', () => {
  it('à la connexion : lecture de l\'état par REST, puis E8 sur la question en cours', async () => {
    const faux = fauxFetchEtat()
    const { rendu } = monter([])
    expect(rendu.result.current.etat.ecran.nom).toBe('CHARGEMENT')
    await avancer(200)
    expect(appelsEtat(faux)).toBe(1)
    expect(rendu.result.current.etat.ecran.nom).toBe('SAISIE')
  })

  it('chaque message du contrat donne son action', async () => {
    fauxFetchEtat(null)
    const resultat = { points: 875, scoreTotal: 1200, rang: 3, nombreParticipants: 24, evolution: 2 }
    const { actions } = monter([
      message(100, d.question, QUESTION),
      message(100, d.resultat, resultat),
      message(100, d.etat, { etat: 'CLOTUREE', position: 1, idQuestion: 1, echeance: null }),
    ])
    await avancer(1000)
    expect(actions.map((a) => a.type)).toEqual(['RESYNCHRONISEE', 'QUESTION_RECUE', 'RESULTAT_RECU', 'SEANCE_CLOTUREE'])
  })

  it('message mal formé : ignoré, l\'écran ne change pas', async () => {
    fauxFetchEtat(null)
    const { actions, rendu } = monter([message(100, d.question, { idQuestion: 'deux' })])
    await avancer(1000)
    expect(actions.map((a) => a.type)).toEqual(['RESYNCHRONISEE'])
    expect(rendu.result.current.etat.ecran.nom).toBe('ATTENTE')
  })

  it('coupure → bandeau → reconnexion → resynchronisation par REST', async () => {
    const faux = fauxFetchEtat()
    const { rendu } = monter([
      { delaiMs: 1000, type: 'coupure' },
      { delaiMs: 3000, type: 'reconnexion' },
    ])
    await avancer(500)
    expect(appelsEtat(faux)).toBe(1)

    await avancer(1000)
    expect(rendu.result.current.etat.connexionPerdue).toBe(true)
    expect(appelsEtat(faux)).toBe(1)

    await avancer(3000)
    expect(rendu.result.current.etat.connexionPerdue).toBe(false)
    expect(appelsEtat(faux)).toBe(2)
    expect(rendu.result.current.etat.ecran.nom).toBe('SAISIE')
  })

  it('une réponse confirmée reste confirmée après une coupure', async () => {
    fauxFetchEtat()
    const { rendu } = monter([
      { delaiMs: 1000, type: 'coupure' },
      { delaiMs: 1000, type: 'reconnexion' },
    ])
    await avancer(500)
    act(() => {
      rendu.result.current.dispatch({ type: 'VALIDER', saisie: { type: 'QCM', propositions: [12] }, resteDuTemps: true })
      rendu.result.current.dispatch({ type: 'ENVOI_REUSSI' })
    })
    expect(rendu.result.current.etat.ecran.nom).toBe('CONFIRMEE')

    await avancer(3000)
    expect(rendu.result.current.etat.ecran).toEqual({ nom: 'CONFIRMEE', idQuestion: 1 })
  })

  it('CHARGEMENT avec STOMP connecté (renvoi échoué) : l\'état est relu sans attendre de reconnexion', async () => {
    const faux = fauxFetchEtat()
    const { rendu } = monter([])
    await avancer(500)
    expect(appelsEtat(faux)).toBe(1)

    act(() => {
      rendu.result.current.dispatch({ type: 'VALIDER', saisie: { type: 'QCM', propositions: [12] }, resteDuTemps: true })
      rendu.result.current.dispatch({ type: 'ECHEC_RESEAU', resteDuTemps: true })
      rendu.result.current.dispatch({ type: 'ECHEC_RESEAU', resteDuTemps: true })
    })
    expect(rendu.result.current.etat.ecran.nom).toBe('CHARGEMENT')

    await avancer(100)
    expect(appelsEtat(faux)).toBe(2)
    expect(rendu.result.current.etat.ecran.nom).toBe('SAISIE')
  })

  it('aucun double abonnement (StrictMode) : un seul client ouvert, une fois par destination', async () => {
    fauxFetchEtat(null)
    const { clients, actions } = monter([message(100, d.question, QUESTION)], { strict: true })
    await avancer(1000)

    const ouverts = clients.filter((c) => !c.deconnecte)
    expect(ouverts).toHaveLength(1)
    expect([...ouverts[0].abonnements].sort()).toEqual(Object.values(d).sort())
    expect(actions.filter((a) => a.type === 'QUESTION_RECUE')).toHaveLength(1)
  })

  it('JETON_INVALIDE : SESSION_EXPIREE et arrêt définitif du client', async () => {
    fauxFetchEtat(null)
    const { clients, actions, rendu } = monter([
      { delaiMs: 100, type: 'refus', message: 'JETON_INVALIDE' },
      { delaiMs: 100, type: 'reconnexion' },
      message(100, d.question, QUESTION),
    ])
    await avancer(2000)

    expect(rendu.result.current.etat.ecran.nom).toBe('SESSION_EXPIREE')
    expect(clients.every((c) => c.deconnecte)).toBe(true)
    expect(actions.map((a) => a.type)).toEqual(['RESYNCHRONISEE', 'JETON_REFUSE'])
  })
})
