// Machine à états de l'éditeur E3 (plan UC3, §6, D11, D12 et D15). Reducer pur : ni React, ni réseau, ni PDF.js.
// Le chargement, l'extraction du repère et le POST sont faits par l'appelant (hook, B5), qui envoie les actions.
//
// Transitions (toute action absente de cette liste laisse l'état inchangé) :
//
//   CHARGEMENT        ──CHARGE (cours non archivé)──────────────▶ PRET (sélection : page 1 du PDF, insertion AUCUNE)
//   CHARGEMENT        ──CHARGE (cours archivé)──────────────────▶ LECTURE_SEULE (sélection : page 1 du PDF)
//   CHARGEMENT        ──ECHEC_CHARGEMENT (401)──────────────────▶ CONNEXION (redirection vers E1, état final)
//   CHARGEMENT        ──ECHEC_CHARGEMENT (autre, ou réseau)─────▶ ERREUR_CHARGEMENT (message + « Recharger »)
//   ERREUR_CHARGEMENT | LECTURE_SEULE | PRET (hors ENVOI) ──RECHARGER──▶ CHARGEMENT
//   LECTURE_SEULE     ──SELECTIONNER────────────────────────────▶ LECTURE_SEULE (sélection changée)
//
//   PRET, insertion :
//   AUCUNE            ──SELECTIONNER────────────────────────────▶ AUCUNE (sélection changée)
//   AUCUNE            ──OUVRIR_CHOIX (insertion non bloquée)────▶ CHOIX_QUIZ (quiz proposé : `quizParDefaut`)
//   CHOIX_QUIZ        ──ANNULER_CHOIX (« Annuler » ou Échap)────▶ AUCUNE
//   CHOIX_QUIZ        ──CONFIRMER (idQuiz, ou null : nouveau)───▶ ENVOI (message effacé, boutons désactivés)
//   ENVOI             ──INSERTION_REUSSIE (201)─────────────────▶ AUCUNE : pages = réponse.pages, quiz ajouté si
//                                                                  quizCree, sélection = nouvelle page
//   ENVOI             ──INSERTION_REFUSEE (401)─────────────────▶ CONNEXION
//   ENVOI             ──INSERTION_REFUSEE (VERSION_PERIMEE, EMPLACEMENT_INVALIDE)──▶ AUCUNE + message +
//                                                                  « Recharger », insertion bloquée
//   ENVOI             ──INSERTION_REFUSEE (autre)───────────────▶ AUCUNE + message (+ « Recharger » si §4)
//   ENVOI             ──ECHEC_RESEAU_INSERTION──────────────────▶ AUCUNE + message provisoire + « Recharger » ;
//                                                                  pages = pages relues par le hook, si la relecture
//                                                                  a réussi (la page a peut-être été créée)
//   ENVOI             : OUVRIR_CHOIX, CONFIRMER, RECHARGER, SELECTIONNER ignorés (une seule insertion à la fois, D12)
//
// « Erreur d'insertion » : PRET, insertion AUCUNE, `erreur` non nulle (bandeau). Elle s'efface à la tentative
// suivante (CONFIRMER) ou au rechargement.

import type { Cours, Emplacement, PageInseree, PageQuizInseree, QuizResume } from './cours.ts'
import { erreurReseauInsertion, lireErreurChargement, lireErreurInsertion } from './erreursEditeur.ts'
import type { ErreurChargement, ErreurEditeur, ErreurRecue } from './erreursEditeur.ts'

/** Page affichée dans l'aperçu (élément 4 de E3). */
export type Selection =
  | { genre: 'PAGE_PDF', numeroPage: number }
  /** `titreQuiz` : `null` pour une page de classement. */
  | { genre: 'PAGE_INSEREE', idPage: number, titreQuiz: string | null }

/** Données de l'éditeur une fois chargé. */
export interface DonneesEditeur {
  cours: Cours
  /** Nombre de pages affichées : `nbPages` de la version, que le back valide pour l'emplacement (D8). */
  nbPages: number
  pages: PageInseree[]
  quiz: QuizResume[]
  selection: Selection
  /** Quiz de la dernière insertion faite dans l'éditeur (présélection D11). */
  idDernierQuiz: number | null
}

/** `idQuiz` null : « Nouveau quiz » (requête sans `idQuiz`). */
export type Insertion =
  | { nom: 'AUCUNE' }
  | { nom: 'CHOIX_QUIZ', emplacement: Emplacement, idQuizPropose: number | null }
  | { nom: 'ENVOI', emplacement: Emplacement, idQuiz: number | null }

export type EtatEditeur =
  | { nom: 'CHARGEMENT' }
  | { nom: 'ERREUR_CHARGEMENT', erreur: ErreurChargement }
  | { nom: 'CONNEXION' }
  | ({ nom: 'LECTURE_SEULE' } & DonneesEditeur)
  | ({
    nom: 'PRET'
    insertion: Insertion
    /** Bandeau de l'éditeur (`role="alert"`). */
    erreur: ErreurEditeur | null
    /** Insertion bloquée jusqu'au rechargement (VERSION_PERIMEE, EMPLACEMENT_INVALIDE). */
    bloquee: boolean
  } & DonneesEditeur)

export type ActionEditeur =
  | { type: 'CHARGE', cours: Cours, nbPages: number, pages: PageInseree[], quiz: QuizResume[] }
  /** `erreur` null : pas de réponse HTTP. */
  | { type: 'ECHEC_CHARGEMENT', erreur: ErreurRecue | null }
  | { type: 'RECHARGER' }
  | { type: 'SELECTIONNER', selection: Selection }
  | { type: 'OUVRIR_CHOIX', emplacement: Emplacement }
  | { type: 'ANNULER_CHOIX' }
  | { type: 'CONFIRMER', idQuiz: number | null }
  | { type: 'INSERTION_REUSSIE', reponse: PageQuizInseree }
  | { type: 'INSERTION_REFUSEE', erreur: ErreurRecue }
  /** `pages` : pages relues après la panne (le hook reste en ENVOI pendant la relecture) ; `null` si elle a échoué. */
  | { type: 'ECHEC_RESEAU_INSERTION', pages: PageInseree[] | null }

export const ETAT_INITIAL: EtatEditeur = { nom: 'CHARGEMENT' }

/**
 * Quiz présélectionné dans le dialogue (D11, à valider U1) : quiz de la dernière insertion faite dans l'éditeur,
 * sinon premier quiz du cours, sinon `null` (« Nouveau quiz »).
 */
export function quizParDefaut(quiz: readonly QuizResume[], idDernierQuiz: number | null): number | null {
  if (idDernierQuiz !== null && quiz.some((q) => q.idQuiz === idDernierQuiz)) return idDernierQuiz
  return quiz[0]?.idQuiz ?? null
}

/** Vrai si un bouton « Insérer un quiz ici » peut ouvrir le dialogue. */
export function insertionPossible(etat: EtatEditeur): boolean {
  return etat.nom === 'PRET' && etat.insertion.nom === 'AUCUNE' && !etat.bloquee
}

export function reduireEditeur(etat: EtatEditeur, action: ActionEditeur): EtatEditeur {
  switch (action.type) {
    case 'CHARGE': {
      if (etat.nom !== 'CHARGEMENT') return etat
      const donnees: DonneesEditeur = {
        cours: action.cours,
        nbPages: action.nbPages,
        pages: action.pages,
        quiz: action.quiz,
        selection: { genre: 'PAGE_PDF', numeroPage: 1 },
        idDernierQuiz: null,
      }
      if (action.cours.archive) return { nom: 'LECTURE_SEULE', ...donnees }
      return { nom: 'PRET', ...donnees, insertion: { nom: 'AUCUNE' }, erreur: null, bloquee: false }
    }
    case 'ECHEC_CHARGEMENT': {
      if (etat.nom !== 'CHARGEMENT') return etat
      const erreur = lireErreurChargement(action.erreur)
      return erreur.affichage === 'REDIRECTION' ? { nom: 'CONNEXION' } : { nom: 'ERREUR_CHARGEMENT', erreur }
    }
    case 'RECHARGER':
      if (etat.nom === 'ERREUR_CHARGEMENT' || etat.nom === 'LECTURE_SEULE') return ETAT_INITIAL
      if (etat.nom === 'PRET' && etat.insertion.nom !== 'ENVOI') return ETAT_INITIAL
      return etat
    case 'SELECTIONNER':
      if (etat.nom === 'LECTURE_SEULE') return { ...etat, selection: action.selection }
      if (etat.nom === 'PRET' && etat.insertion.nom === 'AUCUNE') return { ...etat, selection: action.selection }
      return etat
    case 'OUVRIR_CHOIX':
      if (etat.nom !== 'PRET' || !insertionPossible(etat)) return etat
      return {
        ...etat,
        insertion: {
          nom: 'CHOIX_QUIZ',
          emplacement: action.emplacement,
          idQuizPropose: quizParDefaut(etat.quiz, etat.idDernierQuiz),
        },
      }
    case 'ANNULER_CHOIX':
      if (etat.nom !== 'PRET' || etat.insertion.nom !== 'CHOIX_QUIZ') return etat
      return { ...etat, insertion: { nom: 'AUCUNE' } }
    case 'CONFIRMER':
      if (etat.nom !== 'PRET' || etat.insertion.nom !== 'CHOIX_QUIZ') return etat
      return {
        ...etat,
        insertion: { nom: 'ENVOI', emplacement: etat.insertion.emplacement, idQuiz: action.idQuiz },
        erreur: null,
      }
    case 'INSERTION_REUSSIE': {
      if (etat.nom !== 'PRET' || etat.insertion.nom !== 'ENVOI') return etat
      const { reponse } = action
      const dejaConnu = etat.quiz.some((q) => q.idQuiz === reponse.idQuiz)
      return {
        ...etat,
        insertion: { nom: 'AUCUNE' },
        // Le front ne recalcule jamais les décalages : la liste vient de la réponse (D9).
        pages: reponse.pages,
        quiz: reponse.quizCree && !dejaConnu
          ? [...etat.quiz, { idQuiz: reponse.idQuiz, titre: reponse.titreQuiz }]
          : etat.quiz,
        selection: { genre: 'PAGE_INSEREE', idPage: reponse.idPage, titreQuiz: reponse.titreQuiz },
        idDernierQuiz: reponse.idQuiz,
      }
    }
    case 'INSERTION_REFUSEE': {
      if (etat.nom !== 'PRET' || etat.insertion.nom !== 'ENVOI') return etat
      const erreur = lireErreurInsertion(action.erreur)
      if (erreur.affichage === 'REDIRECTION') return { nom: 'CONNEXION' }
      return { ...etat, insertion: { nom: 'AUCUNE' }, erreur, bloquee: etat.bloquee || erreur.bloquer }
    }
    case 'ECHEC_RESEAU_INSERTION':
      if (etat.nom !== 'PRET' || etat.insertion.nom !== 'ENVOI') return etat
      return {
        ...etat,
        insertion: { nom: 'AUCUNE' },
        pages: action.pages ?? etat.pages,
        erreur: erreurReseauInsertion(),
      }
  }
}
