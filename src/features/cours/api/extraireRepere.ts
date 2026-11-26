// Extraction du repère de texte d'une page de quiz (plan UC3, D10 et B3).
// Texte brut par shared/pdf, nettoyage par le domaine. `import type` : PDF.js n'entre pas dans ce module.

import type { DocumentPdf } from '../../../shared/pdf/documentPdf.ts'
import { nettoyerRepere } from '../domain/repere.ts'

/**
 * Repère de la page de quiz insérée après la page `numeroPage` du PDF (texte de la page 1 si `numeroPage` vaut 0).
 * `undefined` si la page n'a pas de texte ou si l'extraction échoue : l'insertion part alors sans repère.
 */
export async function extraireRepere(document: DocumentPdf, numeroPage: number): Promise<string | undefined> {
  try {
    const texte = await document.lireTextePage(numeroPage === 0 ? 1 : numeroPage)
    return nettoyerRepere(texte, numeroPage)
  } catch {
    return undefined
  }
}
