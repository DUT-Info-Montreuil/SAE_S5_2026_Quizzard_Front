import { useEffect, useState } from 'react'
import { ErreurHttp } from '../../../shared/http/ErreurHttp.ts'
import { deconnecter, lireProfil } from '../api/compteApi.ts'
import type { Profil } from '../domain/profil.ts'

/**
 * Profil affiché et déconnexion. Sans profil (route absente, SECURITE_OUVERTE=true), `profil` reste `null` : c'est le
 * 401 des données de l'écran qui renvoie à la connexion.
 */
export function useCompte(onDeconnecte: () => void) {
  const [profil, setProfil] = useState<Profil | null>(null)
  const [echec, setEchec] = useState(false)

  useEffect(() => {
    const annulation = new AbortController()
    lireProfil(annulation.signal).then(
      (lu) => {
        if (!annulation.signal.aborted) setProfil(lu)
      },
      () => {},
    )
    return () => annulation.abort()
  }, [])

  return {
    profil,
    echec,
    seDeconnecter: async () => {
      setEchec(false)
      try {
        await deconnecter()
      } catch (erreur) {
        // 401 : la session est déjà fermée, c'est l'effet voulu.
        if (!(erreur instanceof ErreurHttp && erreur.statut === 401)) {
          setEchec(true)
          return
        }
      }
      onDeconnecte()
    },
  }
}
