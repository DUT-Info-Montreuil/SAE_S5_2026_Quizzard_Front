import { describe, expect, it } from 'vitest'
import { echecLancement, MESSAGE_LANCEMENT_ECHOUE } from './erreursLancement.ts'

const refus = (statut: number, error: string | null, code?: string) => ({ statut, error, code, request_id: 'req-1' })

describe('erreurs du lancement (UC7, tableau « Cas d\'erreur »)', () => {
  it('401 : retour à la connexion', () => {
    expect(echecLancement(refus(401, 'Vous devez être connecté.'))).toEqual({ type: 'NON_CONNECTE' })
  })

  it('409 : la décision demandée dépend du code', () => {
    const deja = 'Une session est déjà ouverte pour le cours « Réseaux ». La reprendre ou la terminer ?'
    expect(echecLancement(refus(409, deja, 'SESSION_DEJA_OUVERTE')))
      .toEqual({ type: 'SESSION_DEJA_OUVERTE', message: deja })
    const annuaire = "L'annuaire de l'IUT est indisponible. Autoriser l'entrée en identité non vérifiée ?"
    expect(echecLancement(refus(409, annuaire, 'ANNUAIRE_INDISPONIBLE')))
      .toEqual({ type: 'ANNUAIRE_INDISPONIBLE', message: annuaire })
  })

  it('422 : message du back, avec la page incomplète', () => {
    const message = 'Le quiz contient une question incomplète (page 6). Complétez-la avant de lancer.'
    expect(echecLancement(refus(422, message, 'QUIZ_INCOMPLET'))).toEqual({ type: 'MESSAGE', message, requestId: null })
  })

  it('403 et 404 sans corps du back : messages de la spec', () => {
    expect(echecLancement(refus(403, null))).toMatchObject({ message: 'Action non autorisée.' })
    expect(echecLancement(refus(404, null))).toMatchObject({ message: "Ce quiz n'existe pas ou a été supprimé." })
  })

  it('500 ou panne réseau : « Le lancement a échoué, réessayez. »', () => {
    expect(MESSAGE_LANCEMENT_ECHOUE).toBe('Le lancement a échoué, réessayez.')
    expect(echecLancement(refus(500, 'Une erreur est survenue.')))
      .toEqual({ type: 'MESSAGE', message: MESSAGE_LANCEMENT_ECHOUE, requestId: 'req-1' })
    expect(echecLancement(null)).toEqual({ type: 'MESSAGE', message: MESSAGE_LANCEMENT_ECHOUE, requestId: null })
  })
})
