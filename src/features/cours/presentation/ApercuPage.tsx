import type { PageInseree } from '../domain/cours.ts'
import type { Selection } from '../domain/machineEditeur.ts'
import { listeAffichee } from '../domain/numerotation.ts'
import { IconePage } from './IconePage.tsx'
import { LIBELLES } from './libelles.ts'
import { RenduPdf } from './RenduPdf.tsx'
import type { RendrePage } from './RenduPdf.tsx'

interface Props {
  nbPages: number
  pages: readonly PageInseree[]
  selection: Selection
  rendrePage: RendrePage
}

/**
 * Aperçu de la page sélectionnée (élément 4 de E3, lecture seule) : rendu de la page du PDF à la largeur de la zone,
 * ou encadré d'une page insérée (« Question à paramétrer » et titre du quiz pour une page de quiz).
 */
export function ApercuPage({ nbPages, pages, selection, rendrePage }: Props) {
  const element = listeAffichee(nbPages, pages).find((e) => selection.genre === 'PAGE_PDF'
    ? e.genre === 'PAGE_PDF' && e.numeroPage === selection.numeroPage
    : e.genre === 'PAGE_INSEREE' && e.page.idPage === selection.idPage)

  let contenu = null
  if (element?.genre === 'PAGE_PDF') {
    contenu = (
      <RenduPdf
        key={element.numeroPage}
        numeroPage={element.numeroPage}
        rendrePage={rendrePage}
        libelle={LIBELLES.page(element.position)}
      />
    )
  } else if (element?.genre === 'PAGE_INSEREE') {
    const quiz = element.page.type === 'QUIZ'
    contenu = (
      <div className={`apercu-encadre ${quiz ? 'apercu-encadre-quiz' : 'apercu-encadre-classement'}`}>
        <p className="apercu-type">
          <IconePage type={element.page.type} />
          {quiz ? LIBELLES.pageQuiz : LIBELLES.pageClassement}
        </p>
        {quiz && <p className="apercu-question">{LIBELLES.questionAParametrer}</p>}
        {/* Titre connu seulement après une insertion faite dans l'éditeur (plan UC3, Q5). */}
        {quiz && selection.genre === 'PAGE_INSEREE' && selection.titreQuiz !== null && (
          <p className="apercu-titre-quiz">{selection.titreQuiz}</p>
        )}
      </div>
    )
  }

  return (
    <section className="apercu" aria-label={LIBELLES.apercu}>
      {element && <p className="apercu-position">{LIBELLES.page(element.position)}</p>}
      <div className="apercu-carte">{contenu}</div>
    </section>
  )
}
