// Ouverture et rendu d'un PDF avec PDF.js (plan UC3, D6 à D8 ; docs/ARCHITECTURE.md §8).
// Partagé par l'éditeur (E3) et la présentation projetée (E5, E6) : les types de PDF.js ne sortent pas de ce fichier.
// Le worker est importé par `?url` : Vite le copie dans dist/assets et l'application le sert elle-même (aucun CDN).
// À n'importer que depuis une route chargée en `lazy` : PDF.js ne doit pas entrer dans le bundle des écrans étudiants.
// Ressources annexes (cmaps, polices standard) non embarquées : question U6 du plan UC3.

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist'
import urlWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = urlWorker

/** Rendu d'une page en cours ; `fin` est résolue aussi quand le rendu est annulé. */
export interface RenduPage {
  fin: Promise<void>
  annuler(): void
}

export interface DocumentPdf {
  /** Nombre de pages du PDF (`numPages`). */
  readonly nbPages: number
  /** Dessine la page `numeroPage` (à partir de 1) dans `canvas`, à `largeur` pixels CSS. */
  rendrePage(numeroPage: number, canvas: HTMLCanvasElement, largeur: number): RenduPage
  /** Texte brut de la page, morceaux séparés par une espace (nettoyage laissé à l'appelant). */
  lireTextePage(numeroPage: number): Promise<string>
  /** Libère le document et son worker ; à appeler au démontage de l'écran. */
  fermer(): Promise<void>
}

/** Ouvre un PDF reçu par `requeteBinaire()`. PDF.js transfère les octets au worker : `donnees` devient inutilisable. */
export async function ouvrirDocumentPdf(donnees: ArrayBuffer): Promise<DocumentPdf> {
  const chargement = getDocument({ data: new Uint8Array(donnees) })
  const document = await chargement.promise
  return {
    nbPages: document.numPages,
    rendrePage: (numeroPage, canvas, largeur) => rendrePage(document, numeroPage, canvas, largeur),
    lireTextePage: async (numeroPage) => {
      const page = await document.getPage(numeroPage)
      try {
        const { items } = await page.getTextContent()
        return items.map((item) => ('str' in item ? item.str : '')).join(' ')
      } finally {
        page.cleanup()
      }
    },
    fermer: () => chargement.destroy(),
  }
}

function rendrePage(
  document: PDFDocumentProxy,
  numeroPage: number,
  canvas: HTMLCanvasElement,
  largeur: number,
): RenduPage {
  let annule = false
  let tache: RenderTask | null = null

  const fin = (async () => {
    const page = await document.getPage(numeroPage)
    // Données de la page libérées après chaque rendu : PDF.js ne les garde pas pour tout le document. `cleanup()` ne
    // fait rien tant qu'un autre rendu de la même page (aperçu et miniature) est en cours.
    try {
      await dessiner(page)
    } finally {
      page.cleanup()
    }
  })()

  async function dessiner(page: PDFPageProxy) {
    if (annule) return
    // Échelle multipliée par devicePixelRatio : le canvas reste net sur un écran haute densité.
    const echelle = (largeur / page.getViewport({ scale: 1 }).width) * (window.devicePixelRatio || 1)
    const viewport = page.getViewport({ scale: echelle })
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    canvas.style.width = `${largeur}px`
    tache = page.render({ canvas, viewport })
    try {
      await tache.promise
    } catch (erreur) {
      if (!annule) throw erreur
    }
  }

  return {
    fin,
    annuler: () => {
      annule = true
      tache?.cancel()
    },
  }
}
