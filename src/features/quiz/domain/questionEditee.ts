// Question et déroulé d'un quiz en cours d'édition dans E3 (éléments 5 à 8 et 12 à 18 ; UC4, UC5, UC13, UC14).
// Domaine pur : aucun import de React ni du réseau. Règles reprises de la « Charte Editeur » (docs/maquettes) :
//   5 type obligatoire ; 6 énoncé obligatoire ; 7 QCM : 2 propositions et 1 bonne réponse au moins, relier : 2 paires
//   au moins ; 8 durée en secondes, bornes à fixer (par exemple 10 s à 10 min).
// TODO(UC4): l'enregistrement par le back (POST /api/quiz/{idQuiz}/questions, PUT /api/questions/{idQuestion}) n'est
// pas branché : ces types servent à l'écran et à la démo. Formes provisoires, à aligner sur le back à l'UC4.

export type TypeQuestion = 'QCM' | 'POINTS_A_RELIER' | 'REPONSE_LIBRE'

export interface PropositionEditee {
  id: number
  libelle: string
  correcte: boolean
}

export interface PaireEditee {
  id: number
  gauche: string
  droite: string
}

export interface QuestionEditee {
  type: TypeQuestion
  enonce: string
  propositions: PropositionEditee[]
  paires: PaireEditee[]
  /** Réponses acceptées d'une réponse libre (motifs simples). */
  reponsesAcceptees: string[]
  dureeSec: number
  /** Barème (élément 12) : 1000 par défaut (docs/DESIGN.md, E3). */
  pointsMax: number
  decroissance: boolean
  pointsPartiels: boolean
  /** Adresse locale de l'image choisie (élément 18) ; `null` sans image. */
  image: string | null
}

export type TypeEcranIntermediaire = 'BONNE_REPONSE' | 'REPARTITION' | 'CLASSEMENT'

export interface EcranIntermediaireEdite {
  type: TypeEcranIntermediaire
  actif: boolean
  /** Délai après la clôture, en secondes (0 : à la clôture). */
  delaiSec: number
}

/** Déroulé du quiz (éléments 14 à 17). */
export interface DerouleQuiz {
  note: boolean
  /** Élément 17, mode d'affichage du cours en séance (à valider avec le client). */
  coursSurTelephones: boolean
  passage: 'MANUEL' | 'AUTO'
  ecrans: EcranIntermediaireEdite[]
}

/** Durées proposées (élément 8), d'après la maquette. TODO(UC5): bornes à fixer avec le client. */
export const DUREES_PROPOSEES = [10, 20, 30, 45, 60] as const

/** Quatre couleurs et lettres de réponse (charte §1) : au plus quatre propositions. */
export const PROPOSITIONS_MAX = 4
export const PROPOSITIONS_MIN = 2
export const PAIRES_MIN = 2

export const DEROULE_PAR_DEFAUT: DerouleQuiz = {
  note: false,
  coursSurTelephones: false,
  passage: 'MANUEL',
  ecrans: [
    { type: 'BONNE_REPONSE', actif: true, delaiSec: 0 },
    { type: 'REPARTITION', actif: true, delaiSec: 3 },
    { type: 'CLASSEMENT', actif: false, delaiSec: 0 },
  ],
}

let prochainId = 1_000
const nouvelId = () => prochainId++

export function questionVide(type: TypeQuestion = 'QCM'): QuestionEditee {
  return {
    type,
    enonce: '',
    propositions: [
      { id: nouvelId(), libelle: '', correcte: false },
      { id: nouvelId(), libelle: '', correcte: false },
    ],
    paires: [{ id: nouvelId(), gauche: '', droite: '' }, { id: nouvelId(), gauche: '', droite: '' }],
    reponsesAcceptees: [''],
    dureeSec: 30,
    pointsMax: 1000,
    decroissance: true,
    pointsPartiels: false,
    image: null,
  }
}

const rempli = (texte: string) => texte.trim() !== ''

/** Vrai si la question peut être lancée (pré-condition de l'UC7 : aucune question incomplète). */
export function questionComplete(q: QuestionEditee): boolean {
  if (!rempli(q.enonce) || q.dureeSec <= 0) return false
  switch (q.type) {
    case 'QCM': {
      const remplies = q.propositions.filter((p) => rempli(p.libelle))
      return remplies.length >= PROPOSITIONS_MIN && remplies.length === q.propositions.length &&
        remplies.some((p) => p.correcte)
    }
    case 'POINTS_A_RELIER':
      return q.paires.length >= PAIRES_MIN && q.paires.every((p) => rempli(p.gauche) && rempli(p.droite))
    case 'REPONSE_LIBRE':
      return q.reponsesAcceptees.some(rempli)
  }
}

export type ActionQuestion =
  | { type: 'TYPE', valeur: TypeQuestion }
  | { type: 'ENONCE', valeur: string }
  | { type: 'PROPOSITION', id: number, libelle: string }
  | { type: 'BASCULER_CORRECTE', id: number }
  | { type: 'AJOUTER_PROPOSITION' }
  | { type: 'RETIRER_PROPOSITION', id: number }
  | { type: 'PAIRE', id: number, cote: 'gauche' | 'droite', valeur: string }
  | { type: 'AJOUTER_PAIRE' }
  | { type: 'RETIRER_PAIRE', id: number }
  | { type: 'REPONSE_ACCEPTEE', indice: number, valeur: string }
  | { type: 'AJOUTER_REPONSE_ACCEPTEE' }
  | { type: 'RETIRER_REPONSE_ACCEPTEE', indice: number }
  | { type: 'DUREE', valeur: number }
  | { type: 'POINTS_MAX', valeur: number }
  | { type: 'BASCULER_DECROISSANCE' }
  | { type: 'BASCULER_POINTS_PARTIELS' }
  | { type: 'IMAGE', valeur: string | null }

export function reduireQuestion(q: QuestionEditee, action: ActionQuestion): QuestionEditee {
  switch (action.type) {
    case 'TYPE':
      return { ...q, type: action.valeur }
    case 'ENONCE':
      return { ...q, enonce: action.valeur }
    case 'PROPOSITION':
      return { ...q, propositions: q.propositions.map((p) => p.id === action.id ? { ...p, libelle: action.libelle } : p) }
    case 'BASCULER_CORRECTE':
      return { ...q, propositions: q.propositions.map((p) => p.id === action.id ? { ...p, correcte: !p.correcte } : p) }
    case 'AJOUTER_PROPOSITION':
      if (q.propositions.length >= PROPOSITIONS_MAX) return q
      return { ...q, propositions: [...q.propositions, { id: nouvelId(), libelle: '', correcte: false }] }
    case 'RETIRER_PROPOSITION':
      if (q.propositions.length <= PROPOSITIONS_MIN) return q
      return { ...q, propositions: q.propositions.filter((p) => p.id !== action.id) }
    case 'PAIRE':
      return { ...q, paires: q.paires.map((p) => p.id === action.id ? { ...p, [action.cote]: action.valeur } : p) }
    case 'AJOUTER_PAIRE':
      return { ...q, paires: [...q.paires, { id: nouvelId(), gauche: '', droite: '' }] }
    case 'RETIRER_PAIRE':
      if (q.paires.length <= PAIRES_MIN) return q
      return { ...q, paires: q.paires.filter((p) => p.id !== action.id) }
    case 'REPONSE_ACCEPTEE':
      return { ...q, reponsesAcceptees: q.reponsesAcceptees.map((r, i) => i === action.indice ? action.valeur : r) }
    case 'AJOUTER_REPONSE_ACCEPTEE':
      return { ...q, reponsesAcceptees: [...q.reponsesAcceptees, ''] }
    case 'RETIRER_REPONSE_ACCEPTEE':
      if (q.reponsesAcceptees.length <= 1) return q
      return { ...q, reponsesAcceptees: q.reponsesAcceptees.filter((_, i) => i !== action.indice) }
    case 'DUREE':
      return action.valeur > 0 ? { ...q, dureeSec: action.valeur } : q
    case 'POINTS_MAX':
      return Number.isInteger(action.valeur) && action.valeur >= 0 ? { ...q, pointsMax: action.valeur } : q
    case 'BASCULER_DECROISSANCE':
      return { ...q, decroissance: !q.decroissance }
    case 'BASCULER_POINTS_PARTIELS':
      return { ...q, pointsPartiels: !q.pointsPartiels }
    case 'IMAGE':
      return { ...q, image: action.valeur }
  }
}

/** Active ou désactive un écran intermédiaire (élément 16). */
export function basculerEcran(deroule: DerouleQuiz, type: TypeEcranIntermediaire): DerouleQuiz {
  return { ...deroule, ecrans: deroule.ecrans.map((e) => e.type === type ? { ...e, actif: !e.actif } : e) }
}

/** Types d'image acceptés et taille maximale (élément 18, maquette : « PNG, JPEG ou WebP · 2 Mo maximum »). */
export const TYPES_IMAGE = ['image/png', 'image/jpeg', 'image/webp'] as const
export const TAILLE_IMAGE_MAX = 2 * 1024 * 1024

export function imageAcceptee(fichier: { type: string, size: number }): boolean {
  return (TYPES_IMAGE as readonly string[]).includes(fichier.type) && fichier.size <= TAILLE_IMAGE_MAX
}
