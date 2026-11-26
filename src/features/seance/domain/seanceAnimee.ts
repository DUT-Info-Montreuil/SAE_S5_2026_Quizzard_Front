// Séance vue par l'enseignant qui l'anime (UC7, écran E5) : types, règles et réducteur.
// Domaine pur : aucun import de React, du réseau ni de STOMP.

import { echeanceQuestion } from './echeance.ts'
import type { ElementARelier, Proposition } from './question.ts'

/** PREPAREE : lancée, avant la première question. */
export type StatutSeance = 'PREPAREE' | 'EN_COURS' | 'CLOTUREE'

export type TypeEcran = 'BONNE_REPONSE' | 'REPARTITION' | 'CLASSEMENT'

/** Question projetée : jamais de réponse attendue. `echeance` vaut `null` une fois la question close. */
interface QuestionProjeteeCommune {
  idQuestion: number
  position: number
  enonce: string
  dureeSec: number
  echeance: string | number | null
}

export type QuestionProjetee =
  | (QuestionProjeteeCommune & { type: 'QCM', propositions: Proposition[] })
  | (QuestionProjeteeCommune & {
    type: 'POINTS_A_RELIER'
    elementsGauche: ElementARelier[]
    elementsDroite: ElementARelier[]
  })
  | (QuestionProjeteeCommune & { type: 'REPONSE_LIBRE' })

export interface NombreParProposition {
  idProposition: number
  nombre: number
}

/** Réponses reçues ; une proposition jamais cochée est absente. */
export interface Repartition {
  idQuestion: number
  total: number
  propositions: NombreParProposition[]
}

export interface Correction {
  idQuestion: number
  position: number
  bonnesPropositions: number[]
  paires: { libelleGauche: string, libelleDroite: string }[]
  reponsesAcceptees: string[]
  total: number
  repartition: NombreParProposition[]
}

/** Séance créée par le lancement (201) ; E5 relit ensuite l'état complet. */
export interface SeanceLancee {
  idSession: number
}

/** État complet lu par REST. */
export interface EtatSeance {
  idSession: number
  titre: string
  statut: StatutSeance
  modeNote: boolean
  nbQuestions: number
  /** Rang de la question courante ; 0 avant la première. */
  position: number
  codeAcces: string
  /** Absents d'une séance terminée : le lien et le QR code ne valent plus rien. */
  lienAcces: string | null
  qrCode: string | null
  connectes: number
  questionOuverte: boolean
  question: QuestionProjetee | null
  tempsRestantMs: number | null
  repartition: Repartition | null
  correction: Correction | null
}

/** Fin de la question ouverte, sur l'heure du serveur (heure de l'appareil + `ecartMs`). */
export interface FinDeQuestion {
  echeanceMs: number
  ecartMs: number
}

export interface SeanceEnDirect {
  seance: EtatSeance
  fin: FinDeQuestion | null
  /** Écran intermédiaire demandé par le serveur ; `null` avant le premier. */
  ecran: TypeEcran | null
  /** Dernier écart connu avec l'heure du serveur ; `null` si inconnu. */
  ecartMs: number | null
}

export type ActionSeance =
  /** État relu par REST. `ecartMs` : écart relevé sur l'en-tête Date de cette réponse. */
  | { type: 'ETAT_RELU', seance: EtatSeance, ecartMs: number | null, recuA: number }
  | { type: 'QUESTION_DEMARREE', question: QuestionProjetee, recuA: number }
  | { type: 'QUESTION_CLOSE', correction: Correction }
  | { type: 'REPARTITION_RECUE', repartition: Repartition }
  | { type: 'CONNECTES_RECUS', nombre: number }
  | { type: 'ECRAN_DEMANDE', idQuestion: number, ecran: TypeEcran }
  | { type: 'SEANCE_TERMINEE' }

/**
 * Avancement d'une séance, qui ne recule jamais : sert à ignorer une lecture REST ou un message arrivé en retard
 * (une lecture partie avant la clôture d'une question peut revenir après le message qui l'annonce).
 */
function avancement(s: Pick<EtatSeance, 'statut' | 'position' | 'questionOuverte'>): number {
  if (s.statut === 'CLOTUREE') return Number.POSITIVE_INFINITY
  return s.position * 2 + (s.position > 0 && !s.questionOuverte ? 1 : 0)
}

function finDe(question: QuestionProjetee, ecartMs: number | null, recuA: number): FinDeQuestion {
  // Échéance absente : texte vide, illisible, donc décompte calé sur la durée (repli de `echeanceQuestion`).
  const fin = echeanceQuestion({ echeance: question.echeance ?? '', dureeSec: question.dureeSec }, ecartMs, recuA)
  return { echeanceMs: fin.echeanceMs, ecartMs: fin.ecartMs }
}

/** `tempsRestantMs` est calculé par le serveur avec l'état : c'est la mesure la plus précise de la fin. */
function finDeLEtat(seance: EtatSeance, ecartMs: number | null, recuA: number): FinDeQuestion | null {
  if (!seance.questionOuverte || seance.question === null) return null
  if (seance.tempsRestantMs === null) return finDe(seance.question, ecartMs, recuA)
  return { echeanceMs: recuA + seance.tempsRestantMs, ecartMs: 0 }
}

function repartitionLaPlusRecente(a: Repartition | null, b: Repartition | null): Repartition | null {
  if (a === null || b === null || a.idQuestion !== b.idQuestion) return b ?? a
  return b.total >= a.total ? b : a
}

export function reduireSeance(etat: SeanceEnDirect | null, action: ActionSeance): SeanceEnDirect | null {
  if (action.type === 'ETAT_RELU') {
    const ecartMs = action.ecartMs ?? etat?.ecartMs ?? null
    const fin = finDeLEtat(action.seance, ecartMs, action.recuA)
    if (etat === null) return { seance: action.seance, fin, ecran: null, ecartMs }
    const ancien = avancement(etat.seance)
    const nouveau = avancement(action.seance)
    if (nouveau < ancien) return { ...etat, ecartMs }
    if (nouveau > ancien) {
      const memeQuestion = action.seance.position === etat.seance.position
      return { seance: action.seance, fin, ecran: memeQuestion ? etat.ecran : null, ecartMs }
    }
    return {
      ...etat,
      ecartMs,
      fin,
      seance: {
        ...action.seance,
        repartition: repartitionLaPlusRecente(etat.seance.repartition, action.seance.repartition),
      },
    }
  }

  if (etat === null || estTerminee(etat.seance)) return etat
  const { seance } = etat

  switch (action.type) {
    case 'QUESTION_DEMARREE': {
      const { question } = action
      if (question.position <= seance.position) return etat
      return {
        ...etat,
        ecran: null,
        fin: finDe(question, etat.ecartMs, action.recuA),
        seance: {
          ...seance,
          statut: 'EN_COURS',
          position: question.position,
          questionOuverte: true,
          question,
          tempsRestantMs: null,
          repartition: null,
          correction: null,
        },
      }
    }
    case 'QUESTION_CLOSE': {
      const { correction } = action
      if (seance.question?.idQuestion !== correction.idQuestion || seance.position !== correction.position) return etat
      return {
        ...etat,
        fin: null,
        seance: {
          ...seance,
          questionOuverte: false,
          correction,
          repartition: {
            idQuestion: correction.idQuestion, total: correction.total, propositions: correction.repartition,
          },
        },
      }
    }
    case 'REPARTITION_RECUE': {
      const { repartition } = action
      if (!seance.questionOuverte || seance.question?.idQuestion !== repartition.idQuestion) return etat
      return {
        ...etat,
        seance: { ...seance, repartition: repartitionLaPlusRecente(seance.repartition, repartition) },
      }
    }
    case 'CONNECTES_RECUS':
      return { ...etat, seance: { ...seance, connectes: action.nombre } }
    case 'ECRAN_DEMANDE':
      return seance.question?.idQuestion === action.idQuestion ? { ...etat, ecran: action.ecran } : etat
    case 'SEANCE_TERMINEE':
      return {
        ...etat,
        fin: null,
        seance: { ...seance, statut: 'CLOTUREE', questionOuverte: false, lienAcces: null, qrCode: null },
      }
  }
}

export function estTerminee(seance: Pick<EtatSeance, 'statut'>): boolean {
  return seance.statut === 'CLOTUREE'
}

/** Libellé de la commande « question suivante » : après la dernière question, elle termine la séance. */
export function libelleSuivant(seance: Pick<EtatSeance, 'position' | 'nbQuestions'>): string {
  if (seance.position === 0) return 'Démarrer'
  return seance.position >= seance.nbQuestions ? 'Terminer' : 'Suivant'
}

/** Une barre de l'histogramme, dans l'ordre d'affichage des propositions. */
export interface Barre {
  idProposition: number
  lettre: string
  libelle: string
  nombre: number
  /** Part des réponses reçues, de 0 à 1 (en choix multiple, la somme des parts peut dépasser 1). */
  part: number
  /** Faux tant que la question n'est pas close. */
  bonne: boolean
}

export function barres(
  propositions: Proposition[], repartition: Repartition | null, correction: Correction | null,
): Barre[] {
  const total = repartition?.total ?? 0
  return propositions.map((p, i) => {
    const nombre = repartition?.propositions.find((n) => n.idProposition === p.idProposition)?.nombre ?? 0
    return {
      idProposition: p.idProposition,
      lettre: String.fromCharCode(65 + i),
      libelle: p.libelle,
      nombre,
      part: total > 0 ? nombre / total : 0,
      bonne: correction?.bonnesPropositions.includes(p.idProposition) ?? false,
    }
  })
}
