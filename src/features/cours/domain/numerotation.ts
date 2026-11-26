// Liste affichée dans E3 et emplacements des boutons « Insérer un quiz ici » (plan UC3, §5 et D9 ; UC3, « Calcul de
// l'emplacement et de la numérotation »). La numérotation est calculée par le front, jamais stockée.
//
// Formules du dossier :
//   page p du PDF          : position = p + #{insérées avec numeroPage < p}
//   page insérée (n, o)    : position = n + #{insérées avec numeroPage < n} + o + 1
//
// Exemple du dossier : « PDF de 12 pages avec une page de quiz déjà en (2, 0) ; une insertion en (4, 0) donne la
// position 4 + 1 + 0 + 1 = 6, et la page 5 du PDF passe en position 7. »

import type { Emplacement, PageInseree } from './cours.ts'

export type ElementListe =
  | { genre: 'PAGE_PDF', numeroPage: number, position: number }
  | { genre: 'PAGE_INSEREE', page: PageInseree, position: number }

/** Pages insérées groupées par `numeroPage` (0 à nbPages), chaque groupe trié par `ordre`. */
function grouperParPage(nbPages: number, pages: readonly PageInseree[]): PageInseree[][] {
  const groupes: PageInseree[][] = Array.from({ length: nbPages + 1 }, () => [])
  // Une page hors de 0..nbPages (le back l'interdit ; garde contre une réponse incohérente) n'a pas de place : ignorée.
  for (const page of pages) groupes[page.numeroPage]?.push(page)
  for (const groupe of groupes) groupe.sort((a, b) => a.ordre - b.ordre)
  return groupes
}

/**
 * Pages du PDF et pages insérées dans l'ordre d'affichage : insérées à 0, page 1, insérées à 1, …, page nbPages,
 * insérées à nbPages. Chaque élément porte sa position (formules du dossier).
 */
export function listeAffichee(nbPages: number, pages: readonly PageInseree[]): ElementListe[] {
  const groupes = grouperParPage(nbPages, pages)
  const liste: ElementListe[] = []
  let avant = 0 // nombre de pages insérées avec numeroPage < n
  for (let n = 0; n <= nbPages; n++) {
    if (n > 0) liste.push({ genre: 'PAGE_PDF', numeroPage: n, position: n + avant })
    for (const page of groupes[n]) {
      liste.push({ genre: 'PAGE_INSEREE', page, position: n + avant + page.ordre + 1 })
    }
    avant += groupes[n].length
  }
  return liste
}

/**
 * Emplacement de chaque bouton « Insérer un quiz ici » : l'élément i est l'espace juste avant l'élément i de
 * `listeAffichee`, le dernier est l'espace après la fin (longueur = longueur de la liste + 1).
 * Début : (0, 0) ; après la page p du PDF : (p, 0) ; après la k-ième page insérée à n (k à partir de 1) : (n, k).
 * Chaque emplacement valide (0 ≤ numeroPage ≤ nbPages, 0 ≤ ordre ≤ nombre de pages insérées à numeroPage) y figure
 * une seule fois.
 */
export function emplacementsInsertion(nbPages: number, pages: readonly PageInseree[]): Emplacement[] {
  const groupes = grouperParPage(nbPages, pages)
  const emplacements: Emplacement[] = []
  for (let n = 0; n <= nbPages; n++) {
    emplacements.push({ numeroPage: n, ordre: 0 })
    // Rang dans le groupe plutôt que `ordre + 1` : égaux si les rangs se suivent, et la borne reste vraie sinon.
    groupes[n].forEach((_, k) => emplacements.push({ numeroPage: n, ordre: k + 1 }))
  }
  return emplacements
}
