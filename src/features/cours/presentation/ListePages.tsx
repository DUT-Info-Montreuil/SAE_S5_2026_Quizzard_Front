import type { Emplacement, PageInseree } from '../domain/cours.ts'
import type { Selection } from '../domain/machineEditeur.ts'
import { emplacementsInsertion, listeAffichee } from '../domain/numerotation.ts'
import type { ElementListe } from '../domain/numerotation.ts'
import { LIBELLES } from './libelles.ts'
import { MiniaturePage } from './MiniaturePage.tsx'
import type { RendrePage } from './RenduPdf.tsx'

interface Props {
  nbPages: number
  pages: readonly PageInseree[]
  selection: Selection
  /** Détail de chaque page insérée, par `idPage` (maquette : « QCM · 30 s ») ; facultatif. */
  detailsPages?: ReadonlyMap<number, string>
  rendrePage: RendrePage
  /** Faux en lecture seule (cours archivé) : aucun bouton « Insérer un quiz ici ». */
  insertionAffichee: boolean
  /** Boutons désactivés : insertion en cours, dialogue ouvert ou insertion bloquée (plan UC3, D12). */
  insertionDesactivee: boolean
  onSelectionner(selection: Selection): void
  /** `bouton` : bouton cliqué, qui reprend le focus à la fermeture du dialogue. */
  onInserer(emplacement: Emplacement, bouton: HTMLButtonElement): void
}

function cle(element: ElementListe): string {
  return element.genre === 'PAGE_PDF' ? `pdf-${element.numeroPage}` : `page-${element.page.idPage}`
}

function estSelectionne(element: ElementListe, selection: Selection): boolean {
  return element.genre === 'PAGE_PDF'
    ? selection.genre === 'PAGE_PDF' && selection.numeroPage === element.numeroPage
    : selection.genre === 'PAGE_INSEREE' && selection.idPage === element.page.idPage
}

/**
 * Pages du cours dans l'ordre, avec leur position (élément 2 de E3), et un bouton « Insérer un quiz ici » dans chaque
 * espace : au début, entre deux pages et à la fin (élément 3). Ordre, positions et emplacements : domaine (§5).
 */
export function ListePages(props: Props) {
  const { nbPages, pages, selection, rendrePage, insertionAffichee, insertionDesactivee } = props
  const elements = listeAffichee(nbPages, pages)
  // emplacements[i] : espace juste avant elements[i] ; le dernier : espace après la fin.
  const emplacements = emplacementsInsertion(nbPages, pages)

  function boutonInsertion(i: number) {
    const emplacement = emplacements[i]
    const libelle = i > 0
      ? LIBELLES.insererApres(elements[i - 1].position)
      : elements.length > 0 ? LIBELLES.insererAvant(elements[0].position) : LIBELLES.insererIci
    return (
      <button
        type="button"
        className="bouton-inserer"
        aria-label={libelle}
        title={LIBELLES.insererIci}
        disabled={insertionDesactivee}
        onClick={(evenement) => props.onInserer(emplacement, evenement.currentTarget)}
      >
        <span aria-hidden="true">+</span>
      </button>
    )
  }

  return (
    <section className="liste-pages" aria-label={LIBELLES.pagesDuCours} aria-busy={insertionDesactivee || undefined}>
      <ol className="liste-pages-elements">
        {elements.map((element, i) => (
          <li key={cle(element)} className="liste-pages-element">
            {insertionAffichee && boutonInsertion(i)}
            <MiniaturePage
              element={element}
              titreQuiz={element.genre === 'PAGE_INSEREE' ? element.page.titreQuiz : null}
              detail={element.genre === 'PAGE_INSEREE' ? props.detailsPages?.get(element.page.idPage) ?? null : null}
              selectionnee={estSelectionne(element, selection)}
              rendrePage={rendrePage}
              onSelectionner={() => props.onSelectionner(element.genre === 'PAGE_PDF'
                ? { genre: 'PAGE_PDF', numeroPage: element.numeroPage }
                : { genre: 'PAGE_INSEREE', idPage: element.page.idPage, titreQuiz: element.page.titreQuiz })}
            />
          </li>
        ))}
      </ol>
      {insertionAffichee && boutonInsertion(elements.length)}
    </section>
  )
}
