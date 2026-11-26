/**
 * Icônes embarquées (SVG en ligne, aucune ressource distante : CLAUDE.md, règle 7). Décoratives : le texte voisin ou
 * un libellé accessible porte toujours le sens (la couleur et l'icône ne le portent jamais seules).
 */
export type NomIcone =
  | 'liste' | 'lien' | 'texte' | 'eclair' | 'cadenas' | 'image' | 'horloge' | 'document' | 'lecture'
  | 'poignee' | 'coche' | 'trophee' | 'plus' | 'croix' | 'personnes' | 'ouvrir'

const TRACES: Record<NomIcone, string[]> = {
  liste: ['M9 6h11', 'M9 12h11', 'M9 18h11', 'M4.5 6h.01', 'M4.5 12h.01', 'M4.5 18h.01'],
  lien: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'],
  texte: ['M5 6V4h14v2', 'M12 4v16', 'M9 20h6'],
  eclair: ['M13 2 4 14h7l-1 8 9-12h-7z'],
  cadenas: ['M6 11h12v9H6z', 'M8 11V8a4 4 0 0 1 8 0v3'],
  image: ['M4 5h16v14H4z', 'M4 16l5-5 4 4 2-2 5 5', 'M15.5 9.5h.01'],
  horloge: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7v5l3 2'],
  document: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5'],
  lecture: ['M7 5l11 7-11 7z'],
  poignee: ['M9 6h.01', 'M15 6h.01', 'M9 12h.01', 'M15 12h.01', 'M9 18h.01', 'M15 18h.01'],
  coche: ['M5 12.5l4.5 4.5L19 7.5'],
  trophee: [
    'M8 4h8v5a4 4 0 0 1-8 0z', 'M8 6H5a3 3 0 0 0 3 4', 'M16 6h3a3 3 0 0 1-3 4', 'M12 13v4', 'M8 21h8', 'M9 17h6',
  ],
  plus: ['M12 5v14', 'M5 12h14'],
  croix: ['M6 6l12 12', 'M18 6L6 18'],
  // « Mes cours » (UC2) : icônes que l'UC7 n'utilise pas.
  personnes: [
    'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M3 20a6 6 0 0 1 12 0', 'M16 5a3 3 0 0 1 0 6', 'M18 14a5 5 0 0 1 3 6',
  ],
  ouvrir: ['M6 5l8 7-8 7z', 'M18 5v14'],
}

export function Icone({ nom, taille = 16, className }: { nom: NomIcone, taille?: number, className?: string }) {
  return (
    <svg
      className={className}
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
