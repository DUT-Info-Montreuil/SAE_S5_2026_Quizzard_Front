import { describe, expect, it } from 'vitest'
import { etatCours, libelleDate, resumeVersion, sigleCours } from './cours.ts'
import type { CoursListe } from './cours.ts'

const cours = (plus: Partial<CoursListe> = {}): CoursListe => ({
  idCours: 1, titre: 'CM 1 Programmation', numeroVersion: 3, nbPages: 6, nbQuiz: 2,
  dateModification: '2026-11-25T14:00:00', ...plus,
})

describe('sigleCours', () => {
  it.each([
    ['CM 1 Programmation avancée', 'CM1'],
    ['td3 Structures', 'TD3'],
    ['Bases de données', 'BD'],
    ['Réseaux', 'RÉ'],
  ])('%s → %s', (titre, sigle) => expect(sigleCours(titre)).toBe(sigle))
})

describe('résumé et état', () => {
  it('prêt avec des quiz', () => {
    expect(etatCours(cours())).toBe('PRET')
    expect(resumeVersion(cours())).toBe('v3 · 6 pages · 2 quiz')
  })

  it('sans quiz', () => {
    expect(etatCours(cours({ nbQuiz: 0 }))).toBe('SANS_QUIZ')
    expect(resumeVersion(cours({ nbQuiz: 0, nbPages: 1 }))).toBe('v3 · 1 page · aucun quiz')
  })
})

describe('libelleDate', () => {
  const maintenant = new Date('2026-11-26T09:00:00')
  it('hier', () => expect(libelleDate(cours(), maintenant)).toBe('Modifié hier'))
  it("aujourd'hui", () =>
    expect(libelleDate(cours({ dateModification: '2026-11-26T08:00:00' }), maintenant)).toBe("Modifié aujourd'hui"))
  it('importé, sans modification', () =>
    expect(libelleDate(cours({ numeroVersion: 1, nbQuiz: 0, dateModification: '2026-10-08T10:00:00' }), maintenant))
      .toBe('Importé le 8 oct.'))
  it('date invalide', () => expect(libelleDate(cours({ dateModification: 'x' }), maintenant)).toBe('—'))
})
