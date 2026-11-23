// Parcours E8 → E9 assemblé (plan UC9, B7 ; critères d'acceptation §8) : un seul envoi par question, nouvelle
// question remise à zéro. Faux service STOMP, faux client HTTP (`fetch` remplacé), faux timers.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { creerClientFactice } from '../../../shared/tempsReel/ClientTempsReelFactice.ts'
import type { EvenementFactice } from '../../../shared/tempsReel/ClientTempsReelFactice.ts'
import { destinationsSeance } from '../api/destinationsSeance.ts'
import { PageQuestion } from './PageQuestion.tsx'

const CODE = 'AB12'
const d = destinationsSeance(CODE)
const DEBUT = Date.UTC(2026, 10, 23, 10, 0, 0)
const iso = (ms: number) => new Date(ms).toISOString()

const question = (idQuestion: number, enonce: string, echeanceMs: number) => ({
  idQuestion,
  position: idQuestion,
  type: 'QCM',
  enonce,
  propositions: [{ idProposition: idQuestion * 10 + 1, libelle: 'Oui' }, { idProposition: idQuestion * 10 + 2, libelle: 'Non' }],
  dureeSec: 20,
  echeance: iso(echeanceMs),
})
const message = (delaiMs: number, destination: string, corps: unknown): EvenementFactice =>
  ({ delaiMs, type: 'message', destination, corps: JSON.stringify(corps) })

/** Faux back : `GET .../etat` (aucune question) et `POST .../reponses` (201 après `delaiMs`). Date du serveur = appareil. */
function fauxBack(delaiMs = 300) {
  const faux = vi.fn<typeof fetch>(async (url, options) => {
    const enTetes = { Date: new Date(Date.now()).toUTCString() }
    if (String(url).endsWith('/etat')) return new Response(JSON.stringify({ question: null }), { status: 200, headers: enTetes })
    await new Promise((fin) => setTimeout(fin, delaiMs))
    return new Response(JSON.stringify({ idQuestion: JSON.parse(String(options?.body)).idQuestion }), {
      status: 201,
      headers: enTetes,
    })
  })
  vi.stubGlobal('fetch', faux)
  return faux
}

const envois = (faux: ReturnType<typeof fauxBack>) =>
  faux.mock.calls.filter(([url, options]) => String(url).endsWith('/reponses') && options?.method === 'POST')

function monter(scenario: EvenementFactice[]) {
  render(
    <StrictMode>
      <PageQuestion
        codeAcces={CODE}
        jetonParticipant="jeton"
        creerClient={() => creerClientFactice(scenario)}
        onRejoindre={() => {}}
      />
    </StrictMode>,
  )
}

const avancer = async (ms: number) => {
  await act(() => vi.advanceTimersByTimeAsync(ms))
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false })
  vi.setSystemTime(DEBUT)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('PageQuestion', () => {
  it('chargement, puis E8 à la réception de la question', async () => {
    fauxBack()
    monter([message(500, d.question, question(1, 'Première question ?', DEBUT + 20_600))])
    expect(screen.getByRole('status')).toBeInTheDocument()
    await avancer(1000)
    expect(screen.getByRole('heading', { name: 'Première question ?' })).toBeInTheDocument()
  })

  it('un double clic sur Valider n\'envoie qu\'une requête, puis « Réponse enregistrée »', async () => {
    const faux = fauxBack()
    monter([message(500, d.question, question(1, 'Première question ?', DEBUT + 20_600))])
    await avancer(1000)

    // fireEvent plutôt que user-event : user-event attend de vrais délais, bloqués par les faux timers.
    fireEvent.click(screen.getByText('Oui'))
    const bouton = screen.getByRole('button', { name: 'Valider ma réponse' })
    fireEvent.click(bouton)
    fireEvent.click(bouton)
    await avancer(1000)

    expect(envois(faux)).toHaveLength(1)
    expect(JSON.parse(String(envois(faux)[0][1]?.body))).toStrictEqual({ idQuestion: 1, idPropositions: [11] })
    expect(screen.getByText('Réponse enregistrée')).toBeInTheDocument()
  })

  it('à 0 s sans réponse : E9, temps écoulé', async () => {
    fauxBack()
    monter([message(500, d.question, question(1, 'Première question ?', DEBUT + 20_600))])
    await avancer(1000)
    // Une seconde à la fois : sous act(), React n'affiche qu'à la fin de chaque avancée, et le décompte reprogramme
    // son réveil à chaque affichage.
    for (let i = 0; i < 22; i++) await avancer(1000)
    expect(screen.getByText(/temps écoulé/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Valider ma réponse' })).not.toBeInTheDocument()
  })

  describe('coupures (D14, charte §10)', () => {
    const QUESTION_OUVERTE = question(1, 'Première question ?', DEBUT + 20_600)
    const RESULTAT = { points: 820, scoreTotal: 820, rang: 3, nombreParticipants: 24, evolution: 2 }
    const reponseJson = (corps: unknown, status: number) =>
      new Response(JSON.stringify(corps), { status, headers: { Date: new Date(Date.now()).toUTCString() } })
    const panne = () => Promise.reject(new TypeError('Failed to fetch'))
    const lectures = (faux: ReturnType<typeof fauxBackSurMesure>) =>
      faux.mock.calls.filter(([url]) => String(url).endsWith('/etat')).length

    /** `lireEtat(n)` répond au n-ième `GET .../etat`, `poster()` à chaque `POST .../reponses`. */
    function fauxBackSurMesure(lireEtat: (n: number) => Promise<Response>, poster: () => Promise<Response>) {
      let n = 0
      const faux = vi.fn<typeof fetch>(async (url) => (String(url).endsWith('/etat') ? lireEtat(++n) : poster()))
      vi.stubGlobal('fetch', faux)
      return faux
    }

    async function choisirEtValider() {
      fireEvent.click(screen.getByText('Oui'))
      fireEvent.click(screen.getByRole('button', { name: 'Valider ma réponse' }))
    }

    it('deux pannes réseau avec STOMP connecté : un seul renvoi, puis le résultat s\'affiche', async () => {
      // Le réseau HTTP tombe après la première lecture de l'état ; STOMP reste connecté.
      const faux = fauxBackSurMesure(
        (n) => (n === 1 ? Promise.resolve(reponseJson({ question: QUESTION_OUVERTE }, 200)) : panne()),
        panne,
      )
      monter([message(25_000, d.resultat, RESULTAT)])
      await avancer(500)
      await choisirEtValider()
      await avancer(1000)

      expect(envois(faux)).toHaveLength(2)
      expect(lectures(faux)).toBe(2)
      expect(screen.queryByRole('button', { name: 'Valider ma réponse' })).not.toBeInTheDocument()

      for (let i = 0; i < 25; i++) await avancer(1000)
      expect(screen.getByText(/\+\s?820 pts/)).toBeInTheDocument()
      expect(envois(faux)).toHaveLength(2)
    })

    it('reconnexion STOMP pendant l\'envoi : un seul envoi, la réponse reste confirmée', async () => {
      const faux = fauxBackSurMesure(
        () => Promise.resolve(reponseJson({ question: QUESTION_OUVERTE }, 200)),
        async () => {
          await new Promise((fin) => setTimeout(fin, 2000))
          return reponseJson({ idQuestion: 1 }, 201)
        },
      )
      monter([{ delaiMs: 1000, type: 'coupure' }, { delaiMs: 200, type: 'reconnexion' }])
      await avancer(500)
      await choisirEtValider()
      await avancer(1000)

      // Reconnecté et état relu pendant que le POST est en cours : E8 reste en envoi.
      expect(lectures(faux)).toBe(2)
      expect(screen.getByRole('button', { name: 'Valider ma réponse' })).toBeDisabled()

      await avancer(2000)
      expect(screen.getByText('Réponse enregistrée')).toBeInTheDocument()
      expect(envois(faux)).toHaveLength(1)
    })

    it('le résultat reste affiché après une coupure', async () => {
      const faux = fauxBackSurMesure(
        () => Promise.resolve(reponseJson({ question: null }, 200)),
        () => Promise.resolve(reponseJson({ idQuestion: 1 }, 201)),
      )
      monter([
        message(100, d.question, QUESTION_OUVERTE),
        message(2000, d.resultat, RESULTAT),
        { delaiMs: 1000, type: 'coupure' },
        { delaiMs: 500, type: 'reconnexion' },
      ])
      await avancer(500)
      await choisirEtValider()
      await avancer(2500)
      expect(screen.getByText(/\+\s?820 pts/)).toBeInTheDocument()

      await avancer(2000)
      expect(lectures(faux)).toBe(2)
      expect(screen.getByText(/\+\s?820 pts/)).toBeInTheDocument()
    })
  })

  it('une nouvelle question ramène sur E8, remis à zéro', async () => {
    fauxBack()
    monter([
      message(500, d.question, question(1, 'Première question ?', DEBUT + 20_600)),
      message(5000, d.question, question(2, 'Deuxième question ?', DEBUT + 25_600)),
    ])
    await avancer(1000)

    fireEvent.click(screen.getByText('Oui'))
    fireEvent.click(screen.getByRole('button', { name: 'Valider ma réponse' }))
    await avancer(1000)
    expect(screen.getByText('Réponse enregistrée')).toBeInTheDocument()

    await avancer(5000)
    expect(screen.getByRole('heading', { name: 'Deuxième question ?' })).toBeInTheDocument()
    for (const option of screen.getAllByRole('radio')) expect(option).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Valider ma réponse' })).toBeDisabled()
  })
})
