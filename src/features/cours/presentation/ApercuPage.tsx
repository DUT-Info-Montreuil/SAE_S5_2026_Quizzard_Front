import type { PageInseree } from '../domain/cours.ts'
import type { Selection } from '../domain/machineEditeur.ts'
import { listeAffichee } from '../domain/numerotation.ts'
import { IconePage } from './IconePage.tsx'
import { LIBELLES } from './libelles.ts'
import { RenduPdf } from './RenduPdf.tsx'
import type { RendrePage } from './RenduPdf.tsx'

/** Boutons « Retirer » et « Déplacer » d'une page de quiz ; absents en lecture seule. */
export interface ActionsPageQuiz {
  /** Boutons désactivés : opération en cours ou bloquée. */
  desactivees: boolean
  /** Choix du nouvel emplacement en cours : « Annuler » affiché pour en sortir. */
  deplacementEnCours: boolean
  /** `bouton` : bouton cliqué, qui reprend le focus à la fin de l'opération. */
  onRetirer(bouton: HTMLButtonElement): void
  onDeplacer(bouton: HTMLButtonElement): void
  onAnnulerDeplacement(): void
}

interface Props {
  nbPages: number
  pages: readonly PageInseree[]
  selection: Selection
  rendrePage: RendrePage
  actions?: ActionsPageQuiz
}

/**
 * Aperçu de la page sélectionnée (élément 4 de E3, lecture seule) : rendu de la page du PDF à la largeur de la zone,
 * ou encadré d'une page insérée (« Question à paramétrer » et titre du quiz pour une page de quiz), avec
 * « Retirer » et « Déplacer » pour une page de quiz.
 */
export function ApercuPage({ nbPages, pages, selection, rendrePage, actions }: Props) {
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
        {quiz && element.page.titreQuiz !== null && <p className="apercu-titre-quiz">{element.page.titreQuiz}</p>}
      </div>
    )
  }
  const actionsAffichees = actions && element?.genre === 'PAGE_INSEREE' && element.page.type === 'QUIZ'

  return (
    <section className="apercu" aria-label={LIBELLES.apercu}>
      {element && <p className="apercu-position">{LIBELLES.page(element.position)}</p>}
      <div className="apercu-carte">{contenu}</div>
      {actionsAffichees && (
        <div className="apercu-actions" role="group" aria-label={LIBELLES.actionsPage}>
          <button
            type="button"
            className="bouton-secondaire"
            disabled={actions.desactivees}
            onClick={(evenement) => actions.onDeplacer(evenement.currentTarget)}
          >
            {LIBELLES.deplacer}
          </button>
          <button
            type="button"
            className="bouton-secondaire"
            disabled={actions.desactivees}
            onClick={(evenement) => actions.onRetirer(evenement.currentTarget)}
          >
            {LIBELLES.retirer}
          </button>
          {actions.deplacementEnCours && (
            <button type="button" className="bouton-action" onClick={actions.onAnnulerDeplacement}>
              {LIBELLES.annuler}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
