// Machine à états de l'écran E7 « Rejoindre » (plan UC8, §5 et D16). Reducer pur : ni React, ni réseau, ni stockage.
// Le hook (B2) fait les appels : GET au montage, puis POST quand ENTRER fait passer `envoi` à vrai.
//
// Transitions (toute action absente de cette liste laisse l'état inchangé) :
//
//   CHARGEMENT ──SESSION_CHARGEE (non notée)───────────▶ FORMULAIRE { saisie: '', erreur: null, suggestion: null, envoi: false }
//   CHARGEMENT ──SESSION_CHARGEE (estNotee)────────────▶ QUIZ_NOTE (titres + message, sans formulaire)
//   CHARGEMENT ──CHARGEMENT_REFUSE (404)───────────────▶ INTROUVABLE (message seul)
//   CHARGEMENT ──CHARGEMENT_REFUSE (409, ou etat CLOTUREE converti en 409 par l'api)──▶ TERMINE (message seul)
//   CHARGEMENT ──CHARGEMENT_REFUSE (autre statut), CHARGEMENT_ECHOUE (réseau, corps mal formé)
//                                                     ──▶ ECHEC_CHARGEMENT (message + « Recharger »)
//   FORMULAIRE ──SAISIE─────────────────────────────────▶ FORMULAIRE (saisie mise à jour ; erreur et suggestion gardées)
//   FORMULAIRE ──ENTRER (pseudonyme nettoyé invalide)──▶ FORMULAIRE + message du 422 (aucune requête)
//   FORMULAIRE ──ENTRER (pseudonyme nettoyé valide)────▶ FORMULAIRE { envoi: true } (erreur et suggestion effacées)
//   FORMULAIRE ──SUGGESTION_CHOISIE─────────────────────▶ FORMULAIRE { saisie: suggestion, suggestion: null, erreur: null }
//   envoi      ──ENVOI_REFUSE (affichage FORMULAIRE)────▶ FORMULAIRE { envoi: false } + message (+ suggestion)
//   envoi      ──ENVOI_REFUSE (404)─────────────────────▶ INTROUVABLE
//   envoi      ──ENVOI_REFUSE (SESSION_CLOSE)───────────▶ TERMINE
//   envoi      ──ENVOI_REFUSE (CONNEXION_IUT_REQUISE)───▶ QUIZ_NOTE
//   envoi      ──ENVOI_ECHOUE (réseau, jeton non gardé)─▶ FORMULAIRE { envoi: false } + MESSAGE_ECHEC
//   envoi      ──201────────────────────────────────────▶ (pas d'état) le hook garde le jeton et navigue vers E8 (D12)
//
// Pendant l'envoi (`envoi: true`), SAISIE, ENTRER et SUGGESTION_CHOISIE sont ignorées : un seul POST (D13), et
// le texte envoyé reste celui qui a été validé.

import { ERREURS_REJOINDRE, MESSAGE_ECHEC, lireErreurConsultation, lireErreurRejoindre } from './erreursRejoindre.ts'
import type { ErreurRecue } from './erreursRejoindre.ts'
import { pseudonymeValide } from './pseudonyme.ts'

/** Quiz lu par `GET /api/public/sessions/{codeAcces}`, une fois converti par la couche api. */
export interface SessionPublique {
  titreCours: string
  titreQuiz: string
  estNotee: boolean
}

export type EcranRejoindre =
  | { nom: 'CHARGEMENT' }
  | { nom: 'INTROUVABLE', message: string }
  | { nom: 'TERMINE', message: string }
  | { nom: 'ECHEC_CHARGEMENT', message: string }
  | { nom: 'QUIZ_NOTE', session: SessionPublique, message: string }
  | {
    nom: 'FORMULAIRE'
    session: SessionPublique
    /** Texte tel que tapé ; il est nettoyé au moment de l'envoi. */
    saisie: string
    /** Message affiché sous le champ. */
    erreur: string | null
    /** Pseudonyme proposé par le back (409 « pseudonyme pris »). */
    suggestion: string | null
    /** POST en cours : « Entrer dans le quiz » désactivé. */
    envoi: boolean
  }

export type ActionRejoindre =
  | { type: 'SESSION_CHARGEE', session: SessionPublique }
  | { type: 'CHARGEMENT_REFUSE', erreur: ErreurRecue }
  | { type: 'CHARGEMENT_ECHOUE' }
  | { type: 'SAISIE', texte: string }
  | { type: 'ENTRER' }
  | { type: 'SUGGESTION_CHOISIE' }
  | { type: 'ENVOI_REFUSE', erreur: ErreurRecue }
  /** Panne réseau pendant le POST, ou jeton impossible à garder (plan UC8, questions U1 et U5). */
  | { type: 'ENVOI_ECHOUE' }

export const ETAT_INITIAL_REJOINDRE: EcranRejoindre = { nom: 'CHARGEMENT' }

const MESSAGE_QUIZ_NOTE = ERREURS_REJOINDRE.CONNEXION_IUT_REQUISE.message as string

/** « Entrer dans le quiz » est actif : formulaire, pas d'envoi en cours, pseudonyme nettoyé valide. */
export function peutEntrer(ecran: EcranRejoindre): boolean {
  return ecran.nom === 'FORMULAIRE' && !ecran.envoi && pseudonymeValide(ecran.saisie)
}

export function reducerRejoindre(ecran: EcranRejoindre, action: ActionRejoindre): EcranRejoindre {
  switch (ecran.nom) {
    case 'CHARGEMENT':
      return depuisChargement(action) ?? ecran
    case 'FORMULAIRE':
      return ecran.envoi ? pendantEnvoi(ecran, action) : pendantSaisie(ecran, action)
    default:
      return ecran
  }
}

type Formulaire = Extract<EcranRejoindre, { nom: 'FORMULAIRE' }>

function depuisChargement(action: ActionRejoindre): EcranRejoindre | null {
  switch (action.type) {
    case 'SESSION_CHARGEE':
      return action.session.estNotee
        ? { nom: 'QUIZ_NOTE', session: action.session, message: MESSAGE_QUIZ_NOTE }
        : { nom: 'FORMULAIRE', session: action.session, saisie: '', erreur: null, suggestion: null, envoi: false }
    case 'CHARGEMENT_REFUSE':
    case 'CHARGEMENT_ECHOUE': {
      const { affichage, message } = lireErreurConsultation(action.type === 'CHARGEMENT_REFUSE' ? action.erreur : null)
      return { nom: affichage, message }
    }
    default:
      return null
  }
}

function pendantSaisie(ecran: Formulaire, action: ActionRejoindre): EcranRejoindre {
  switch (action.type) {
    case 'SAISIE':
      return { ...ecran, saisie: action.texte }
    case 'ENTRER':
      return pseudonymeValide(ecran.saisie)
        ? { ...ecran, envoi: true, erreur: null, suggestion: null }
        : { ...ecran, erreur: ERREURS_REJOINDRE.PSEUDONYME_INVALIDE.message }
    case 'SUGGESTION_CHOISIE':
      return ecran.suggestion === null ? ecran : { ...ecran, saisie: ecran.suggestion, suggestion: null, erreur: null }
    default:
      return ecran
  }
}

function pendantEnvoi(ecran: Formulaire, action: ActionRejoindre): EcranRejoindre {
  switch (action.type) {
    case 'ENVOI_REFUSE': {
      const erreur = lireErreurRejoindre(action.erreur)
      if (erreur.affichage === 'FORMULAIRE') {
        return { ...ecran, envoi: false, erreur: erreur.message, suggestion: erreur.suggestion }
      }
      if (erreur.affichage === 'QUIZ_NOTE') return { nom: 'QUIZ_NOTE', session: ecran.session, message: erreur.message }
      return { nom: erreur.affichage, message: erreur.message }
    }
    case 'ENVOI_ECHOUE':
      return { ...ecran, envoi: false, erreur: MESSAGE_ECHEC }
    default:
      return ecran
  }
}
