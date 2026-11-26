// Machine à états de E7 : plan UC8, §5.
import { describe, expect, it } from 'vitest'
import { ETAT_INITIAL_REJOINDRE, peutEntrer, reducerRejoindre } from './ecranRejoindre.ts'
import type { ActionRejoindre, EcranRejoindre, SessionPublique } from './ecranRejoindre.ts'

const SESSION: SessionPublique = { titreCours: 'Réseaux', titreQuiz: 'Quiz 1', estNotee: false }
const INVALIDE = 'Ton pseudonyme doit faire de 2 à 20 caractères.'
const SERVEUR = 'Une erreur est survenue. Réessayez dans un instant.'

function formulaire(champs: Partial<Extract<EcranRejoindre, { nom: 'FORMULAIRE' }>> = {}): EcranRejoindre {
  return { nom: 'FORMULAIRE', session: SESSION, saisie: '', erreur: null, suggestion: null, envoi: false, ...champs }
}

function suite(ecran: EcranRejoindre, ...actions: ActionRejoindre[]): EcranRejoindre {
  return actions.reduce(reducerRejoindre, ecran)
}

describe('chargement', () => {
  it('commence en CHARGEMENT', () => {
    expect(ETAT_INITIAL_REJOINDRE).toEqual({ nom: 'CHARGEMENT' })
  })

  it('quiz non noté : formulaire vide', () => {
    expect(suite(ETAT_INITIAL_REJOINDRE, { type: 'SESSION_CHARGEE', session: SESSION })).toEqual(formulaire())
  })

  it('quiz noté : message, sans formulaire', () => {
    const note = { ...SESSION, estNotee: true }
    expect(suite(ETAT_INITIAL_REJOINDRE, { type: 'SESSION_CHARGEE', session: note })).toEqual({
      nom: 'QUIZ_NOTE', session: note, message: 'Ce quiz est noté : connecte-toi avec ton compte IUT.',
    })
  })

  it('404 : INTROUVABLE', () => {
    expect(suite(ETAT_INITIAL_REJOINDRE, { type: 'CHARGEMENT_REFUSE', erreur: { statut: 404, error: null } }).nom)
      .toBe('INTROUVABLE')
  })

  it('409 : TERMINE', () => {
    expect(suite(ETAT_INITIAL_REJOINDRE, { type: 'CHARGEMENT_REFUSE', erreur: { statut: 409, error: null } }).nom)
      .toBe('TERMINE')
  })

  it('autre statut ou panne : ECHEC_CHARGEMENT', () => {
    expect(suite(ETAT_INITIAL_REJOINDRE, { type: 'CHARGEMENT_REFUSE', erreur: { statut: 500, error: null } }).nom)
      .toBe('ECHEC_CHARGEMENT')
    expect(suite(ETAT_INITIAL_REJOINDRE, { type: 'CHARGEMENT_ECHOUE' }))
      .toEqual({ nom: 'ECHEC_CHARGEMENT', message: SERVEUR })
  })
})

describe('saisie', () => {
  it('met à jour la saisie et garde erreur et suggestion', () => {
    expect(suite(formulaire({ erreur: 'e', suggestion: 's' }), { type: 'SAISIE', texte: 'Bob' }))
      .toEqual(formulaire({ saisie: 'Bob', erreur: 'e', suggestion: 's' }))
  })

  it('pseudonyme invalide : message du 422, pas d\'envoi', () => {
    expect(suite(formulaire({ saisie: '  a  ' }), { type: 'ENTRER' }))
      .toEqual(formulaire({ saisie: '  a  ', erreur: INVALIDE }))
  })

  it('pseudonyme valide : envoi, erreur et suggestion effacées', () => {
    expect(suite(formulaire({ saisie: 'Alice', erreur: 'e', suggestion: 's' }), { type: 'ENTRER' }))
      .toEqual(formulaire({ saisie: 'Alice', envoi: true }))
  })

  it('clic sur la suggestion : la saisie la reprend', () => {
    expect(suite(formulaire({ saisie: 'Alice', erreur: 'e', suggestion: 'Alice2' }), { type: 'SUGGESTION_CHOISIE' }))
      .toEqual(formulaire({ saisie: 'Alice2' }))
  })

  it('suggestion choisie sans suggestion : rien ne change', () => {
    const ecran = formulaire({ saisie: 'Alice' })
    expect(reducerRejoindre(ecran, { type: 'SUGGESTION_CHOISIE' })).toBe(ecran)
  })
})

describe('envoi', () => {
  const enEnvoi = formulaire({ saisie: 'Alice', envoi: true })

  it('ignore SAISIE, ENTRER et SUGGESTION_CHOISIE pendant l\'envoi', () => {
    for (const action of [{ type: 'SAISIE', texte: 'x' }, { type: 'ENTRER' }, { type: 'SUGGESTION_CHOISIE' }] as const) {
      expect(reducerRejoindre(enEnvoi, action)).toBe(enEnvoi)
    }
  })

  it('pseudonyme pris avec proposition : formulaire, message et suggestion', () => {
    expect(suite(enEnvoi, { type: 'ENVOI_REFUSE', erreur: { statut: 409, error: 'x', suggestion: 'Alice2' } }))
      .toEqual(formulaire({
        saisie: 'Alice', erreur: 'Ce pseudonyme est déjà pris. Essaie celui qui t\'est proposé.', suggestion: 'Alice2',
      }))
  })

  it('pseudonyme pris sans proposition', () => {
    expect(suite(enEnvoi, {
      type: 'ENVOI_REFUSE', erreur: { statut: 409, code: 'PSEUDONYME_DEJA_PRIS', error: 'x' },
    })).toEqual(formulaire({ saisie: 'Alice', erreur: 'Ce pseudonyme est déjà pris.' }))
  })

  it.each([
    [{ statut: 422, error: 'x' }, INVALIDE],
    [{ statut: 500, error: 'x' }, SERVEUR],
    [{ statut: 400, error: 'Corps illisible.' }, 'Corps illisible.'],
    [{ statut: 409, error: 'Conflit.' }, 'Conflit.'],
  ])('erreur %o : formulaire, saisie gardée, message', (erreur, message) => {
    expect(suite(enEnvoi, { type: 'ENVOI_REFUSE', erreur })).toEqual(formulaire({ saisie: 'Alice', erreur: message }))
  })

  it('404 : INTROUVABLE', () => {
    expect(suite(enEnvoi, { type: 'ENVOI_REFUSE', erreur: { statut: 404, error: null } }).nom).toBe('INTROUVABLE')
  })

  it('SESSION_CLOSE : TERMINE', () => {
    expect(suite(enEnvoi, { type: 'ENVOI_REFUSE', erreur: { statut: 409, code: 'SESSION_CLOSE', error: null } }))
      .toEqual({ nom: 'TERMINE', message: 'Ce quiz est terminé.' })
  })

  it('CONNEXION_IUT_REQUISE : QUIZ_NOTE, titres gardés', () => {
    expect(suite(enEnvoi, {
      type: 'ENVOI_REFUSE', erreur: { statut: 409, code: 'CONNEXION_IUT_REQUISE', error: null },
    })).toEqual({ nom: 'QUIZ_NOTE', session: SESSION, message: 'Ce quiz est noté : connecte-toi avec ton compte IUT.' })
  })

  it('panne réseau ou jeton non gardé : formulaire et message provisoire', () => {
    expect(suite(enEnvoi, { type: 'ENVOI_ECHOUE' })).toEqual(formulaire({ saisie: 'Alice', erreur: SERVEUR }))
  })

  it('ENVOI_REFUSE hors envoi : ignoré', () => {
    const ecran = formulaire({ saisie: 'Alice' })
    expect(reducerRejoindre(ecran, { type: 'ENVOI_REFUSE', erreur: { statut: 404, error: null } })).toBe(ecran)
  })
})

describe('états finaux', () => {
  it.each<EcranRejoindre>([
    { nom: 'INTROUVABLE', message: 'm' },
    { nom: 'TERMINE', message: 'm' },
    { nom: 'ECHEC_CHARGEMENT', message: 'm' },
    { nom: 'QUIZ_NOTE', session: SESSION, message: 'm' },
  ])('$nom ignore les actions', (ecran) => {
    expect(reducerRejoindre(ecran, { type: 'SESSION_CHARGEE', session: SESSION })).toBe(ecran)
    expect(reducerRejoindre(ecran, { type: 'ENTRER' })).toBe(ecran)
  })
})

describe('peutEntrer', () => {
  it.each([
    ['pseudonyme valide', formulaire({ saisie: ' Alice ' }), true],
    ['pseudonyme invalide après nettoyage', formulaire({ saisie: ' a ' }), false],
    ['envoi en cours', formulaire({ saisie: 'Alice', envoi: true }), false],
    ['hors formulaire', ETAT_INITIAL_REJOINDRE, false],
  ])('%s', (_cas, ecran, attendu) => {
    expect(peutEntrer(ecran)).toBe(attendu)
  })
})

describe('aucune autre transition que celles du plan (§5)', () => {
  const ACTIONS: ActionRejoindre[] = [
    { type: 'SESSION_CHARGEE', session: SESSION },
    { type: 'CHARGEMENT_REFUSE', erreur: { statut: 404, error: null } },
    { type: 'CHARGEMENT_ECHOUE' },
    { type: 'SAISIE', texte: 'Bob' },
    { type: 'ENTRER' },
    { type: 'SUGGESTION_CHOISIE' },
    { type: 'ENVOI_REFUSE', erreur: { statut: 409, error: 'x', suggestion: 'Alice2' } },
    { type: 'ENVOI_ECHOUE' },
  ]
  type TypeAction = ActionRejoindre['type']

  const CAS: { nom: string, ecran: EcranRejoindre, permises: TypeAction[] }[] = [
    { nom: 'CHARGEMENT', ecran: ETAT_INITIAL_REJOINDRE, permises: ['SESSION_CHARGEE', 'CHARGEMENT_REFUSE', 'CHARGEMENT_ECHOUE'] },
    {
      nom: 'FORMULAIRE (saisie, avec suggestion)',
      ecran: formulaire({ saisie: 'Alice', suggestion: 'Alice2' }),
      permises: ['SAISIE', 'ENTRER', 'SUGGESTION_CHOISIE'],
    },
    { nom: 'FORMULAIRE (envoi)', ecran: formulaire({ saisie: 'Alice', envoi: true }), permises: ['ENVOI_REFUSE', 'ENVOI_ECHOUE'] },
    { nom: 'INTROUVABLE', ecran: { nom: 'INTROUVABLE', message: 'm' }, permises: [] },
    { nom: 'TERMINE', ecran: { nom: 'TERMINE', message: 'm' }, permises: [] },
    { nom: 'ECHEC_CHARGEMENT', ecran: { nom: 'ECHEC_CHARGEMENT', message: 'm' }, permises: [] },
    { nom: 'QUIZ_NOTE', ecran: { nom: 'QUIZ_NOTE', session: SESSION, message: 'm' }, permises: [] },
  ]

  describe.each(CAS)('$nom', ({ ecran, permises }) => {
    it.each(ACTIONS.map((action) => [action.type, action] as const))('%s', (type, action) => {
      const suivant = reducerRejoindre(ecran, action)
      if (permises.includes(type)) expect(suivant).not.toBe(ecran)
      else expect(suivant).toBe(ecran)
    })
  })
})
