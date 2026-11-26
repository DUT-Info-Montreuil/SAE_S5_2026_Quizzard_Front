// Conversion des messages reçus du back en actions du reducer (plan UC9, B6). Seul fichier qui lit leur forme.
// Chaque message est validé champ par champ : un message mal formé est ignoré (`null`), avec un avertissement en
// développement seulement, sans son contenu (il peut contenir un pseudonyme).
// Aucune règle métier ici : les transitions sont dans le reducer (domain/machineReponse.ts).

import { estEnDeveloppement } from '../../../shared/config/config.ts'
import type { ActionReponse } from '../domain/machineReponse.ts'
import type { ElementARelier, Proposition, Question, ResultatQuestion } from '../domain/question.ts'
import type { CanalSeance } from './destinationsSeance.ts'

type Objet = Record<string, unknown>

function estObjet(valeur: unknown): valeur is Objet {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
}

function estNombre(valeur: unknown): valeur is number {
  return typeof valeur === 'number' && Number.isFinite(valeur)
}

function estListe<T>(valeur: unknown, lireElement: (element: unknown) => T | null): T[] | null {
  if (!Array.isArray(valeur)) return null
  const elements = valeur.map(lireElement)
  return elements.every((e) => e !== null) ? (elements as T[]) : null
}

function avertir(origine: string) {
  if (estEnDeveloppement) console.warn(`[temps réel] message ignoré (mal formé) : ${origine}`)
}

function lireProposition(valeur: unknown): Proposition | null {
  if (!estObjet(valeur) || !estNombre(valeur.idProposition) || typeof valeur.libelle !== 'string') return null
  return { idProposition: valeur.idProposition, libelle: valeur.libelle }
}

function lireElement(valeur: unknown): ElementARelier | null {
  if (!estObjet(valeur) || !estNombre(valeur.id) || typeof valeur.libelle !== 'string') return null
  return { id: valeur.id, libelle: valeur.libelle }
}

/** Question telle que décrite dans le plan UC9 §3 ; `null` si elle est mal formée. */
function lireQuestion(valeur: unknown): Question | null {
  if (!estObjet(valeur)) return null
  const { idQuestion, position, enonce, dureeSec, echeance, image } = valeur
  if (
    !estNombre(idQuestion) || !estNombre(position) || typeof enonce !== 'string' || !estNombre(dureeSec) ||
    dureeSec <= 0 || (typeof echeance !== 'string' && !estNombre(echeance)) ||
    (image !== undefined && typeof image !== 'string')
  ) {
    return null
  }
  const commun = { idQuestion, position, enonce, dureeSec, echeance, ...(image === undefined ? {} : { image }) }

  switch (valeur.type) {
    case 'QCM': {
      const propositions = estListe(valeur.propositions, lireProposition)
      const { choixMultiple } = valeur
      if (propositions === null || (choixMultiple !== undefined && typeof choixMultiple !== 'boolean')) return null
      return { ...commun, type: 'QCM', propositions, ...(choixMultiple === undefined ? {} : { choixMultiple }) }
    }
    case 'POINTS_A_RELIER': {
      const elementsGauche = estListe(valeur.elementsGauche, lireElement)
      const elementsDroite = estListe(valeur.elementsDroite, lireElement)
      if (elementsGauche === null || elementsDroite === null) return null
      return { ...commun, type: 'POINTS_A_RELIER', elementsGauche, elementsDroite }
    }
    case 'REPONSE_LIBRE':
      return { ...commun, type: 'REPONSE_LIBRE' }
    default:
      return null
  }
}

function lireResultat(valeur: unknown): ResultatQuestion | null {
  if (!estObjet(valeur)) return null
  const { points, scoreTotal, rang, nombreParticipants, evolution, bonneReponse } = valeur
  if (
    !estNombre(points) || !estNombre(scoreTotal) || !estNombre(rang) || !estNombre(nombreParticipants) ||
    !estNombre(evolution)
  ) {
    return null
  }
  const resultat: ResultatQuestion = { points, scoreTotal, rang, nombreParticipants, evolution }
  if (bonneReponse === undefined) return resultat
  const libelles = estListe(bonneReponse, (l) => (typeof l === 'string' ? l : null))
  return libelles === null ? null : { ...resultat, bonneReponse: libelles }
}

/** Convertit l'objet déjà lu d'un canal en action ; `undefined` si mal formé, `null` si sans effet. */
function convertir(canal: CanalSeance, donnees: unknown): ActionReponse | null | undefined {
  switch (canal) {
    case 'question': {
      const question = lireQuestion(donnees)
      return question === null ? undefined : { type: 'QUESTION_RECUE', question }
    }
    case 'etat':
      // Forme `{etat, position, idQuestion, echeance}` (docs/API.md du back §4) : seul `etat` est lu.
      if (!estObjet(donnees) || typeof donnees.etat !== 'string') return undefined
      // TODO(UC9): valeurs possibles de `etat` et sens de `question_close` (plan UC9, question O1). Valeur
      // provisoire : seule CLOTUREE a un effet ; la question suivante arrive par /question, la fin du temps par le
      // décompte.
      return donnees.etat === 'CLOTUREE' ? { type: 'SEANCE_CLOTUREE' } : null
    case 'correction':
      // TODO(UC9): forme de /correction inconnue (plan UC9, question B7) et aucune action du reducer pour elle.
      // Valeur provisoire : message sans effet.
      return null
    case 'resultat': {
      const resultat = lireResultat(donnees)
      return resultat === null ? undefined : { type: 'RESULTAT_RECU', resultat }
    }
  }
}

/** Convertit le corps brut d'un message STOMP en action du reducer, ou `null` s'il est sans effet ou mal formé. */
export function convertirMessage(canal: CanalSeance, corps: string): ActionReponse | null {
  let donnees: unknown
  try {
    donnees = JSON.parse(corps)
  } catch {
    avertir(canal)
    return null
  }
  const action = convertir(canal, donnees)
  if (action === undefined) {
    avertir(canal)
    return null
  }
  return action
}

/** Convertit l'en-tête `message` d'une trame ERROR en action, ou `null` si la connexion peut être retentée. */
export function convertirRefus(message: string): ActionReponse | null {
  // TODO(UC9): forme de la trame ERROR du back pour un jeton refusé inconnue (plan UC9, question O1). Valeur
  // provisoire : l'en-tête `message` contient le code JETON_INVALIDE.
  return message.includes('JETON_INVALIDE') ? { type: 'JETON_REFUSE' } : null
}

export interface Resynchronisation {
  question: Question | null
  dejaRepondu: boolean
}

/**
 * Lit le corps de `GET /api/public/sessions/{codeAcces}/etat` ; `null` s'il est mal formé.
 * TODO(UC9): forme de « état courant + score » inconnue (plan UC9, question B7). Valeur provisoire :
 * `{question: Question | null, dejaRepondu?: boolean}`, `dejaRepondu` absent = faux.
 */
export function convertirResynchronisation(donnees: unknown): Resynchronisation | null {
  if (!estObjet(donnees)) return null
  const { dejaRepondu } = donnees
  if (dejaRepondu !== undefined && typeof dejaRepondu !== 'boolean') return null
  if (donnees.question === null || donnees.question === undefined) {
    return { question: null, dejaRepondu: dejaRepondu === true }
  }
  const question = lireQuestion(donnees.question)
  return question === null ? null : { question, dejaRepondu: dejaRepondu === true }
}
