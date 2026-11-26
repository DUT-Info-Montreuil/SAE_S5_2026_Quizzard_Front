import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ClientTempsReel, EcouteursConnexion } from '../../../shared/tempsReel/ClientTempsReel.ts'
import {
  backSimule, correctionJson, erreurJson, etatJson, etatQuestionOuverteJson, questionJson, reponseJson,
} from '../../../test/fabriquesAnimation.ts'
import { EcranQuizEnCours } from './EcranQuizEnCours.tsx'

/** Client temps réel piloté par le test. */
function clientPilote() {
  const rappels = new Map<string, (corps: string) => void>()
  let ecouteurs: EcouteursConnexion | undefined
  const deconnecter = vi.fn()
  const client: ClientTempsReel = {
    connecter: (_, e) => {
      ecouteurs = e
    },
    sAbonner: (destination, rappel) => {
      rappels.set(destination, rappel)
      return () => rappels.delete(destination)
    },
    deconnecter,
  }
  return {
    creerClient: () => client,
    deconnecter,
    destinations: () => [...rappels.keys()],
    connecter: async (reconnexion = false) => {
      // L'effet STOMP part après le rendu qui donne le code d'accès : attendre qu'il ait appelé connecter().
      await waitFor(() => expect(ecouteurs).toBeDefined())
      await act(async () => ecouteurs!.connecte(reconnexion))
    },
    couper: () => act(async () => ecouteurs!.coupe()),
    recevoir: (canal: string, corps: object) =>
      act(async () => rappels.get(`/topic/sessions/code-acces/${canal}`)!(JSON.stringify(corps))),
  }
}

async function afficher(repondre: Parameters<typeof backSimule>[0], connecte = true) {
  const requetes = backSimule(repondre)
  const stomp = clientPilote()
  const onQuitter = vi.fn()
  const onNonConnecte = vi.fn()
  render(
    <EcranQuizEnCours
      idSession={7} creerClient={stomp.creerClient} onQuitter={onQuitter} onNonConnecte={onNonConnecte}
    />,
  )
  if (connecte) {
    await screen.findByRole('heading', { level: 1 })
    await stomp.connecter()
  }
  return { requetes, stomp, onQuitter, onNonConnecte }
}

describe('E5 « Quiz en cours »', () => {
  it('affiche le QR code, le lien et les connectés avant la première question', async () => {
    const { stomp } = await afficher(() => reponseJson(etatJson()))
    expect(screen.getByRole('img', { name: /QR code/ })).toHaveAttribute('src', 'data:image/png;base64,iVBORw0KGgo=')
    expect(screen.getByText('http://localhost:5173/rejoindre/code-acces')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Démarrer' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Clore' })).toBeDisabled()
    expect(stomp.destinations()).toEqual(
      ['etat', 'question', 'correction', 'repartition', 'connectes'].map((c) => `/topic/sessions/code-acces/${c}`))
    await stomp.recevoir('connectes', { nombre: 12 })
    expect(screen.getByText('12')).toBeVisible()
  })

  it('déroule le quiz : démarrer, réponses en direct, clôture automatique, suivant, fin', async () => {
    let position = 0
    const { requetes, stomp, onQuitter } = await afficher((r) => {
      if (r.endsWith('/questions/suivante')) position++
      return reponseJson(position === 0
        ? etatJson()
        : etatQuestionOuverteJson({ position, question: questionJson({ idQuestion: 11 + position, position }) }))
    })

    await userEvent.click(screen.getByRole('button', { name: 'Démarrer' }))
    expect(requetes).toContain('POST /api/sessions/7/questions/suivante')
    expect(await screen.findByRole('timer')).toHaveTextContent('0:15')
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled()
    expect(screen.queryByText(/Bonne réponse/)).toBeNull()

    await stomp.recevoir('repartition', { idQuestion: 12, total: 2, propositions: [{ idProposition: 41, nombre: 2 }] })
    expect(screen.getByRole('img', { name: 'Réponses A : 2' })).toBeVisible()
    expect(screen.getByRole('img', { name: 'Réponses B : 0' })).toBeVisible()

    await stomp.recevoir('correction', correctionJson())
    expect(screen.queryByRole('timer')).toBeNull()
    expect(screen.getByText('✓ Bonne réponse')).toBeVisible()
    expect(screen.getByRole('img', { name: 'Réponses A : 7' })).toBeVisible()


    await userEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(await screen.findByText('Question 2 / 2')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Terminer' })).toBeDisabled()

    await stomp.recevoir('etat', { etat: 'CLOTUREE', position: 2, idQuestion: null, echeance: null })
    expect(screen.getByText(/La séance est terminée/)).toBeVisible()
    expect(screen.queryByRole('img', { name: /QR code/ })).toBeNull()
    expect(stomp.deconnecter).toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: "Retour à l'éditeur" }))
    expect(onQuitter).toHaveBeenCalledOnce()
  })

  it('passage automatique : la question suivante arrive sans action', async () => {
    const { stomp } = await afficher(() => reponseJson(etatQuestionOuverteJson()))
    await stomp.recevoir('question', questionJson({ idQuestion: 13, position: 2, type: 'REPONSE_LIBRE', enonce: 'Libre ?' }))
    expect(screen.getByRole('heading', { name: 'Libre ?' })).toBeVisible()
  })

  it('clore la question affiche la correction renvoyée', async () => {
    const { requetes } = await afficher((r) => reponseJson(r.startsWith('POST')
      ? etatQuestionOuverteJson({ questionOuverte: false, tempsRestantMs: undefined, correction: correctionJson() })
      : etatQuestionOuverteJson()))
    await userEvent.click(screen.getByRole('button', { name: 'Clore' }))
    expect(await screen.findByText('✓ Bonne réponse')).toBeVisible()
    expect(requetes).toContain('POST /api/sessions/7/questions/courante/cloture')
  })

  it('clore le quiz demande confirmation', async () => {
    const { requetes } = await afficher((r) => reponseJson(r.startsWith('POST')
      ? etatJson({ statut: 'CLOTUREE', lienAcces: undefined, qrCode: undefined })
      : etatJson()))
    await userEvent.click(screen.getByRole('button', { name: 'Clore le quiz' }))
    expect(requetes).not.toContain('POST /api/sessions/7/cloture')
    await userEvent.click(screen.getByRole('button', { name: 'Terminer la séance' }))
    expect(await screen.findByText(/La séance est terminée/)).toBeVisible()
  })

  it('une clôture déjà faite par le serveur ne montre pas d\'erreur, une vraie erreur oui', async () => {
    let erreur = erreurJson(409, "Aucune question n'est ouverte.", 'AUCUNE_QUESTION_OUVERTE')
    await afficher((r) => (r.startsWith('POST') ? erreur : reponseJson(etatQuestionOuverteJson())))
    await userEvent.click(screen.getByRole('button', { name: 'Clore' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Clore' })).toBeEnabled())
    expect(screen.queryByRole('alert')).toBeNull()
    erreur = erreurJson(500, 'Une erreur est survenue. Réessayez dans un instant.')
    await userEvent.click(screen.getByRole('button', { name: 'Clore' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Référence : req-1')
  })

  it('relit l\'état à la reconnexion, et par REST pendant la coupure', async () => {
    let connectes = 1
    const { requetes, stomp } = await afficher(() => reponseJson(etatJson({ connectes })))
    const avant = requetes.length
    connectes = 2
    await stomp.couper()
    expect(await screen.findByText('2')).toBeVisible()
    connectes = 3
    await waitFor(() => expect(screen.getByText('3')).toBeVisible(), { timeout: 3000 })
    await stomp.connecter(true)
    expect(requetes.length).toBeGreaterThan(avant + 2)
  })

  it('serveur injoignable puis revenu : bandeau, puis reprise', async () => {
    let panne = true
    await afficher(() => {
      if (panne) throw new TypeError('Failed to fetch')
      return reponseJson(etatJson())
    }, false)
    expect(await screen.findByText('Connexion perdue, reconnexion en cours…')).toBeVisible()
    panne = false
    expect(await screen.findByText('Quiz du chapitre 3', {}, { timeout: 3000 })).toBeVisible()
    expect(screen.queryByText(/Connexion perdue/)).toBeNull()
  })

  it('séance inexistante : message, sans insister', async () => {
    const { requetes } = await afficher(
      () => erreurJson(404, "Cette séance n'existe pas ou a été supprimée.", 'SEANCE_INTROUVABLE'), false)
    expect(await screen.findByRole('alert')).toHaveTextContent("Cette séance n'existe pas ou a été supprimée.")
    expect(requetes).toHaveLength(1)
  })

  it('401 : retour à la connexion', async () => {
    const { onNonConnecte } = await afficher(() => erreurJson(401, 'Vous devez être connecté.'), false)
    await waitFor(() => expect(onNonConnecte).toHaveBeenCalled())
  })

  it('rattrape une clôture dont le message STOMP est perdu', async () => {
    let close = false
    await afficher(() => reponseJson(close
      ? etatQuestionOuverteJson({ questionOuverte: false, tempsRestantMs: undefined, correction: correctionJson() })
      : etatQuestionOuverteJson({ tempsRestantMs: 100 })))
    close = true
    expect(await screen.findByText('✓ Bonne réponse', {}, { timeout: 3000 })).toBeVisible()
  })
})
