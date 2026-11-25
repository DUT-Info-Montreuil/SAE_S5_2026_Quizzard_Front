// Repère de texte d'une page de quiz (plan UC3, D10 ; UC3, « Le repère de texte est extrait par le navigateur… »).
// Le texte brut vient de PDF.js (couche api, B3) : ici, seulement le nettoyage.

/** Longueur maximale du repère, en unités UTF-16 comme la limite du back (`@Size max 300`). */
export const LONGUEUR_MAX_REPERE = 300

const estDebutDePaire = (code: number) => code >= 0xd800 && code <= 0xdbff
const estFinDePaire = (code: number) => code >= 0xdc00 && code <= 0xdfff

/**
 * Nettoie le texte de la page `numeroPage` (page 1 si `numeroPage` vaut 0) : espaces normalisés, puis les 300 derniers
 * caractères (les 300 premiers pour `numeroPage` 0), sans couper une paire de substitution.
 * `undefined` si la page n'a pas de texte : la requête part alors sans `repereTexte`.
 */
export function nettoyerRepere(texte: string, numeroPage: number): string | undefined {
  const normalise = texte.replace(/\s+/g, ' ').trim()
  let repere: string
  if (numeroPage === 0) {
    repere = normalise.slice(0, LONGUEUR_MAX_REPERE)
    if (estDebutDePaire(repere.charCodeAt(repere.length - 1))) repere = repere.slice(0, -1)
  } else {
    repere = normalise.slice(-LONGUEUR_MAX_REPERE)
    if (estFinDePaire(repere.charCodeAt(0))) repere = repere.slice(1)
  }
  // Une coupe peut laisser une espace en bord de repère.
  repere = repere.trim()
  return repere === '' ? undefined : repere
}
