// Table des erreurs : UC3, tableau « Cas d'erreur » ; plan UC3, §4.
import { describe, expect, it } from 'vitest'
import {
  MESSAGE_CHARGEMENT_PROVISOIRE,
  erreurReseauInsertion,
  lireErreurChargement,
  lireErreurInsertion,
} from './erreursEditeur.ts'

const CAS_UC3 = [
  { code: 'REQUETE_INVALIDE', statut: 400, message: 'Requête invalide, rechargez l\'éditeur.', action: 'RECHARGER', bloquer: false },
  { code: 'COURS_INTROUVABLE', statut: 404, message: 'Cours introuvable.', action: 'AUCUNE', bloquer: false },
  { code: 'COURS_ARCHIVE', statut: 409, message: 'Ce cours est archivé : il n\'est plus modifiable.', action: 'AUCUNE', bloquer: false },
  {
    code: 'VERSION_PERIMEE',
    statut: 409,
    message: 'Une nouvelle version du cours a été importée : rechargez l\'éditeur.',
    action: 'RECHARGER',
    bloquer: true,
  },
  { code: 'EMPLACEMENT_INVALIDE', statut: 422, message: 'Emplacement invalide : rechargez l\'éditeur.', action: 'RECHARGER', bloquer: true },
  { code: 'QUIZ_INTROUVABLE', statut: 404, message: 'Quiz introuvable.', action: 'AUCUNE', bloquer: false },
  {
    code: 'QUIZ_EN_SEANCE',
    statut: 409,
    message: 'Ce quiz est en cours de séance : réessayez après sa clôture.',
    action: 'AUCUNE',
    bloquer: false,
  },
  { code: 'ERREUR_SERVEUR', statut: 500, message: 'L\'insertion a échoué, réessayez.', action: 'AUCUNE', bloquer: false },
] as const

const MESSAGE_SERVEUR = 'L\'insertion a échoué, réessayez.'

describe('table des erreurs de l\'insertion', () => {
  it.each(CAS_UC3)('$code ($statut) : message exact de l\'UC3, bandeau, action et blocage du §4', (cas) => {
    // Le `error` du back n'est jamais affiché pour un code connu (D13).
    expect(lireErreurInsertion({ statut: cas.statut, code: cas.code, error: 'Certaines valeurs sont invalides.' })).toEqual({
      message: cas.message,
      affichage: 'BANDEAU',
      action: cas.action,
      bloquer: cas.bloquer,
    })
  })

  it('« Recharger » exactement quand le message dit « rechargez l\'éditeur »', () => {
    for (const cas of CAS_UC3) {
      expect(cas.action === 'RECHARGER').toBe(cas.message.includes('rechargez l\'éditeur'))
    }
  })

  it('401 : redirection vers la connexion, sans message', () => {
    expect(lireErreurInsertion({ statut: 401, error: null })).toEqual({
      message: null,
      affichage: 'REDIRECTION',
      action: 'AUCUNE',
      bloquer: false,
    })
  })

  it('403 : « Action non autorisée. », boutons réactivés', () => {
    expect(lireErreurInsertion({ statut: 403, error: 'Forbidden' })).toEqual({
      message: 'Action non autorisée.',
      affichage: 'BANDEAU',
      action: 'AUCUNE',
      bloquer: false,
    })
  })

  describe('replis sans code connu', () => {
    it('400 sans code : ligne REQUETE_INVALIDE', () => {
      expect(lireErreurInsertion({ statut: 400, error: null }).message).toBe('Requête invalide, rechargez l\'éditeur.')
    })

    it('5xx sans code (ou code inconnu) : ligne ERREUR_SERVEUR', () => {
      expect(lireErreurInsertion({ statut: 500, error: 'Erreur interne.' }).message).toBe(MESSAGE_SERVEUR)
      expect(lireErreurInsertion({ statut: 503, code: 'INCONNU', error: null }).message).toBe(MESSAGE_SERVEUR)
    })

    it.each([404, 409, 422])('%i sans code : `error` du back, boutons réactivés', (statut) => {
      expect(lireErreurInsertion({ statut, error: 'Cette opération entre en conflit.' })).toEqual({
        message: 'Cette opération entre en conflit.',
        affichage: 'BANDEAU',
        action: 'AUCUNE',
        bloquer: false,
      })
    })

    it.each([404, 409, 422])('%i sans code ni `error` : message ERREUR_SERVEUR', (statut) => {
      expect(lireErreurInsertion({ statut, error: null }).message).toBe(MESSAGE_SERVEUR)
    })

    it('panne réseau : message ERREUR_SERVEUR, « Recharger », boutons réactivés', () => {
      expect(erreurReseauInsertion()).toEqual({
        message: MESSAGE_SERVEUR,
        affichage: 'BANDEAU',
        action: 'RECHARGER',
        bloquer: false,
      })
    })
  })
})

describe('erreurs du chargement', () => {
  it('401 : redirection', () => {
    expect(lireErreurChargement({ statut: 401, error: null }).affichage).toBe('REDIRECTION')
  })

  it('404 : « Cours introuvable. » et « Recharger »', () => {
    const erreur = lireErreurChargement({ statut: 404, error: 'Ressource introuvable.', request_id: 'r1' })
    expect(erreur).toMatchObject({ message: 'Cours introuvable.', affichage: 'BANDEAU', action: 'RECHARGER', requestId: 'r1' })
  })

  it('autre : `error` du back et request_id, sinon texte provisoire ; toujours « Recharger »', () => {
    expect(lireErreurChargement({ statut: 500, error: 'Panne.', request_id: 'r2' })).toMatchObject({
      message: 'Panne.',
      action: 'RECHARGER',
      requestId: 'r2',
    })
    expect(lireErreurChargement(null)).toMatchObject({
      message: MESSAGE_CHARGEMENT_PROVISOIRE,
      action: 'RECHARGER',
      requestId: null,
    })
  })
})
