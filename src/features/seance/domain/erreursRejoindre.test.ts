// Table des erreurs : UC8, tableau « Cas d'erreur » ; plan UC8, §4, D6, D7 et D11.
import { describe, expect, it } from 'vitest'
import { lireErreurConsultation, lireErreurRejoindre } from './erreursRejoindre.ts'

const INTROUVABLE = 'Ce quiz n\'existe pas : vérifie le lien ou scanne à nouveau le QR code.'
const TERMINE = 'Ce quiz est terminé.'
const NOTE = 'Ce quiz est noté : connecte-toi avec ton compte IUT.'
const INVALIDE = 'Ton pseudonyme doit faire de 2 à 20 caractères.'
const PRIS = 'Ce pseudonyme est déjà pris. Essaie celui qui t\'est proposé.'
const PRIS_SANS = 'Ce pseudonyme est déjà pris.'
const SERVEUR = 'Une erreur est survenue. Réessayez dans un instant.'

describe('erreurs de l\'entrée dans le quiz, avec code', () => {
  it.each([
    ['SESSION_INTROUVABLE', 404, INTROUVABLE, 'INTROUVABLE'],
    ['SESSION_CLOSE', 409, TERMINE, 'TERMINE'],
    ['CONNEXION_IUT_REQUISE', 409, NOTE, 'QUIZ_NOTE'],
    ['PSEUDONYME_INVALIDE', 422, INVALIDE, 'FORMULAIRE'],
    ['ERREUR_SERVEUR', 500, SERVEUR, 'FORMULAIRE'],
  ])('%s (%i) : message exact de l\'UC8', (code, statut, message, affichage) => {
    expect(lireErreurRejoindre({ statut, code, error: 'message du back' })).toEqual({
      code, message, affichage, suggestion: null,
    })
  })

  it('PSEUDONYME_DEJA_PRIS avec suggestion : message et proposition', () => {
    expect(lireErreurRejoindre({ statut: 409, code: 'PSEUDONYME_DEJA_PRIS', error: 'x', suggestion: 'Alice2' }))
      .toEqual({ code: 'PSEUDONYME_DEJA_PRIS', message: PRIS, affichage: 'FORMULAIRE', suggestion: 'Alice2' })
  })

  it('PSEUDONYME_DEJA_PRIS sans suggestion (doublon simultané)', () => {
    expect(lireErreurRejoindre({ statut: 409, code: 'PSEUDONYME_DEJA_PRIS', error: 'x' }))
      .toEqual({ code: 'PSEUDONYME_DEJA_PRIS', message: PRIS_SANS, affichage: 'FORMULAIRE', suggestion: null })
  })

  it('une suggestion vide compte comme absente', () => {
    expect(lireErreurRejoindre({ statut: 409, code: 'PSEUDONYME_DEJA_PRIS', error: 'x', suggestion: '' }).message)
      .toBe(PRIS_SANS)
  })

  it('REQUETE_INVALIDE (400) : message `error` du back, formulaire', () => {
    expect(lireErreurRejoindre({ statut: 400, code: 'REQUETE_INVALIDE', error: 'Corps illisible.' }))
      .toMatchObject({ message: 'Corps illisible.', affichage: 'FORMULAIRE' })
  })

  it('ignore la suggestion hors « pseudonyme pris »', () => {
    expect(lireErreurRejoindre({ statut: 422, code: 'PSEUDONYME_INVALIDE', error: null, suggestion: 'x' }).suggestion)
      .toBeNull()
  })
})

describe('erreurs de l\'entrée dans le quiz, repli sans code', () => {
  it.each([
    [404, 'SESSION_INTROUVABLE', INTROUVABLE, 'INTROUVABLE'],
    [422, 'PSEUDONYME_INVALIDE', INVALIDE, 'FORMULAIRE'],
    [500, 'ERREUR_SERVEUR', SERVEUR, 'FORMULAIRE'],
    [403, 'ERREUR_SERVEUR', SERVEUR, 'FORMULAIRE'],
    [502, 'ERREUR_SERVEUR', SERVEUR, 'FORMULAIRE'],
  ])('%i : %s', (statut, code, message, affichage) => {
    expect(lireErreurRejoindre({ statut, error: 'message du back' })).toEqual({
      code, message, affichage, suggestion: null,
    })
  })

  it('422 : jamais le message `error` du back (D7)', () => {
    expect(lireErreurRejoindre({ statut: 422, error: 'Certaines valeurs sont invalides.' }).message).toBe(INVALIDE)
  })

  it('409 avec suggestion : pseudonyme pris avec proposition', () => {
    expect(lireErreurRejoindre({ statut: 409, error: 'x', suggestion: 'Alice2' }))
      .toEqual({ code: 'PSEUDONYME_DEJA_PRIS', message: PRIS, affichage: 'FORMULAIRE', suggestion: 'Alice2' })
  })

  it('409 sans suggestion : message `error` du back, formulaire', () => {
    expect(lireErreurRejoindre({ statut: 409, error: 'Ce quiz est terminé.' }))
      .toEqual({ code: null, message: 'Ce quiz est terminé.', affichage: 'FORMULAIRE', suggestion: null })
  })

  it('409 sans suggestion ni message : message provisoire du 500', () => {
    expect(lireErreurRejoindre({ statut: 409, error: null }).message).toBe(SERVEUR)
  })

  it('code inconnu : repli par statut', () => {
    expect(lireErreurRejoindre({ statut: 404, code: 'AUTRE', error: null }).code).toBe('SESSION_INTROUVABLE')
  })
})

describe('erreurs du chargement du quiz', () => {
  it('404 : quiz inexistant', () => {
    expect(lireErreurConsultation({ statut: 404, error: 'x' })).toEqual({ affichage: 'INTROUVABLE', message: INTROUVABLE })
  })

  it('409 : quiz terminé', () => {
    expect(lireErreurConsultation({ statut: 409, error: 'x' })).toEqual({ affichage: 'TERMINE', message: TERMINE })
  })

  it.each([
    ['500', { statut: 500, error: 'x' }],
    ['autre statut', { statut: 403, error: 'x' }],
    ['panne réseau ou corps mal formé', null],
  ])('%s : échec du chargement, message provisoire du 500', (_cas, erreur) => {
    expect(lireErreurConsultation(erreur)).toEqual({ affichage: 'ECHEC_CHARGEMENT', message: SERVEUR })
  })
})
