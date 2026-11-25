import { useEffect, useRef, useState } from 'react'
import type { ElementListe } from '../domain/numerotation.ts'
import { IconePage } from './IconePage.tsx'
import { LIBELLES } from './libelles.ts'
import { RenduPdf } from './RenduPdf.tsx'
import type { RendrePage } from './RenduPdf.tsx'

interface Props {
  element: ElementListe
  /** Titre du quiz d'une page de quiz, s'il est connu (plan UC3, Q5). */
  titreQuiz: string | null
  selectionnee: boolean
  rendrePage: RendrePage
  onSelectionner(): void
}

/**
 * Miniature d'une page (élément 2 de E3) : bouton qui sélectionne la page. Une page du PDF n'est rendue qu'à son
 * premier passage dans la zone visible (plan UC3, D8) ; son rendu est annulé si elle sort du DOM.
 */
export function MiniaturePage({ element, titreQuiz, selectionnee, rendrePage, onSelectionner }: Props) {
  const bouton = useRef<HTMLButtonElement>(null)
  const [visible, setVisible] = useState(false)
  const pagePdf = element.genre === 'PAGE_PDF'

  useEffect(() => {
    if (!pagePdf || visible || !bouton.current) return
    const observateur = new IntersectionObserver((entrees) => {
      if (entrees.some((entree) => entree.isIntersecting)) setVisible(true)
    })
    observateur.observe(bouton.current)
    return () => observateur.disconnect()
  }, [pagePdf, visible])

  const type = element.genre === 'PAGE_INSEREE' ? element.page.type : null
  const classe = type === 'QUIZ' ? 'miniature-quiz' : type === 'CLASSEMENT' ? 'miniature-classement' : 'miniature-pdf'

  return (
    <button
      ref={bouton}
      type="button"
      className={`miniature ${classe}`}
      aria-current={selectionnee ? 'true' : undefined}
      onClick={onSelectionner}
    >
      {element.genre === 'PAGE_PDF'
        ? visible && <RenduPdf numeroPage={element.numeroPage} rendrePage={rendrePage} />
        : (
          <span className="miniature-type">
            <IconePage type={element.page.type} />
            {element.page.type === 'QUIZ' ? LIBELLES.pageQuiz : LIBELLES.pageClassement}
          </span>
        )}
      {titreQuiz !== null && <span className="miniature-titre">{titreQuiz}</span>}
      <span className="miniature-position">{LIBELLES.page(element.position)}</span>
    </button>
  )
}
