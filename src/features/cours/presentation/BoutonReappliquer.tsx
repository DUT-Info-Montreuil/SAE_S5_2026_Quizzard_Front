import { Icone } from '../../../shared/ui/Icone.tsx'
import { LIBELLES } from './libelles.ts'

interface BoutonReappliquerProps {
  /** Version précédente, d'où viennent les quiz à réappliquer. */
  versionPrecedente: number
  nbQuiz: number
  /** Absent : l'aperçu de l'UC6 n'est pas encore là, le bouton est affiché désactivé. */
  onReappliquer?: () => void
}

/**
 * Élément 9 de E3 : « Réappliquer les quiz », visible après l'import d'une nouvelle version ; propose un aperçu avant
 * validation (UC6, Charte Editeur). TODO(UC6): aperçu et validation (POST .../pages/validation) à brancher.
 */
export function BoutonReappliquer({ versionPrecedente, nbQuiz, onReappliquer }: BoutonReappliquerProps) {
  return (
    <button
      type="button"
      className="bouton-secondaire bouton-reappliquer"
      disabled={onReappliquer === undefined}
      onClick={onReappliquer}
    >
      <Icone nom="document" taille={16} />
      {LIBELLES.reappliquer(versionPrecedente)}
      <span className="pastille-nombre" aria-label={LIBELLES.quizAReappliquer(nbQuiz)}>{nbQuiz}</span>
    </button>
  )
}
