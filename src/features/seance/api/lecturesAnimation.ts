// Lecture des données reçues du back pour l'animation d'une séance (UC7) : seul fichier qui connaît leur forme.
// Chaque donnée est vérifiée champ par champ ; mal formée, elle est refusée (`null`).

import type {
  ActionSeance, Correction, EtatSeance, NombreParProposition, QuestionProjetee, Repartition, SeanceLancee, TypeEcran,
} from '../domain/seanceAnimee.ts'
import type { ElementARelier, Proposition } from '../domain/question.ts'
import type { CanalAnimation } from './destinationsAnimation.ts'

type Objet = Record<string, unknown>

function estObjet(v: unknown): v is Objet {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function estNombre(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function estTexte(v: unknown): v is string {
  return typeof v === 'string'
}

const lireNombre = (v: unknown) => (estNombre(v) ? v : null)
const lireTexte = (v: unknown) => (estTexte(v) ? v : null)

function lireListe<T>(v: unknown, lire: (element: unknown) => T | null): T[] | null {
  if (!Array.isArray(v)) return null
  const elements = v.map(lire)
  return elements.every((e) => e !== null) ? (elements as T[]) : null
}

function lireProposition(v: unknown): Proposition | null {
  return estObjet(v) && estNombre(v.idProposition) && estTexte(v.libelle)
    ? { idProposition: v.idProposition, libelle: v.libelle }
    : null
}

function lireElement(v: unknown): ElementARelier | null {
  return estObjet(v) && estNombre(v.id) && estTexte(v.libelle) ? { id: v.id, libelle: v.libelle } : null
}

function lireCompte(v: unknown): NombreParProposition | null {
  return estObjet(v) && estNombre(v.idProposition) && estNombre(v.nombre)
    ? { idProposition: v.idProposition, nombre: v.nombre }
    : null
}

function lireQuestion(v: unknown): QuestionProjetee | null {
  if (!estObjet(v)) return null
  const { idQuestion, position, enonce, dureeSec, echeance = null } = v
  if (
    !estNombre(idQuestion) || !estNombre(position) || !estTexte(enonce) || !estNombre(dureeSec) ||
    (echeance !== null && !estTexte(echeance) && !estNombre(echeance))
  ) {
    return null
  }
  const commun = { idQuestion, position, enonce, dureeSec, echeance }
  switch (v.type) {
    case 'QCM': {
      const propositions = lireListe(v.propositions, lireProposition)
      return propositions && { ...commun, type: 'QCM', propositions }
    }
    case 'POINTS_A_RELIER': {
      const elementsGauche = lireListe(v.elementsGauche, lireElement)
      const elementsDroite = lireListe(v.elementsDroite, lireElement)
      return elementsGauche && elementsDroite && { ...commun, type: 'POINTS_A_RELIER', elementsGauche, elementsDroite }
    }
    case 'REPONSE_LIBRE':
      return { ...commun, type: 'REPONSE_LIBRE' }
    default:
      return null
  }
}

function lireRepartition(v: unknown): Repartition | null {
  if (!estObjet(v) || !estNombre(v.idQuestion) || !estNombre(v.total)) return null
  // Question sans propositions : la liste peut manquer.
  const propositions = v.propositions == null ? [] : lireListe(v.propositions, lireCompte)
  return propositions && { idQuestion: v.idQuestion, total: v.total, propositions }
}

function lireCorrection(v: unknown): Correction | null {
  if (!estObjet(v) || !estNombre(v.idQuestion) || !estNombre(v.position) || !estNombre(v.total)) return null
  const bonnesPropositions = lireListe(v.bonnesPropositions, lireNombre)
  const paires = lireListe(v.paires, (p) =>
    estObjet(p) && estTexte(p.libelleGauche) && estTexte(p.libelleDroite)
      ? { libelleGauche: p.libelleGauche, libelleDroite: p.libelleDroite }
      : null)
  const reponsesAcceptees = lireListe(v.reponsesAcceptees, lireTexte)
  const repartition = lireListe(v.repartition, lireCompte)
  if (!bonnesPropositions || !paires || !reponsesAcceptees || !repartition) return null
  return {
    idQuestion: v.idQuestion, position: v.position, total: v.total,
    bonnesPropositions, paires, reponsesAcceptees, repartition,
  }
}

export function lireSeanceLancee(v: unknown): SeanceLancee | null {
  return estObjet(v) && estNombre(v.idSession) ? { idSession: v.idSession } : null
}

/** Corps de `GET /api/sessions/{idSession}` et des commandes ; les champs sans valeur sont absents. */
export function lireEtatSeance(v: unknown): EtatSeance | null {
  if (!estObjet(v)) return null
  const { idSession, titre, statut, modeNote, nbQuestions, position, codeAcces, connectes, questionOuverte } = v
  if (
    !estNombre(idSession) || !estTexte(titre) ||
    (statut !== 'PREPAREE' && statut !== 'EN_COURS' && statut !== 'CLOTUREE') ||
    typeof modeNote !== 'boolean' || !estNombre(nbQuestions) || !estNombre(position) || !estTexte(codeAcces) ||
    !estNombre(connectes) || typeof questionOuverte !== 'boolean'
  ) {
    return null
  }
  const question = v.question == null ? null : lireQuestion(v.question)
  if (v.question != null && question === null) return null
  return {
    idSession, titre, statut, modeNote, nbQuestions, position, codeAcces, connectes, questionOuverte, question,
    lienAcces: lireTexte(v.lienAcces),
    qrCode: lireTexte(v.qrCode),
    tempsRestantMs: lireNombre(v.tempsRestantMs),
    repartition: lireRepartition(v.repartition),
    correction: lireCorrection(v.correction),
  }
}

function lireEcran(v: unknown): TypeEcran | null {
  return v === 'BONNE_REPONSE' || v === 'REPARTITION' || v === 'CLASSEMENT' ? v : null
}

/** Convertit un message STOMP en action du réducteur ; `null` s'il est sans effet ou mal formé. */
export function convertirMessageAnimation(canal: CanalAnimation, corps: string, recuA: number): ActionSeance | null {
  let v: unknown
  try {
    v = JSON.parse(corps)
  } catch {
    return null
  }
  if (!estObjet(v)) return null
  switch (canal) {
    case 'etat':
      // Les autres changements d'état arrivent, complets, par `question` et `correction`.
      return v.etat === 'CLOTUREE' ? { type: 'SEANCE_TERMINEE' } : null
    case 'question': {
      const question = lireQuestion(v)
      return question && { type: 'QUESTION_DEMARREE', question, recuA }
    }
    case 'correction': {
      const correction = lireCorrection(v)
      return correction && { type: 'QUESTION_CLOSE', correction }
    }
    case 'repartition': {
      const repartition = lireRepartition(v)
      return repartition && { type: 'REPARTITION_RECUE', repartition }
    }
    case 'connectes':
      return estNombre(v.nombre) ? { type: 'CONNECTES_RECUS', nombre: v.nombre } : null
    case 'ecran': {
      const ecran = lireEcran(v.type)
      return estNombre(v.idQuestion) && ecran !== null
        ? { type: 'ECRAN_DEMANDE', idQuestion: v.idQuestion, ecran }
        : null
    }
  }
}
