// Reducer de l'éditeur : plan UC3, §6, D11, D12 et D15.
import { describe, expect, it } from 'vitest'
import type { Cours, PageQuizInseree } from './cours.ts'
import { ETAT_INITIAL, insertionPossible, quizParDefaut, reduireEditeur } from './machineEditeur.ts'
import type { ActionEditeur, EtatEditeur } from './machineEditeur.ts'

const cours = (archive = false): Cours => ({
  idCours: 7,
  titre: 'Réseaux',
  archive,
  version: { idVersion: 3, numero: 2, nbPages: 12 },
})

const CHARGE: ActionEditeur = {
  type: 'CHARGE',
  cours: cours(),
  nbPages: 12,
  pages: [{ idPage: 1, numeroPage: 2, ordre: 0, type: 'QUIZ' }],
  quiz: [{ idQuiz: 40, titre: 'Quiz 1' }, { idQuiz: 41, titre: 'Quiz 2' }],
}

const EMPLACEMENT = { numeroPage: 4, ordre: 0 }

const REPONSE: PageQuizInseree = {
  idPage: 2,
  idQuiz: 42,
  titreQuiz: 'Quiz 3',
  quizCree: true,
  idQuestion: 90,
  numeroPage: 4,
  ordre: 0,
  pages: [
    { idPage: 1, numeroPage: 2, ordre: 0, type: 'QUIZ' },
    { idPage: 2, numeroPage: 4, ordre: 0, type: 'QUIZ' },
  ],
}

const suite = (...actions: ActionEditeur[]): EtatEditeur => actions.reduce(reduireEditeur, ETAT_INITIAL)

const pret = () => suite(CHARGE)
const choix = () => suite(CHARGE, { type: 'OUVRIR_CHOIX', emplacement: EMPLACEMENT })
const envoi = (idQuiz: number | null = 40) => reduireEditeur(choix(), { type: 'CONFIRMER', idQuiz })

function enPret(etat: EtatEditeur) {
  if (etat.nom !== 'PRET') throw new Error(`état PRET attendu, obtenu ${etat.nom}`)
  return etat
}

describe('chargement', () => {
  it('CHARGEMENT ──CHARGE──▶ PRET, page 1 du PDF sélectionnée, aucune insertion', () => {
    const etat = enPret(pret())
    expect(etat.selection).toEqual({ genre: 'PAGE_PDF', numeroPage: 1 })
    expect(etat.insertion).toEqual({ nom: 'AUCUNE' })
    expect(etat.erreur).toBeNull()
    expect(etat.bloquee).toBe(false)
    expect(etat.pages).toEqual([{ idPage: 1, numeroPage: 2, ordre: 0, type: 'QUIZ' }])
  })

  it('cours archivé : LECTURE_SEULE, aucune insertion possible', () => {
    const etat = suite({ ...CHARGE, cours: cours(true) } as ActionEditeur)
    expect(etat.nom).toBe('LECTURE_SEULE')
    expect(insertionPossible(etat)).toBe(false)
    expect(reduireEditeur(etat, { type: 'OUVRIR_CHOIX', emplacement: EMPLACEMENT })).toBe(etat)
  })

  it('LECTURE_SEULE : sélection possible, « Recharger » → CHARGEMENT', () => {
    const etat = suite({ ...CHARGE, cours: cours(true) } as ActionEditeur)
    const selection = { genre: 'PAGE_PDF', numeroPage: 3 } as const
    expect(reduireEditeur(etat, { type: 'SELECTIONNER', selection })).toMatchObject({ nom: 'LECTURE_SEULE', selection })
    expect(reduireEditeur(etat, { type: 'RECHARGER' })).toEqual(ETAT_INITIAL)
  })

  it('401 → CONNEXION', () => {
    expect(suite({ type: 'ECHEC_CHARGEMENT', erreur: { statut: 401, error: null } })).toEqual({ nom: 'CONNEXION' })
  })

  it('autre échec ou réseau → ERREUR_CHARGEMENT avec « Recharger »', () => {
    const etat = suite({ type: 'ECHEC_CHARGEMENT', erreur: { statut: 404, error: null } })
    expect(etat).toMatchObject({ nom: 'ERREUR_CHARGEMENT', erreur: { message: 'Cours introuvable.', action: 'RECHARGER' } })
    expect(suite({ type: 'ECHEC_CHARGEMENT', erreur: null }).nom).toBe('ERREUR_CHARGEMENT')
  })

  it('ERREUR_CHARGEMENT | PRET ──RECHARGER──▶ CHARGEMENT', () => {
    expect(suite({ type: 'ECHEC_CHARGEMENT', erreur: null }, { type: 'RECHARGER' })).toEqual(ETAT_INITIAL)
    expect(reduireEditeur(pret(), { type: 'RECHARGER' })).toEqual(ETAT_INITIAL)
  })

  it('CHARGE et ECHEC_CHARGEMENT ignorés hors CHARGEMENT', () => {
    const etat = pret()
    expect(reduireEditeur(etat, CHARGE)).toBe(etat)
    expect(reduireEditeur(etat, { type: 'ECHEC_CHARGEMENT', erreur: null })).toBe(etat)
  })

  it('CONNEXION : état final', () => {
    const etat = suite({ type: 'ECHEC_CHARGEMENT', erreur: { statut: 401, error: null } })
    expect(reduireEditeur(etat, { type: 'RECHARGER' })).toBe(etat)
  })
})

describe('insertion', () => {
  it('AUCUNE ──SELECTIONNER──▶ AUCUNE, sélection changée', () => {
    const selection = { genre: 'PAGE_INSEREE', idPage: 1, titreQuiz: null } as const
    expect(reduireEditeur(pret(), { type: 'SELECTIONNER', selection })).toMatchObject({
      selection,
      insertion: { nom: 'AUCUNE' },
    })
  })

  it('AUCUNE ──OUVRIR_CHOIX──▶ CHOIX_QUIZ, premier quiz proposé', () => {
    expect(enPret(choix()).insertion).toEqual({ nom: 'CHOIX_QUIZ', emplacement: EMPLACEMENT, idQuizPropose: 40 })
    expect(insertionPossible(choix())).toBe(false)
  })

  it('CHOIX_QUIZ ──ANNULER_CHOIX──▶ AUCUNE', () => {
    expect(enPret(reduireEditeur(choix(), { type: 'ANNULER_CHOIX' })).insertion).toEqual({ nom: 'AUCUNE' })
  })

  it('CHOIX_QUIZ ──CONFIRMER──▶ ENVOI, message effacé ; null = nouveau quiz', () => {
    const avecErreur = reduireEditeur(envoi(), { type: 'INSERTION_REFUSEE', erreur: { statut: 409, code: 'QUIZ_EN_SEANCE', error: null } })
    const relance = reduireEditeur(reduireEditeur(avecErreur, { type: 'OUVRIR_CHOIX', emplacement: EMPLACEMENT }), {
      type: 'CONFIRMER',
      idQuiz: null,
    })
    expect(enPret(relance).insertion).toEqual({ nom: 'ENVOI', emplacement: EMPLACEMENT, idQuiz: null })
    expect(enPret(relance).erreur).toBeNull()
  })

  it('ENVOI : une seule insertion à la fois (OUVRIR_CHOIX, CONFIRMER, RECHARGER, SELECTIONNER ignorés)', () => {
    const etat = envoi()
    expect(insertionPossible(etat)).toBe(false)
    const ignorees: ActionEditeur[] = [
      { type: 'OUVRIR_CHOIX', emplacement: { numeroPage: 0, ordre: 0 } },
      { type: 'CONFIRMER', idQuiz: 41 },
      { type: 'ANNULER_CHOIX' },
      { type: 'RECHARGER' },
      { type: 'SELECTIONNER', selection: { genre: 'PAGE_PDF', numeroPage: 2 } },
    ]
    for (const action of ignorees) expect(reduireEditeur(etat, action)).toBe(etat)
  })

  it('ENVOI ──201──▶ AUCUNE : pages de la réponse, quiz créé ajouté, nouvelle page sélectionnée', () => {
    const etat = enPret(reduireEditeur(envoi(null), { type: 'INSERTION_REUSSIE', reponse: REPONSE }))
    expect(etat.insertion).toEqual({ nom: 'AUCUNE' })
    expect(etat.pages).toBe(REPONSE.pages)
    expect(etat.quiz).toEqual([
      { idQuiz: 40, titre: 'Quiz 1' },
      { idQuiz: 41, titre: 'Quiz 2' },
      { idQuiz: 42, titre: 'Quiz 3' },
    ])
    expect(etat.selection).toEqual({ genre: 'PAGE_INSEREE', idPage: 2, titreQuiz: 'Quiz 3' })
    expect(etat.idDernierQuiz).toBe(42)
  })

  it('201 avec un quiz existant : liste des quiz inchangée, quiz présélectionné ensuite', () => {
    const reponse = { ...REPONSE, idQuiz: 41, titreQuiz: 'Quiz 2', quizCree: false }
    const etat = reduireEditeur(envoi(41), { type: 'INSERTION_REUSSIE', reponse })
    expect(enPret(etat).quiz).toHaveLength(2)
    const rouvert = reduireEditeur(etat, { type: 'OUVRIR_CHOIX', emplacement: EMPLACEMENT })
    expect(enPret(rouvert).insertion).toMatchObject({ idQuizPropose: 41 })
  })

  it('ENVOI ──401──▶ CONNEXION', () => {
    expect(reduireEditeur(envoi(), { type: 'INSERTION_REFUSEE', erreur: { statut: 401, error: null } })).toEqual({
      nom: 'CONNEXION',
    })
  })

  it.each(['VERSION_PERIMEE', 'EMPLACEMENT_INVALIDE'])('ENVOI ──%s──▶ AUCUNE + « Recharger », insertion bloquée', (code) => {
    const statut = code === 'VERSION_PERIMEE' ? 409 : 422
    const etat = enPret(reduireEditeur(envoi(), { type: 'INSERTION_REFUSEE', erreur: { statut, code, error: null } }))
    expect(etat.insertion).toEqual({ nom: 'AUCUNE' })
    expect(etat.erreur?.action).toBe('RECHARGER')
    expect(etat.bloquee).toBe(true)
    expect(reduireEditeur(etat, { type: 'OUVRIR_CHOIX', emplacement: EMPLACEMENT })).toBe(etat)
    expect(reduireEditeur(etat, { type: 'RECHARGER' })).toEqual(ETAT_INITIAL)
  })

  it('ENVOI ──autre erreur──▶ AUCUNE + message, boutons réactivés', () => {
    const etat = enPret(reduireEditeur(envoi(), {
      type: 'INSERTION_REFUSEE',
      erreur: { statut: 409, code: 'QUIZ_EN_SEANCE', error: null },
    }))
    expect(etat.erreur?.message).toBe('Ce quiz est en cours de séance : réessayez après sa clôture.')
    expect(etat.bloquee).toBe(false)
    expect(insertionPossible(etat)).toBe(true)
  })

  it('ENVOI ──panne réseau──▶ AUCUNE + message provisoire et « Recharger », boutons réactivés', () => {
    const etat = enPret(reduireEditeur(envoi(), { type: 'ECHEC_RESEAU_INSERTION' }))
    expect(etat.erreur).toMatchObject({ message: 'L\'insertion a échoué, réessayez.', action: 'RECHARGER' })
    expect(insertionPossible(etat)).toBe(true)
  })

  it('réponses d\'insertion ignorées hors ENVOI', () => {
    const etat = pret()
    expect(reduireEditeur(etat, { type: 'INSERTION_REUSSIE', reponse: REPONSE })).toBe(etat)
    expect(reduireEditeur(etat, { type: 'INSERTION_REFUSEE', erreur: { statut: 500, error: null } })).toBe(etat)
    expect(reduireEditeur(etat, { type: 'ECHEC_RESEAU_INSERTION' })).toBe(etat)
    expect(reduireEditeur(etat, { type: 'ANNULER_CHOIX' })).toBe(etat)
    expect(reduireEditeur(etat, { type: 'CONFIRMER', idQuiz: 40 })).toBe(etat)
  })

  it('CHOIX_QUIZ : SELECTIONNER ignoré (dialogue ouvert)', () => {
    const etat = choix()
    expect(reduireEditeur(etat, { type: 'SELECTIONNER', selection: { genre: 'PAGE_PDF', numeroPage: 2 } })).toBe(etat)
  })
})

describe('quizParDefaut (D11)', () => {
  const quiz = [{ idQuiz: 1, titre: 'Quiz 1' }, { idQuiz: 2, titre: 'Quiz 2' }]

  it('quiz de la dernière insertion s\'il existe encore', () => {
    expect(quizParDefaut(quiz, 2)).toBe(2)
  })

  it('sinon premier quiz', () => {
    expect(quizParDefaut(quiz, null)).toBe(1)
    expect(quizParDefaut(quiz, 99)).toBe(1)
  })

  it('aucun quiz : null (« Nouveau quiz »)', () => {
    expect(quizParDefaut([], null)).toBeNull()
  })
})
