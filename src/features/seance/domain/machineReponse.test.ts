// Machine à états de l'écran de l'étudiant : plan UC9, §5 (et D14 ; action JETON_REFUSE ajoutée en B6 ; bandeau
// effacé par une réponse au renvoi, précisé en B7).
import { describe, expect, it } from 'vitest'
import { questionQcm } from '../../../test/fabriques.ts'
import type { CorpsReponse } from './corpsReponse.ts'
import { ETAT_INITIAL, reducerReponse } from './machineReponse.ts'
import type { ActionReponse, Ecran, EtatReponse } from './machineReponse.ts'
import type { ResultatQuestion } from './question.ts'

const question = questionQcm()
const autreQuestion = questionQcm({ idQuestion: 7 })
const corps: CorpsReponse = { idQuestion: 1, idPropositions: [12] }
const resultat: ResultatQuestion = { points: 875, scoreTotal: 1200, rang: 3, nombreParticipants: 24, evolution: 2 }
const erreurAffichee = {
  code: 'HORS_DELAI' as const,
  message: 'Temps écoulé : réponse non prise en compte.',
  corrigeable: false,
  ecran: 'E9' as const,
  supprimerJeton: false,
}

const etat = (ecran: Ecran, connexionPerdue = false): EtatReponse => ({ ecran, connexionPerdue })

/** Un exemple de chaque écran de la machine. */
const ECRANS: Record<Ecran['nom'], Ecran> = {
  CHARGEMENT: { nom: 'CHARGEMENT' },
  ATTENTE: { nom: 'ATTENTE' },
  SAISIE: { nom: 'SAISIE', question, erreur: null },
  ENVOI: { nom: 'ENVOI', question, corps, renvoi: false },
  CONFIRMEE: { nom: 'CONFIRMEE', idQuestion: 1 },
  TEMPS_ECOULE: { nom: 'TEMPS_ECOULE', idQuestion: 1 },
  REFUSEE: { nom: 'REFUSEE', idQuestion: 1, erreur: erreurAffichee },
  SESSION_EXPIREE: { nom: 'SESSION_EXPIREE', erreur: { ...erreurAffichee, code: 'JETON_INVALIDE' } },
  RESULTAT: { nom: 'RESULTAT', resultat },
  SEANCE_CLOSE: { nom: 'SEANCE_CLOSE' },
}

/** Un exemple de chaque action. */
const ACTIONS: Record<ActionReponse['type'], ActionReponse> = {
  RESYNCHRONISEE: { type: 'RESYNCHRONISEE', question, dejaRepondu: false },
  QUESTION_RECUE: { type: 'QUESTION_RECUE', question: autreQuestion },
  VALIDER: { type: 'VALIDER', saisie: { type: 'QCM', propositions: [12] }, resteDuTemps: true },
  TEMPS_ECOULE: { type: 'TEMPS_ECOULE' },
  ENVOI_REUSSI: { type: 'ENVOI_REUSSI' },
  ENVOI_REFUSE: { type: 'ENVOI_REFUSE', erreur: { statut: 409, code: 'HORS_DELAI', error: null }, resteDuTemps: true },
  ECHEC_RESEAU: { type: 'ECHEC_RESEAU' },
  CONNEXION_PERDUE: { type: 'CONNEXION_PERDUE' },
  RECONNEXION: { type: 'RECONNEXION', resteDuTemps: true },
  RESULTAT_RECU: { type: 'RESULTAT_RECU', resultat },
  SEANCE_CLOTUREE: { type: 'SEANCE_CLOTUREE' },
  JETON_REFUSE: { type: 'JETON_REFUSE' },
}

/** Couples (écran, action) qui ont une transition dans le plan (§5) ; tous les autres laissent l'état inchangé. */
function transitionPrevue(ecran: Ecran['nom'], action: ActionReponse['type']): boolean {
  if (ecran === 'SESSION_EXPIREE') return false
  switch (action) {
    case 'QUESTION_RECUE':
    case 'SEANCE_CLOTUREE':
    case 'JETON_REFUSE':
    case 'CONNEXION_PERDUE':
    case 'RECONNEXION':
      return true
    case 'RESYNCHRONISEE':
      return ecran === 'CHARGEMENT'
    case 'VALIDER':
    case 'TEMPS_ECOULE':
      return ecran === 'SAISIE'
    case 'ENVOI_REUSSI':
    case 'ENVOI_REFUSE':
    case 'ECHEC_RESEAU':
      return ecran === 'ENVOI'
    case 'RESULTAT_RECU':
      return ecran === 'CONFIRMEE' || ecran === 'TEMPS_ECOULE' || ecran === 'REFUSEE'
  }
}

describe('reducerReponse : aucune transition hors du plan', () => {
  const couples = Object.keys(ECRANS).flatMap((ecran) =>
    Object.keys(ACTIONS).map((action) => [ecran, action] as [Ecran['nom'], ActionReponse['type']]),
  ).filter(([ecran, action]) => !transitionPrevue(ecran, action))

  it.each(couples)('%s + %s : état inchangé', (ecran, action) => {
    const avant = etat(ECRANS[ecran])
    expect(reducerReponse(avant, ACTIONS[action])).toEqual(avant)
  })
})

describe('reducerReponse : transitions du plan', () => {
  it('état initial : CHARGEMENT, connexion non perdue', () => {
    expect(ETAT_INITIAL).toEqual(etat({ nom: 'CHARGEMENT' }))
  })

  describe('CHARGEMENT ──resynchronisation', () => {
    const depart = etat(ECRANS.CHARGEMENT)

    it('question en cours → SAISIE', () => {
      expect(reducerReponse(depart, { type: 'RESYNCHRONISEE', question, dejaRepondu: false }).ecran)
        .toEqual({ nom: 'SAISIE', question, erreur: null })
    })

    it('aucune question → ATTENTE', () => {
      expect(reducerReponse(depart, { type: 'RESYNCHRONISEE', question: null, dejaRepondu: false }).ecran)
        .toEqual({ nom: 'ATTENTE' })
    })

    it('dejaRepondu → CONFIRMEE', () => {
      expect(reducerReponse(depart, { type: 'RESYNCHRONISEE', question, dejaRepondu: true }).ecran)
        .toEqual({ nom: 'CONFIRMEE', idQuestion: 1 })
    })
  })

  it('ATTENTE ──question reçue──▶ SAISIE', () => {
    expect(reducerReponse(etat(ECRANS.ATTENTE), { type: 'QUESTION_RECUE', question }).ecran)
      .toEqual({ nom: 'SAISIE', question, erreur: null })
  })

  describe('SAISIE ──Valider', () => {
    const depart = etat(ECRANS.SAISIE)

    it('réponse complète et t > 0 → ENVOI (renvoi = false) avec le corps', () => {
      const apres = reducerReponse(depart, ACTIONS.VALIDER)
      expect(apres.ecran).toEqual({ nom: 'ENVOI', question, corps, renvoi: false })
    })

    it('réponse incomplète → reste en SAISIE', () => {
      const apres = reducerReponse(depart, { type: 'VALIDER', saisie: { type: 'QCM', propositions: [] }, resteDuTemps: true })
      expect(apres).toEqual(depart)
    })

    it('t = 0 → reste en SAISIE', () => {
      const apres = reducerReponse(depart, { type: 'VALIDER', saisie: { type: 'QCM', propositions: [12] }, resteDuTemps: false })
      expect(apres).toEqual(depart)
    })

    it('double clic : le second Valider ne change rien (déjà en ENVOI)', () => {
      const unClic = reducerReponse(depart, ACTIONS.VALIDER)
      expect(reducerReponse(unClic, ACTIONS.VALIDER)).toBe(unClic)
    })
  })

  it('SAISIE ──t = 0──▶ TEMPS_ECOULE', () => {
    expect(reducerReponse(etat(ECRANS.SAISIE), ACTIONS.TEMPS_ECOULE).ecran).toEqual({ nom: 'TEMPS_ECOULE', idQuestion: 1 })
  })

  it('ENVOI ──201──▶ CONFIRMEE', () => {
    expect(reducerReponse(etat(ECRANS.ENVOI), ACTIONS.ENVOI_REUSSI).ecran).toEqual({ nom: 'CONFIRMEE', idQuestion: 1 })
  })

  describe('ENVOI ──erreur', () => {
    const depart = etat(ECRANS.ENVOI)
    const refus = (statut: number, code: string, resteDuTemps: boolean) =>
      reducerReponse(depart, { type: 'ENVOI_REFUSE', erreur: { statut, code, error: null }, resteDuTemps })

    it.each([
      [422, 'REPONSE_INVALIDE', 'Réponse incomplète, vérifie ta saisie.'],
      [500, 'ERREUR_SERVEUR', 'Réponse non enregistrée, réessaie.'],
    ])('%i avec t > 0 → SAISIE + message (E8)', (statut, code, message) => {
      const { ecran } = refus(statut, code, true)
      expect(ecran.nom).toBe('SAISIE')
      expect(ecran.nom === 'SAISIE' && ecran.erreur?.message).toBe(message)
    })

    it.each([
      [422, 'REPONSE_INVALIDE'],
      [500, 'ERREUR_SERVEUR'],
    ])('%i avec t = 0 → REFUSEE (E9)', (statut, code) => {
      expect(refus(statut, code, false).ecran.nom).toBe('REFUSEE')
    })

    it.each([
      ['QUESTION_CLOSE', 'Cette session est terminée.'],
      ['HORS_DELAI', 'Temps écoulé : réponse non prise en compte.'],
      ['DEJA_REPONDU', 'Tu as déjà répondu.'],
    ])('409 %s → REFUSEE avec le message exact', (code, message) => {
      const { ecran } = refus(409, code, true)
      expect(ecran).toEqual({ nom: 'REFUSEE', idQuestion: 1, erreur: expect.objectContaining({ message }) })
    })

    it('401 → SESSION_EXPIREE, état final', () => {
      const apres = refus(401, 'JETON_INVALIDE', true)
      expect(apres.ecran.nom).toBe('SESSION_EXPIREE')
      for (const action of Object.values(ACTIONS)) expect(reducerReponse(apres, action)).toBe(apres)
    })
  })

  describe('panne réseau et renvoi (D14)', () => {
    const enRenvoi = etat({ nom: 'ENVOI', question, corps, renvoi: true }, true)

    it('ENVOI ──échec réseau──▶ ENVOI (renvoi = true, bandeau)', () => {
      expect(reducerReponse(etat(ECRANS.ENVOI), ACTIONS.ECHEC_RESEAU)).toEqual(enRenvoi)
    })

    it('ENVOI (renvoi) ──reconnexion, t > 0──▶ reste en ENVOI, même corps', () => {
      expect(reducerReponse(enRenvoi, { type: 'RECONNEXION', resteDuTemps: true }))
        .toEqual(etat({ nom: 'ENVOI', question, corps, renvoi: true }))
    })

    it('ENVOI (renvoi) ──reconnexion, t = 0──▶ CHARGEMENT', () => {
      expect(reducerReponse(enRenvoi, { type: 'RECONNEXION', resteDuTemps: false })).toEqual(etat(ECRANS.CHARGEMENT))
    })

    it('ENVOI (renvoi) ──201──▶ CONFIRMEE, bandeau effacé', () => {
      expect(reducerReponse(enRenvoi, ACTIONS.ENVOI_REUSSI)).toEqual(etat({ nom: 'CONFIRMEE', idQuestion: 1 }))
    })

    it('ENVOI (renvoi) ──DEJA_REPONDU──▶ CONFIRMEE (pas une erreur)', () => {
      const apres = reducerReponse(enRenvoi, {
        type: 'ENVOI_REFUSE',
        erreur: { statut: 409, code: 'DEJA_REPONDU', error: null },
        resteDuTemps: true,
      })
      expect(apres).toEqual(etat({ nom: 'CONFIRMEE', idQuestion: 1 }))
    })

    it('DEJA_REPONDU sans renvoi reste une erreur (REFUSEE)', () => {
      const apres = reducerReponse(etat(ECRANS.ENVOI), {
        type: 'ENVOI_REFUSE',
        erreur: { statut: 409, code: 'DEJA_REPONDU', error: null },
        resteDuTemps: true,
      })
      expect(apres.ecran.nom).toBe('REFUSEE')
    })
  })

  it.each(['CONFIRMEE', 'TEMPS_ECOULE', 'REFUSEE'] as const)('%s ──résultat reçu──▶ RESULTAT', (nom) => {
    expect(reducerReponse(etat(ECRANS[nom]), ACTIONS.RESULTAT_RECU).ecran).toEqual({ nom: 'RESULTAT', resultat })
  })

  const saufExpiree = (Object.keys(ECRANS) as Ecran['nom'][]).filter((nom) => nom !== 'SESSION_EXPIREE')

  describe('nouvelle question : retour sur E8 remis à zéro', () => {
    it.each(saufExpiree)('%s ──nouvelle question──▶ SAISIE sans erreur', (nom) => {
      expect(reducerReponse(etat(ECRANS[nom]), ACTIONS.QUESTION_RECUE).ecran)
        .toEqual({ nom: 'SAISIE', question: autreQuestion, erreur: null })
    })

    it('SAISIE avec un message d\'erreur : la nouvelle question efface le message', () => {
      const avecErreur = etat({ nom: 'SAISIE', question, erreur: { ...erreurAffichee, corrigeable: true, ecran: 'E8' } })
      expect(reducerReponse(avecErreur, ACTIONS.QUESTION_RECUE).ecran).toEqual({ nom: 'SAISIE', question: autreQuestion, erreur: null })
    })

    it.each(['SAISIE', 'ENVOI', 'CONFIRMEE', 'TEMPS_ECOULE', 'REFUSEE'] as const)(
      '%s : la même question rediffusée est ignorée',
      (nom) => {
        const avant = etat(ECRANS[nom])
        expect(reducerReponse(avant, { type: 'QUESTION_RECUE', question })).toEqual(avant)
      },
    )
  })

  it.each(saufExpiree)('%s ──séance clôturée──▶ SEANCE_CLOSE', (nom) => {
    expect(reducerReponse(etat(ECRANS[nom]), ACTIONS.SEANCE_CLOTUREE).ecran).toEqual({ nom: 'SEANCE_CLOSE' })
  })

  it.each(saufExpiree)('%s ──connexion perdue──▶ même écran, bandeau', (nom) => {
    expect(reducerReponse(etat(ECRANS[nom]), ACTIONS.CONNEXION_PERDUE)).toEqual(etat(ECRANS[nom], true))
  })

  it.each(saufExpiree)('%s ──reconnexion──▶ CHARGEMENT, bandeau retiré', (nom) => {
    expect(reducerReponse(etat(ECRANS[nom], true), ACTIONS.RECONNEXION)).toEqual(etat(ECRANS.CHARGEMENT))
  })

  it.each(saufExpiree)('%s ──jeton refusé (STOMP)──▶ SESSION_EXPIREE avec le message de JETON_INVALIDE', (nom) => {
    const { ecran } = reducerReponse(etat(ECRANS[nom]), ACTIONS.JETON_REFUSE)
    expect(ecran).toEqual({
      nom: 'SESSION_EXPIREE',
      erreur: expect.objectContaining({ message: 'Ta session a expiré, rejoins le quiz à nouveau.' }),
    })
  })
})
