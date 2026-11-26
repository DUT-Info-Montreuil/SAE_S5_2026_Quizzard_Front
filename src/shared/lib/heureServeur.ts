// Heure du serveur et décompte. Le serveur fait foi : le temps restant se calcule à partir de son heure,
// jamais de la seule horloge de l'appareil (CLAUDE.md, règle 5).
//
//   ecart          = heure du serveur − heure de l'appareil (relevé sur l'en-tête Date d'une réponse HTTP)
//   tempsRestantMs = échéance − (heure de l'appareil + ecart)
//
// Toutes les heures sont en millisecondes depuis le 1er janvier 1970 UTC (comme Date.now()).

import { estEnDeveloppement } from '../config/config.ts'

// AAAA-MM-JJTHH:MM[:SS[.fraction]][Z|±HH:MM]
const FORMAT_ISO =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})?$/

/**
 * Lit un instant envoyé par le back (exemple : une échéance) et le renvoie en millisecondes UTC.
 * C'est la SEULE fonction qui lit une date du back : ne jamais passer une telle date à `new Date()` ni à
 * `Date.parse()`, qui interprètent une date sans fuseau dans le fuseau de l'appareil, et pas de la même façon
 * selon les navigateurs. Le texte est découpé à la main puis calculé avec `Date.UTC`, identique partout.
 *
 * - nombre : déjà en millisecondes, renvoyé tel quel ;
 * - texte avec fuseau (`2026-11-12T14:05:20+01:00`, `…Z`) : instant exact ;
 * - texte sans fuseau ou illisible : `null`, l'appelant choisit sa solution de repli.
 */
export function lireInstantServeur(valeur: string | number): number | null {
  if (typeof valeur === 'number') return Number.isFinite(valeur) ? valeur : null

  const morceaux = FORMAT_ISO.exec(valeur.trim())
  if (morceaux === null) return null
  const [, annee, mois, jour, heure, minute, seconde = '0', fraction = '0', fuseau] = morceaux

  if (fuseau === undefined) {
    // TODO(UC9): le back envoie l'échéance sans fuseau (plan UC9, question B4). Sans fuseau, on ne devine pas :
    // null, et l'appelant se rabat sur sa solution de repli. Une fois le format fixé, adapter ici seulement.
    return null
  }

  const millisecondes = Number(fraction.padEnd(3, '0').slice(0, 3))
  const instantLocal = Date.UTC(+annee, +mois - 1, +jour, +heure, +minute, +seconde, millisecondes)

  // Date.UTC accepte « 31 février » en passant au mois suivant : on refuse une date qui n'existe pas.
  const verification = new Date(instantLocal)
  if (
    verification.getUTCMonth() !== +mois - 1 ||
    verification.getUTCDate() !== +jour ||
    +heure > 23 ||
    +minute > 59 ||
    +seconde > 59
  ) {
    return null
  }

  return instantLocal - decalageMs(fuseau)
}

/** `Z` → 0 ; `+01:00` → 3 600 000 ; `-03:30` → −12 600 000. */
function decalageMs(fuseau: string): number {
  if (fuseau === 'Z') return 0
  const signe = fuseau.startsWith('-') ? -1 : 1
  const minutes = Number(fuseau.slice(1, 3)) * 60 + Number(fuseau.slice(4, 6))
  return signe * minutes * 60_000
}

let repliDejaSignale = false

/**
 * Écart entre l'heure du serveur et celle de l'appareil, en millisecondes (positif si l'appareil retarde).
 *
 * @param enTeteDate valeur de l'en-tête HTTP `Date` (`ReponseHttp.enTeteDate`).
 * @param recuA heure de l'appareil à la réception de la réponse (`Date.now()` par défaut).
 * @returns l'écart, ou `null` si l'en-tête est absent ou illisible (souvent : non exposé par CORS en
 *   développement). L'appelant choisit alors sa solution de repli.
 *
 * L'en-tête `Date` est à la seconde près : l'écart est précis à ±0,5 s.
 */
export function ecartAvecServeur(enTeteDate: string | null, recuA: number = Date.now()): number | null {
  // L'en-tête Date a toujours un fuseau (« Sun, 22 Nov 2026 19:55:55 GMT ») : Date.parse le lit de la même façon
  // sur tous les navigateurs, la norme JavaScript l'impose (c'est le format de toUTCString()).
  const heureServeur = enTeteDate === null ? Number.NaN : Date.parse(enTeteDate)

  if (Number.isNaN(heureServeur)) {
    if (estEnDeveloppement && !repliDejaSignale) {
      repliDejaSignale = true
      console.warn(
        "Heure du serveur illisible (en-tête Date absent ou non exposé par CORS) : l'écran utilise sa solution de repli.",
      )
    }
    return null
  }

  // L'en-tête tronque les millisecondes : l'heure réelle du serveur est dans [heureServeur, heureServeur + 1 s[.
  // On vise le milieu de cet intervalle.
  return heureServeur + 500 - recuA
}

/**
 * Temps restant avant l'échéance, en millisecondes, jamais négatif.
 *
 * @param echeanceMs échéance en millisecondes UTC (voir `lireInstantServeur`).
 * @param ecartMs écart avec le serveur (voir `ecartAvecServeur`) ; 0 si l'appelant a choisi l'horloge de l'appareil.
 * @param maintenant heure de l'appareil (`Date.now()` par défaut).
 */
export function tempsRestantMs(echeanceMs: number, ecartMs: number, maintenant: number = Date.now()): number {
  return Math.max(0, echeanceMs - (maintenant + ecartMs))
}
