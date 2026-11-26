// Jeton de participant de l'étudiant, conservé par `codeAcces` pour survivre à un rechargement de la page
// (docs/ARCHITECTURE.md §5). Écrit par E7 « Rejoindre » (UC8, UC15), lu par la garde de la route de E8 et E9.
//
// TODO(UC9): emplacement et clé à valider (docs/ARCHITECTURE.md §5). Valeur provisoire : `sessionStorage`, clé
// `quizzard.jeton.<codeAcces>`.

const cle = (codeAcces: string) => `quizzard.jeton.${codeAcces}`

/** Jeton conservé pour ce code d'accès, ou `null` (absent, ou stockage indisponible). */
export function lireJeton(codeAcces: string): string | null {
  try {
    return sessionStorage.getItem(cle(codeAcces))
  } catch {
    return null
  }
}

/** Supprime le jeton : session expirée (`JETON_INVALIDE`) ou séance close. */
export function supprimerJeton(codeAcces: string): void {
  try {
    sessionStorage.removeItem(cle(codeAcces))
  } catch {
    // Stockage indisponible : rien à supprimer.
  }
}
