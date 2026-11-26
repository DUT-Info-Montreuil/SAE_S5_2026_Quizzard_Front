// Table des erreurs : UC9, tableau « Cas d'erreur » ; plan UC9, §4 et D3.
import { describe, expect, it } from 'vitest'
import { lireErreurEnvoi } from './erreursReponse.ts'

const CAS_UC9 = [
  { code: 'JETON_INVALIDE', statut: 401, message: 'Ta session a expiré, rejoins le quiz à nouveau.', corrigeable: false },
  { code: 'QUESTION_CLOSE', statut: 409, message: 'Cette session est terminée.', corrigeable: false },
  { code: 'HORS_DELAI', statut: 409, message: 'Temps écoulé : réponse non prise en compte.', corrigeable: false },
  { code: 'DEJA_REPONDU', statut: 409, message: 'Tu as déjà répondu.', corrigeable: false },
  { code: 'REPONSE_INVALIDE', statut: 422, message: 'Réponse incomplète, vérifie ta saisie.', corrigeable: true },
  { code: 'ERREUR_SERVEUR', statut: 500, message: 'Réponse non enregistrée, réessaie.', corrigeable: true },
] as const

describe('table des erreurs de l\'envoi', () => {
  describe.each(CAS_UC9)('$code ($statut)', ({ code, statut, message, corrigeable }) => {
    it('donne le message exact de l\'UC9', () => {
      expect(lireErreurEnvoi({ statut, code, error: 'message du back' }, true).message).toBe(message)
    })

    it('s\'il reste du temps : corrigeable selon l\'UC9, sur E8 si corrigeable, sinon E9', () => {
      const erreur = lireErreurEnvoi({ statut, code, error: null }, true)
      expect(erreur.code).toBe(code)
      expect(erreur.corrigeable).toBe(corrigeable)
      expect(erreur.ecran).toBe(corrigeable ? 'E8' : 'E9')
    })

    it('à t = 0 : jamais corrigeable, toujours E9', () => {
      const erreur = lireErreurEnvoi({ statut, code, error: null }, false)
      expect(erreur.corrigeable).toBe(false)
      expect(erreur.ecran).toBe('E9')
    })
  })

  it('JETON_INVALIDE supprime le jeton, les autres non', () => {
    for (const { code, statut } of CAS_UC9) {
      expect(lireErreurEnvoi({ statut, code, error: null }, true).supprimerJeton).toBe(code === 'JETON_INVALIDE')
    }
  })

  describe('repli sur le statut HTTP sans code (D3)', () => {
    it.each([
      [401, 'JETON_INVALIDE', 'Ta session a expiré, rejoins le quiz à nouveau.'],
      [422, 'REPONSE_INVALIDE', 'Réponse incomplète, vérifie ta saisie.'],
      [500, 'ERREUR_SERVEUR', 'Réponse non enregistrée, réessaie.'],
    ])('statut %i → %s', (statut, code, message) => {
      const erreur = lireErreurEnvoi({ statut, error: 'autre texte' }, true)
      expect(erreur.code).toBe(code)
      expect(erreur.message).toBe(message)
    })

    it('409 sans code : message `error` du back, non corrigeable, E9', () => {
      const erreur = lireErreurEnvoi({ statut: 409, error: 'Conflit côté serveur' }, true)
      expect(erreur.message).toBe('Conflit côté serveur')
      expect(erreur.corrigeable).toBe(false)
      expect(erreur.ecran).toBe('E9')
    })

    it('un code inconnu se rabat sur le statut', () => {
      expect(lireErreurEnvoi({ statut: 422, code: 'INCONNU', error: null }, true).code).toBe('REPONSE_INVALIDE')
    })
  })
})
