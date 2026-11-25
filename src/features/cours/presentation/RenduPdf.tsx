import { useEffect, useRef, useState } from 'react'
import type { RenduPage } from '../../../shared/pdf/documentPdf.ts'
import { LIBELLES } from './libelles.ts'

/**
 * Dessine une page du PDF dans `canvas` à `largeur` pixels CSS. Même signature que `DocumentPdf.rendrePage` : le
 * hook (B5) passe celle du document ouvert, la démo et les tests une fausse.
 */
export type RendrePage = (numeroPage: number, canvas: HTMLCanvasElement, largeur: number) => RenduPage

interface Props {
  numeroPage: number
  rendrePage: RendrePage
  /** Texte alternatif ; absent : canvas décoratif (la miniature est déjà nommée par son bouton). */
  libelle?: string
}

/**
 * Canvas d'une page, à la largeur de son conteneur (`ResizeObserver`), redessiné quand cette largeur change.
 * Le rendu en cours est annulé au changement de page et au démontage (plan UC3, D8). À remonter avec une `key` par
 * page pour effacer un échec précédent.
 */
export function RenduPdf({ numeroPage, rendrePage, libelle }: Props) {
  const conteneur = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [largeur, setLargeur] = useState(0)
  const [echec, setEchec] = useState(false)

  useEffect(() => {
    const element = conteneur.current
    if (!element) return
    const observateur = new ResizeObserver(([entree]) => setLargeur(Math.floor(entree.contentRect.width)))
    observateur.observe(element)
    return () => observateur.disconnect()
  }, [])

  // Démontage : canvas vidé, pour que le navigateur libère sa mémoire sans attendre le ramasse-miettes.
  useEffect(() => {
    const element = canvas.current
    return () => {
      if (!element) return
      element.width = 0
      element.height = 0
    }
  }, [])

  useEffect(() => {
    if (!canvas.current || largeur <= 0) return
    const rendu = rendrePage(numeroPage, canvas.current, largeur)
    rendu.fin.catch(() => setEchec(true))
    return () => rendu.annuler()
  }, [numeroPage, rendrePage, largeur])

  return (
    <div ref={conteneur} className="rendu-pdf">
      {echec
        ? <p className="rendu-pdf-echec">{LIBELLES.apercuIndisponible}</p>
        : (
          <canvas
            ref={canvas}
            className="rendu-pdf-canvas"
            {...(libelle ? { role: 'img', 'aria-label': libelle } : { 'aria-hidden': true })}
          />
        )}
    </div>
  )
}
