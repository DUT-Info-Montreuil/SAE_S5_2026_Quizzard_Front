/** Icônes embarquées (SVG en ligne, aucune ressource distante : CLAUDE.md, règle 7). Décoratives : le texte voisin
 * porte le sens. */
export type NomIcone = 'document' | 'plus' | 'trophee' | 'personnes' | 'ouvrir'

const TRACES: Record<NomIcone, string[]> = {
  document: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5'],
  plus: ['M12 5v14', 'M5 12h14'],
  trophee: [
    'M8 4h8v5a4 4 0 0 1-8 0z', 'M8 6H5a3 3 0 0 0 3 4', 'M16 6h3a3 3 0 0 1-3 4', 'M12 13v4', 'M8 20h8', 'M10 17h4',
  ],
  personnes: [
    'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M3 20a6 6 0 0 1 12 0', 'M16 5a3 3 0 0 1 0 6', 'M18 14a5 5 0 0 1 3 6',
  ],
  ouvrir: ['M6 5l8 7-8 7z', 'M18 5v14'],
}

export function Icone({ nom, taille = 16 }: { nom: NomIcone, taille?: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {TRACES[nom].map((d) => <path key={d} d={d} />)}
    </svg>
  )
}
