// Pseudonyme d'un participant (UC8, « Services fonctionnels » : Pseudonyme ; plan UC8, D8).
// Le nettoyage reprend celui du serveur, dans l'ordre de la spec : espaces de début et de fin retirés, espaces
// multiples réduits à un seul, normalisation Unicode NFC. Le serveur fait foi : ce contrôle évite seulement un envoi
// inutile.

export const LONGUEUR_MIN_PSEUDONYME = 2
export const LONGUEUR_MAX_PSEUDONYME = 20

const CARACTERE_DE_CONTROLE = /\p{Cc}/u

/** Seul endroit où la longueur d'un pseudonyme est comptée. */
export function longueurPseudonyme(texte: string): number {
  // TODO(UC8): façon de compter du back non confirmée (plan UC8, question K3 : `@Size` compte en UTF-16,
  // `VARCHAR(20)` en points de code). Valeur provisoire : points de code, comme PostgreSQL.
  return [...texte].length
}

/** Pseudonyme tel que le serveur le garde : c'est ce texte qui est envoyé (plan UC8, D9). */
export function nettoyerPseudonyme(saisie: string): string {
  // TODO(UC8): espaces retirés par le back non confirmés (question K3 : `trim` ou `strip`, espace insécable,
  // tabulation). Valeur provisoire : `trim()` et `\s` de JavaScript, qui comprennent l'espace insécable et la
  // tabulation.
  return saisie.trim().replace(/\s+/gu, ' ').normalize('NFC')
}

/** Vrai si la saisie, une fois nettoyée, fait de 2 à 20 caractères sans caractère de contrôle. */
export function pseudonymeValide(saisie: string): boolean {
  const pseudonyme = nettoyerPseudonyme(saisie)
  const longueur = longueurPseudonyme(pseudonyme)
  return longueur >= LONGUEUR_MIN_PSEUDONYME
    && longueur <= LONGUEUR_MAX_PSEUDONYME
    && !CARACTERE_DE_CONTROLE.test(pseudonyme)
}
