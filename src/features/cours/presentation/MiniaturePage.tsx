import { useEffect, useRef, useState } from 'react'
import type { ElementListe } from '../domain/numerotation.ts'
import { IconePage } from './IconePage.tsx'
import { LIBELLES } from './libelles.ts'
import { RenduPdf } from './RenduPdf.tsx'
import type { RendrePage } from './RenduPdf.tsx'

const MARGE_RENDU = '200px'

interface Props {
  element: ElementListe
  /** Titre du quiz d'une page de quiz, s'il est connu (plan UC3, Q5). */
  titreQuiz: string | null
  /** Détail d'une page insérée (maquette : « QCM · 30 s », « cumulé ») ; `null` s'il est inconnu. */
  detail?: string | null
  selectionnee: boolean
  rendrePage: RendrePage
  onSelectionner(): void
}

/**
 * Miniature d'une page (élément 2 de E3) : bouton qui sélectionne la page. Une page du PDF n'est rendue que près de la
 * zone visible (plan UC3, D8) ; hors de cette zone, son canvas est retiré (rendu annulé, mémoire libérée) : un gros
 * PDF ne garde en mémoire que les miniatures proches de l'écran.
 */
export function MiniaturePage({ element, titreQuiz, detail = null, selectionnee, rendrePage, onSelectionner }: Props) {
  const bouton = useRef<HTMLButtonElement>(null)
  const [visible, setVisible] = useState(false)
  const pagePdf = element.genre === 'PAGE_PDF'

  useEffect(() => {
    if (!pagePdf || !bouton.current) return
    const observateur = new IntersectionObserver(
      (entrees) => setVisible(entrees[entrees.length - 1].isIntersecting),
      // Marge : les miniatures voisines sont rendues avant d'entrer à l'écran.
      { rootMargin: MARGE_RENDU },
    )
    observateur.observe(bouton.current)
    return () => observateur.disconnect()
  }, [pagePdf])

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
            {/* Titre du quiz en tête quand il est connu (maquette) ; le type reste lu par les lecteurs d'écran. */}
            {titreQuiz === null
              ? element.page.type === 'QUIZ' ? LIBELLES.pageQuiz : LIBELLES.pageClassement
              : <><span className="visuellement-cache">{LIBELLES.pageQuiz} </span>{titreQuiz}</>}
          </span>
        )}
      {detail !== null && <span className="miniature-titre">{detail}</span>}
      <span className="miniature-position">{LIBELLES.page(element.position)}</span>
    </button>
  )
}
