// Fausses API du navigateur absentes de jsdom, pour les tests de l'éditeur E3 (plan UC3, B6).
import { act } from '@testing-library/react'
import { vi } from 'vitest'
import type { DocumentPdf, RenduPage } from '../shared/pdf/documentPdf.ts'

type RappelIntersection = (entrees: { isIntersecting: boolean }[]) => void

/** Faux `IntersectionObserver` : rien n'est visible tant que `changerVisibilite(true)` n'est pas appelé. */
export function installerFauxIntersectionObserver() {
  const observes: { rappel: RappelIntersection, actif: boolean }[] = []
  vi.stubGlobal('IntersectionObserver', class {
    private entree: { rappel: RappelIntersection, actif: boolean }
    constructor(rappel: RappelIntersection) {
      this.entree = { rappel, actif: false }
    }
    observe() {
      this.entree.actif = true
      observes.push(this.entree)
    }
    disconnect() {
      this.entree.actif = false
    }
  })
  return {
    changerVisibilite(visible: boolean) {
      act(() => {
        for (const o of [...observes]) if (o.actif) o.rappel([{ isIntersecting: visible }])
      })
    },
  }
}

/** Faux `ResizeObserver` : chaque élément observé mesure tout de suite 200 px de large. */
export function installerFauxResizeObserver() {
  vi.stubGlobal('ResizeObserver', class {
    private rappel: (entrees: { contentRect: { width: number } }[]) => void
    constructor(rappel: (entrees: { contentRect: { width: number } }[]) => void) {
      this.rappel = rappel
    }
    observe() {
      this.rappel([{ contentRect: { width: 200 } }])
    }
    disconnect() {}
  })
}

/** `showModal` et `close` si jsdom ne les fournit pas. */
export function installerFauxDialogue() {
  const proto = HTMLDialogElement.prototype
  if (typeof proto.showModal !== 'function') {
    proto.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
  }
  if (typeof proto.close !== 'function') {
    proto.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
  }
}

export function installerFauxNavigateur() {
  installerFauxResizeObserver()
  installerFauxDialogue()
  return installerFauxIntersectionObserver()
}

/** Faux rendu de page : aucun dessin, rendu terminé tout de suite. */
export const fauxRendrePage = () => vi.fn((): RenduPage => ({ fin: Promise.resolve(), annuler: vi.fn() }))

/** Faux document PDF (PDF.js ne tourne pas sous jsdom). */
export function fauxDocumentPdf(nbPages: number, texte: (numeroPage: number) => Promise<string> = async () => '') {
  return {
    nbPages,
    rendrePage: fauxRendrePage(),
    lireTextePage: vi.fn(texte),
    fermer: vi.fn(async () => {}),
  } satisfies DocumentPdf
}
