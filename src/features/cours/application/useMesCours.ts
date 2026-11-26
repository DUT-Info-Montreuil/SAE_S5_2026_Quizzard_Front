import { useEffect, useEffectEvent, useState } from 'react'
import { ErreurHttp } from '../../../shared/http/ErreurHttp.ts'
import { listerCours } from '../api/coursApi.ts'
import { ajouterImportes } from '../domain/cours.ts'
import type { CoursListe } from '../domain/cours.ts'

export type EtatListe =
  | { phase: 'CHARGEMENT' }
  | { phase: 'PRETE', liste: CoursListe[] }
  | { phase: 'ECHEC', message: string, requestId: string | null }

/** Cours de l'enseignant (E2). `onNonConnecte` : 401, retour à la connexion. */
export function useMesCours(onNonConnecte: () => void) {
  const [etat, setEtat] = useState<EtatListe>({ phase: 'CHARGEMENT' })
  // Gardés à part : un cours importé reste visible même si la liste n'a pas pu être chargée.
  const [importes, setImportes] = useState<CoursListe[]>([])
  const [essai, setEssai] = useState(0)
  const nonConnecte = useEffectEvent(onNonConnecte)

  useEffect(() => {
    const annulation = new AbortController()
    listerCours(annulation.signal).then(
      (liste) => {
        if (!annulation.signal.aborted) setEtat({ phase: 'PRETE', liste })
      },
      (erreur: unknown) => {
        if (annulation.signal.aborted) return
        const http = erreur instanceof ErreurHttp ? erreur : null
        if (http?.statut === 401) {
          nonConnecte()
          return
        }
        // Back déployé sans la route (pas encore fusionnée dans develop) : 404, ou 405 car POST /api/cours existe.
        const absente = http?.statut === 404 || http?.statut === 405
        setEtat({
          phase: 'ECHEC',
          message: absente
            ? "La liste des cours n'est pas encore disponible sur le serveur."
            : (http !== null && http.statut < 500 && http.error) || 'Impossible de charger vos cours, réessayez.',
          requestId: http?.request_id ?? null,
        })
      },
    )
    return () => annulation.abort()
  }, [essai])

  return {
    etat,
    cours: ajouterImportes(etat.phase === 'PRETE' ? etat.liste : [], importes),
    recharger: () => {
      setEtat({ phase: 'CHARGEMENT' })
      setEssai((n) => n + 1)
    },
    ajouter: (cours: CoursListe) => setImportes((liste) => [cours, ...liste]),
  }
}
