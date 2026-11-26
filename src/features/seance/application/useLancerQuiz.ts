// UC7, E3 élément 11 « Lancer la présentation » : lancement, et décisions demandées par les deux 409.

import { useRef, useState } from 'react'
import { ErreurHttp } from '../../../shared/http/ErreurHttp.ts'
import { cloturerSeance, lancerQuiz, lireSeanceOuverte } from '../api/animationApi.ts'
import { echecLancement } from '../domain/erreursLancement.ts'
import type { EchecLancement } from '../domain/erreursLancement.ts'

/** Routes utilisées par le lancement ; remplaçables pour les démos sans back. */
export interface ApiLancement {
  lancerQuiz: typeof lancerQuiz
  lireSeanceOuverte: () => Promise<{ seance: { idSession: number } }>
  cloturerSeance: (idSession: number) => Promise<unknown>
}

const API_LANCEMENT: ApiLancement = { lancerQuiz, lireSeanceOuverte, cloturerSeance }

export interface OptionsLancerQuiz {
  idQuiz: number
  /** `API_LANCEMENT` (back réel) par défaut ; une fausse API dans la démo `/demo/editeur`. */
  api?: ApiLancement
  /** Séance lancée ou reprise : afficher E5. */
  onSeance: (idSession: number) => void
  /** 401 : retour à l'écran de connexion. */
  onNonConnecte: () => void
}

export type EtatLancement =
  | { phase: 'REPOS' }
  | { phase: 'EN_COURS' }
  | { phase: 'ECHEC', echec: Exclude<EchecLancement, { type: 'NON_CONNECTE' }> }

export function useLancerQuiz({ idQuiz, api = API_LANCEMENT, onSeance, onNonConnecte }: OptionsLancerQuiz) {
  const [etat, setEtat] = useState<EtatLancement>({ phase: 'REPOS' })
  // Un double clic arrive avant le rendu qui désactive le bouton : le verrou est donc hors de l'état.
  const verrou = useRef(false)

  async function tenter(action: () => Promise<number>) {
    if (verrou.current) return
    verrou.current = true
    setEtat({ phase: 'EN_COURS' })
    try {
      // Succès : le verrou reste fermé, l'écran est quitté.
      onSeance(await action())
    } catch (erreur) {
      const echec = echecLancement(erreur instanceof ErreurHttp ? erreur : null)
      if (echec.type === 'NON_CONNECTE') {
        setEtat({ phase: 'REPOS' })
        onNonConnecte()
      } else {
        setEtat({ phase: 'ECHEC', echec })
      }
      verrou.current = false
    }
  }

  const creer = async (autoriserIdentiteNonVerifiee: boolean) =>
    (await api.lancerQuiz(idQuiz, autoriserIdentiteNonVerifiee)).idSession

  return {
    etat,
    lancer: () => tenter(() => creer(false)),
    autoriserEtLancer: () => tenter(() => creer(true)),
    reprendre: () => tenter(async () => (await api.lireSeanceOuverte()).seance.idSession),
    terminerEtLancer: () => tenter(async () => {
      try {
        await api.cloturerSeance((await api.lireSeanceOuverte()).seance.idSession)
      } catch (erreur) {
        // Déjà terminée entre-temps (autre onglet, passage automatique) : c'est l'effet voulu.
        const dejaTerminee = erreur instanceof ErreurHttp &&
          (erreur.code === 'SEANCE_INTROUVABLE' || erreur.code === 'SEANCE_TERMINEE')
        if (!dejaTerminee) throw erreur
      }
      return creer(false)
    }),
    annuler: () => setEtat({ phase: 'REPOS' }),
  }
}
