import type { TypePage } from '../domain/cours.ts'

/**
 * Icône d'une page insérée (plan UC3, D16) : éclair pour une page de quiz, trophée pour une page de classement.
 * Décorative : le type de la page est toujours écrit à côté (la couleur et l'icône ne portent jamais seules le sens).
 */
export function IconePage({ type }: { type: TypePage }) {
  return (
    <svg className="icone-page" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false">
      {type === 'QUIZ'
        ? <path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        : (
          <path
            d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
    </svg>
  )
}
