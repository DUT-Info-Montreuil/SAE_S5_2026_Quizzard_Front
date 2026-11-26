import { useEffect, useEffectEvent, useState } from 'react'
import { ErreurHttp } from '../../../shared/http/ErreurHttp.ts'
import { ouvrirCours } from '../api/coursApi.ts'
import type { CoursOuvert } from '../domain/cours.ts'

export type EtatCours =
  | { phase: 'CHARGEMENT' }
  | { phase: 'PRET', cours: CoursOuvert }
  | { phase: 'INTROUVABLE' }
  | { phase: 'ECHEC', message: string, requestId: string | null }

/** Réponse reçue, rattachée à l'essai qui l'a demandée : une réponse d'un autre cours ou d'un ancien essai est ignorée. */
interface Reponse {
  cle: string
  etat: EtatCours
}

/**
 * Cours ouvert depuis « Ouvrir » (E2 → E3) et sa dernière version. `idCours` : texte de l'adresse ; s'il n'est pas un
 * entier positif, le cours est introuvable sans appel. `onNonConnecte` : 401, retour à la connexion.
 */
export function useCours(idCours: string | undefined, onNonConnecte: () => void) {
  const valide = idCours !== undefined && /^[1-9]\d*$/.test(idCours)
  const [essai, setEssai] = useState(0)
  const [reponse, setReponse] = useState<Reponse | null>(null)
  const nonConnecte = useEffectEvent(onNonConnecte)
  const cle = `${idCours}#${essai}`

  useEffect(() => {
    if (!valide) return
    const annulation = new AbortController()
    const repondre = (etat: EtatCours) => {
      if (!annulation.signal.aborted) setReponse({ cle, etat })
    }
    ouvrirCours(Number(idCours), annulation.signal).then(
      (cours) => repondre({ phase: 'PRET', cours }),
      (erreur: unknown) => {
        if (annulation.signal.aborted) return
        const http = erreur instanceof ErreurHttp ? erreur : null
        if (http?.statut === 401) {
          nonConnecte()
          return
        }
        // 404 COURS_INTROUVABLE : inexistant, archivé ou d'un autre enseignant ; 400 : identifiant illisible.
        if (http?.statut === 404 || http?.statut === 400) {
          repondre({ phase: 'INTROUVABLE' })
          return
        }
        repondre({
          phase: 'ECHEC',
          message: 'Impossible d\'ouvrir ce cours, réessayez.',
          requestId: http?.request_id ?? null,
        })
      },
    )
    return () => annulation.abort()
  }, [idCours, valide, cle])

  let etat: EtatCours = { phase: 'CHARGEMENT' }
  if (!valide) etat = { phase: 'INTROUVABLE' }
  else if (reponse?.cle === cle) etat = reponse.etat

  return { etat, recharger: () => setEssai((n) => n + 1) }
}
