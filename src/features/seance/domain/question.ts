// Types du domaine de l'UC9 « Répondre à une question » et règles de saisie (plan UC9, B2).
// Domaine pur : aucun import de React, du réseau ni de STOMP.

/** Proposition d'un QCM. */
export interface Proposition {
  idProposition: number
  libelle: string
}

/** Élément d'une question « points à relier ». */
// TODO(UC9): forme du message de question pour POINTS_A_RELIER inconnue (plan UC9, questions B6 et B9).
// Valeur provisoire : deux listes d'éléments, chacun avec un identifiant et un libellé.
export interface ElementARelier {
  id: number
  libelle: string
}

/** Lien entre un élément de gauche et un élément de droite (identifiants des éléments). */
// TODO(UC9): que désignent `gauche` et `droite` dans `liens` (plan UC9, question B9) ?
export interface Lien {
  gauche: number
  droite: number
}

interface QuestionCommune {
  idQuestion: number
  position: number
  enonce: string
  dureeSec: number
  /** Échéance telle qu'envoyée par le back ; à lire avec `lireInstantServeur` uniquement (D11). */
  echeance: string | number
  /** Image affichée sous l'énoncé, si elle existe (D15). */
  // TODO(UC9): route et en-tête pour charger l'image (plan UC9, question B12). Valeur provisoire : une URL.
  image?: string
}

// TODO(UC9): valeur exacte du type QCM envoyée par le back inconnue (plan UC9, question B6). Valeur provisoire : 'QCM'.
export interface QuestionQcm extends QuestionCommune {
  type: 'QCM'
  propositions: Proposition[]
  /** Champ demandé au back ; absent = choix unique (D13). */
  choixMultiple?: boolean
}

export interface QuestionARelier extends QuestionCommune {
  type: 'POINTS_A_RELIER'
  elementsGauche: ElementARelier[]
  elementsDroite: ElementARelier[]
}

// TODO(UC9): forme du message de question pour REPONSE_LIBRE inconnue (plan UC9, question B6).
export interface QuestionLibre extends QuestionCommune {
  type: 'REPONSE_LIBRE'
}

export type Question = QuestionQcm | QuestionARelier | QuestionLibre

/** Réponse en cours de saisie, une variante par type de question. */
export type ReponseSaisie =
  | { type: 'QCM', propositions: number[] }
  | { type: 'POINTS_A_RELIER', liens: Lien[] }
  | { type: 'REPONSE_LIBRE', texte: string }

/** Résultat reçu sur `/user/queue/resultat` (docs/API.md du back §4). */
export interface ResultatQuestion {
  points: number
  scoreTotal: number
  rang: number
  nombreParticipants: number
  // TODO(UC9): type de `evolution` inconnu (plan UC9, question B10). Valeur provisoire : un nombre.
  evolution: number
}

/** Longueur maximale d'une réponse libre (UC9, contrat du message). */
export const LONGUEUR_MAX_REPONSE_LIBRE = 1000

/**
 * Vrai si la saisie peut être envoyée :
 * - QCM : au moins une proposition de la question (au plus une en choix unique) ;
 * - points à relier : chaque élément de gauche relié exactement une fois, chaque élément de droite au plus une fois ;
 * - réponse libre : non vide (hors espaces) et au plus 1000 caractères.
 */
export function reponseComplete(question: Question, saisie: ReponseSaisie): boolean {
  if (question.type === 'QCM' && saisie.type === 'QCM') {
    const ids = new Set(question.propositions.map((p) => p.idProposition))
    const choix = new Set(saisie.propositions)
    return (
      choix.size >= 1 &&
      choix.size === saisie.propositions.length &&
      (question.choixMultiple === true || choix.size === 1) &&
      saisie.propositions.every((id) => ids.has(id))
    )
  }
  if (question.type === 'POINTS_A_RELIER' && saisie.type === 'POINTS_A_RELIER') {
    const gauches = saisie.liens.map((l) => l.gauche)
    const droites = saisie.liens.map((l) => l.droite)
    const idsDroite = new Set(question.elementsDroite.map((e) => e.id))
    return (
      saisie.liens.length === question.elementsGauche.length &&
      question.elementsGauche.every((e) => gauches.filter((g) => g === e.id).length === 1) &&
      new Set(droites).size === droites.length &&
      droites.every((d) => idsDroite.has(d))
    )
  }
  if (question.type === 'REPONSE_LIBRE' && saisie.type === 'REPONSE_LIBRE') {
    // `.length` compte en UTF-16, comme `String.length` côté Java : même limite que le back.
    return saisie.texte.trim().length > 0 && saisie.texte.length <= LONGUEUR_MAX_REPONSE_LIBRE
  }
  return false
}

/**
 * Coche ou décoche une proposition de QCM (D13).
 * Choix unique : un nouveau choix remplace le précédent ; un nouveau clic sur le choix courant le décoche.
 */
export function basculerProposition(choix: number[], idProposition: number, choixMultiple = false): number[] {
  if (choix.includes(idProposition)) return choix.filter((id) => id !== idProposition)
  return choixMultiple ? [...choix, idProposition] : [idProposition]
}
