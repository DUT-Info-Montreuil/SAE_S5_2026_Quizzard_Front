// UC2, E2 élément 3 « Importer un PDF » : contrôles avant l'envoi, envoi, confirmation d'un doublon.

import { useRef, useState } from 'react'
import { ErreurHttp } from '../../../shared/http/ErreurHttp.ts'
import { importerCours } from '../api/coursApi.ts'
import type { Cours } from '../domain/cours.ts'
import { echecImport } from '../domain/erreursImport.ts'
import type { EchecImport } from '../domain/erreursImport.ts'
import { erreurFichier, erreurTitre, titrePropose } from '../domain/importCours.ts'

export interface OptionsImporterCours {
  onImporte: (cours: Cours) => void
  /** 401 : retour à l'écran de connexion. */
  onNonConnecte: () => void
}

export type EtatImport =
  | { phase: 'REPOS' }
  | { phase: 'EN_COURS' }
  | { phase: 'ECHEC', echec: Exclude<EchecImport, { type: 'NON_CONNECTE' }> }

export function useImporterCours({ onImporte, onNonConnecte }: OptionsImporterCours) {
  const [fichier, setFichier] = useState<File | null>(null)
  const [titre, setTitre] = useState('')
  const [etat, setEtat] = useState<EtatImport>({ phase: 'REPOS' })
  // Un titre saisi à la main n'est pas remplacé quand on change de fichier.
  const titreSaisi = useRef(false)
  // Un double clic arrive avant le rendu qui désactive le bouton : le verrou est donc hors de l'état.
  const verrou = useRef(false)

  function choisirFichier(choisi: File | null) {
    setFichier(choisi)
    if (choisi !== null && !titreSaisi.current) setTitre(titrePropose(choisi.name))
    const erreur = choisi === null ? undefined : erreurFichier(choisi)
    setEtat(erreur === undefined
      ? { phase: 'REPOS' }
      : { phase: 'ECHEC', echec: { type: 'CHAMPS', erreurs: { fichier: erreur } } })
  }

  function saisirTitre(valeur: string) {
    titreSaisi.current = valeur.trim() !== ''
    setTitre(valeur)
  }

  async function envoyer(confirmerDoublon: boolean) {
    if (verrou.current) return
    const erreurs = { fichier: erreurFichier(fichier), titre: erreurTitre(titre) }
    if (fichier === null || erreurs.fichier !== undefined || erreurs.titre !== undefined) {
      setEtat({ phase: 'ECHEC', echec: { type: 'CHAMPS', erreurs } })
      return
    }
    verrou.current = true
    setEtat({ phase: 'EN_COURS' })
    try {
      const cours = await importerCours({ fichier, titre: titre.trim(), confirmerDoublon })
      setEtat({ phase: 'REPOS' })
      onImporte(cours)
    } catch (erreur) {
      const echec = echecImport(erreur instanceof ErreurHttp ? erreur : null)
      if (echec.type === 'NON_CONNECTE') {
        setEtat({ phase: 'REPOS' })
        onNonConnecte()
      } else {
        setEtat({ phase: 'ECHEC', echec })
      }
    } finally {
      verrou.current = false
    }
  }

  return {
    fichier,
    titre,
    etat,
    choisirFichier,
    saisirTitre,
    importer: () => envoyer(false),
    /** Renvoie le même fichier, en acceptant le doublon. */
    importerQuandMeme: () => envoyer(true),
    refuserDoublon: () => setEtat({ phase: 'REPOS' }),
  }
}
