// Machine à états de l'écran de l'étudiant (plan UC9, §5). Reducer pur : ni React, ni réseau, ni horloge.
// Le temps restant est calculé par l'appelant et passé dans `resteDuTemps` (t > 0).
//
// Transitions (toute action absente de cette liste laisse l'état inchangé) :
//
//   CHARGEMENT      ──RESYNCHRONISEE (dejaRepondu)──────────────▶ CONFIRMEE
//   CHARGEMENT      ──RESYNCHRONISEE (question en cours)────────▶ SAISIE
//   CHARGEMENT      ──RESYNCHRONISEE (sinon)────────────────────▶ ATTENTE (E9)
//   ATTENTE         ──QUESTION_RECUE────────────────────────────▶ SAISIE
//   SAISIE          ──VALIDER (réponse complète, t > 0)─────────▶ ENVOI (renvoi = false ; Valider désactivé)
//   SAISIE          ──TEMPS_ECOULE──────────────────────────────▶ TEMPS_ECOULE (E9)
//   ENVOI           ──ENVOI_REUSSI (201)────────────────────────▶ CONFIRMEE (E9 « Réponse enregistrée »)
//   ENVOI (renvoi)  ──ENVOI_REFUSE (DEJA_REPONDU)───────────────▶ CONFIRMEE (D14)
//   ENVOI           ──ENVOI_REFUSE (401)────────────────────────▶ SESSION_EXPIREE (E9, état final)
//   ENVOI           ──ENVOI_REFUSE (422 ou 500, t > 0)──────────▶ SAISIE + message (E8)
//   ENVOI           ──ENVOI_REFUSE (422 ou 500 avec t = 0, 409, 400)──▶ REFUSEE (E9 + message)
//   ENVOI           ──ECHEC_RESEAU──────────────────────────────▶ ENVOI (renvoi = true, connexion perdue)
//   ENVOI (renvoi)  ──RECONNEXION (t > 0)───────────────────────▶ ENVOI (l'appelant renvoie le même corps)
//   ENVOI (renvoi)  ──RECONNEXION (t = 0)───────────────────────▶ CHARGEMENT
//   CONFIRMEE | TEMPS_ECOULE | REFUSEE ──RESULTAT_RECU──────────▶ RESULTAT (E9)
//   tout état sauf SESSION_EXPIREE ──QUESTION_RECUE (nouvelle)──▶ SAISIE (remise à zéro)
//   tout état sauf SESSION_EXPIREE ──SEANCE_CLOTUREE────────────▶ SEANCE_CLOSE
//   tout état sauf SESSION_EXPIREE ──JETON_REFUSE (trame ERROR STOMP)──▶ SESSION_EXPIREE (message de JETON_INVALIDE)
//   tout état sauf SESSION_EXPIREE ──CONNEXION_PERDUE───────────▶ même état, connexion perdue (bandeau)
//   tout état sauf SESSION_EXPIREE et ENVOI (renvoi) ──RECONNEXION──▶ CHARGEMENT
//   SESSION_EXPIREE : état final, aucune transition.
//
// « Nouvelle » question : identifiant différent de la question courante ; la même question rediffusée est ignorée.

import { corpsReponse } from './corpsReponse.ts'
import type { CorpsReponse } from './corpsReponse.ts'
import { codeErreur, lireErreurEnvoi } from './erreursReponse.ts'
import type { ErreurAffichee, ErreurEnvoi } from './erreursReponse.ts'
import { reponseComplete } from './question.ts'
import type { Question, ReponseSaisie, ResultatQuestion } from './question.ts'

export type Ecran =
  | { nom: 'CHARGEMENT' }
  | { nom: 'ATTENTE' }
  | { nom: 'SAISIE', question: Question, erreur: ErreurAffichee | null }
  | { nom: 'ENVOI', question: Question, corps: CorpsReponse, renvoi: boolean }
  | { nom: 'CONFIRMEE', idQuestion: number | null }
  | { nom: 'TEMPS_ECOULE', idQuestion: number }
  | { nom: 'REFUSEE', idQuestion: number, erreur: ErreurAffichee }
  | { nom: 'SESSION_EXPIREE', erreur: ErreurAffichee }
  | { nom: 'RESULTAT', resultat: ResultatQuestion }
  | { nom: 'SEANCE_CLOSE' }

export interface EtatReponse {
  ecran: Ecran
  /** Indicateur à part : bandeau « connexion perdue ». */
  connexionPerdue: boolean
}

export type ActionReponse =
  // TODO(UC9): forme de GET .../etat inconnue (plan UC9, question B7). Valeur provisoire : question en cours et
  // `dejaRepondu`, déjà convertis par la couche api.
  | { type: 'RESYNCHRONISEE', question: Question | null, dejaRepondu: boolean }
  | { type: 'QUESTION_RECUE', question: Question }
  | { type: 'VALIDER', saisie: ReponseSaisie, resteDuTemps: boolean }
  | { type: 'TEMPS_ECOULE' }
  | { type: 'ENVOI_REUSSI' }
  | { type: 'ENVOI_REFUSE', erreur: ErreurEnvoi, resteDuTemps: boolean }
  | { type: 'ECHEC_RESEAU' }
  | { type: 'CONNEXION_PERDUE' }
  | { type: 'RECONNEXION', resteDuTemps: boolean }
  | { type: 'RESULTAT_RECU', resultat: ResultatQuestion }
  | { type: 'SEANCE_CLOTUREE' }
  /** Jeton refusé à la connexion STOMP (plan UC9, B6). */
  | { type: 'JETON_REFUSE' }

export const ETAT_INITIAL: EtatReponse = { ecran: { nom: 'CHARGEMENT' }, connexionPerdue: false }

/** Identifiant de la question à laquelle se rapporte l'écran, s'il y en a une. */
function idQuestionCourante(ecran: Ecran): number | null {
  switch (ecran.nom) {
    case 'SAISIE':
    case 'ENVOI':
      return ecran.question.idQuestion
    case 'CONFIRMEE':
    case 'TEMPS_ECOULE':
    case 'REFUSEE':
      return ecran.idQuestion
    default:
      return null
  }
}

function vers(etat: EtatReponse, ecran: Ecran): EtatReponse {
  return { ...etat, ecran }
}

export function reducerReponse(etat: EtatReponse, action: ActionReponse): EtatReponse {
  const { ecran } = etat
  if (ecran.nom === 'SESSION_EXPIREE') return etat

  switch (action.type) {
    case 'RESYNCHRONISEE':
      if (ecran.nom !== 'CHARGEMENT') return etat
      if (action.dejaRepondu) {
        return vers(etat, { nom: 'CONFIRMEE', idQuestion: action.question?.idQuestion ?? null })
      }
      if (action.question !== null) return vers(etat, { nom: 'SAISIE', question: action.question, erreur: null })
      return vers(etat, { nom: 'ATTENTE' })

    case 'QUESTION_RECUE':
      if (idQuestionCourante(ecran) === action.question.idQuestion) return etat
      return vers(etat, { nom: 'SAISIE', question: action.question, erreur: null })

    case 'VALIDER': {
      if (ecran.nom !== 'SAISIE' || !action.resteDuTemps) return etat
      if (!reponseComplete(ecran.question, action.saisie)) return etat
      const corps = corpsReponse(ecran.question, action.saisie)
      if (corps === null) return etat
      return vers(etat, { nom: 'ENVOI', question: ecran.question, corps, renvoi: false })
    }

    case 'TEMPS_ECOULE':
      if (ecran.nom !== 'SAISIE') return etat
      return vers(etat, { nom: 'TEMPS_ECOULE', idQuestion: ecran.question.idQuestion })

    case 'ENVOI_REUSSI':
      if (ecran.nom !== 'ENVOI') return etat
      return vers(etat, { nom: 'CONFIRMEE', idQuestion: ecran.question.idQuestion })

    case 'ENVOI_REFUSE': {
      if (ecran.nom !== 'ENVOI') return etat
      const { idQuestion } = ecran.question
      if (ecran.renvoi && codeErreur(action.erreur) === 'DEJA_REPONDU') {
        return vers(etat, { nom: 'CONFIRMEE', idQuestion })
      }
      const erreur = lireErreurEnvoi(action.erreur, action.resteDuTemps)
      if (erreur.code === 'JETON_INVALIDE') return vers(etat, { nom: 'SESSION_EXPIREE', erreur })
      if (erreur.corrigeable) return vers(etat, { nom: 'SAISIE', question: ecran.question, erreur })
      return vers(etat, { nom: 'REFUSEE', idQuestion, erreur })
    }

    case 'ECHEC_RESEAU':
      if (ecran.nom !== 'ENVOI') return etat
      return { ecran: { ...ecran, renvoi: true }, connexionPerdue: true }

    case 'CONNEXION_PERDUE':
      return { ...etat, connexionPerdue: true }

    case 'RECONNEXION':
      if (ecran.nom === 'ENVOI' && ecran.renvoi && action.resteDuTemps) return { ecran, connexionPerdue: false }
      return { ecran: { nom: 'CHARGEMENT' }, connexionPerdue: false }

    case 'RESULTAT_RECU':
      if (ecran.nom !== 'CONFIRMEE' && ecran.nom !== 'TEMPS_ECOULE' && ecran.nom !== 'REFUSEE') return etat
      return vers(etat, { nom: 'RESULTAT', resultat: action.resultat })

    case 'SEANCE_CLOTUREE':
      return vers(etat, { nom: 'SEANCE_CLOSE' })

    case 'JETON_REFUSE':
      return {
        ecran: {
          nom: 'SESSION_EXPIREE',
          erreur: lireErreurEnvoi({ statut: 401, code: 'JETON_INVALIDE', error: null }, false),
        },
        connexionPerdue: false,
      }
  }
}
