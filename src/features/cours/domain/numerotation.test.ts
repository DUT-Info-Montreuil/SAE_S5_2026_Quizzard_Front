// Numérotation et emplacements : plan UC3, §5 ; UC3, « Calcul de l'emplacement et de la numérotation ».
import { describe, expect, it } from 'vitest'
import type { PageInseree } from './cours.ts'
import { emplacementsInsertion, listeAffichee } from './numerotation.ts'

const quiz = (idPage: number, numeroPage: number, ordre: number): PageInseree => ({
  idPage,
  numeroPage,
  ordre,
  type: 'QUIZ',
  titreQuiz: 'Quiz 1',
})

describe('listeAffichee', () => {
  it('exemple du dossier : PDF de 12 pages, page en (2, 0), insertion en (4, 0) → position 6, page 5 du PDF → 7', () => {
    const liste = listeAffichee(12, [quiz(1, 2, 0), quiz(2, 4, 0)])
    const inseree = liste.find((e) => e.genre === 'PAGE_INSEREE' && e.page.idPage === 2)
    const page5 = liste.find((e) => e.genre === 'PAGE_PDF' && e.numeroPage === 5)
    expect(inseree?.position).toBe(6)
    expect(page5?.position).toBe(7)
  })

  it('ordre d\'affichage : insérées à 0, page 1, insérées à 1… ; positions 1 à N sans trou', () => {
    // Données dans le désordre : la fonction trie par (numeroPage, ordre).
    const liste = listeAffichee(2, [quiz(13, 2, 0), quiz(11, 0, 1), quiz(10, 0, 0), quiz(12, 1, 0)])
    expect(liste.map((e) => (e.genre === 'PAGE_PDF' ? `p${e.numeroPage}` : `q${e.page.idPage}`))).toEqual([
      'q10', 'q11', 'p1', 'q12', 'p2', 'q13',
    ])
    expect(liste.map((e) => e.position)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('sans page insérée : pages du PDF en positions 1 à nbPages', () => {
    expect(listeAffichee(3, [])).toEqual([
      { genre: 'PAGE_PDF', numeroPage: 1, position: 1 },
      { genre: 'PAGE_PDF', numeroPage: 2, position: 2 },
      { genre: 'PAGE_PDF', numeroPage: 3, position: 3 },
    ])
  })
})

describe('emplacementsInsertion', () => {
  const pages = [quiz(1, 0, 0), quiz(2, 2, 0), quiz(3, 2, 1), quiz(4, 3, 0)]
  const emplacements = emplacementsInsertion(3, pages)

  it('un emplacement avant le premier élément, entre chaque paire et après le dernier', () => {
    expect(emplacements).toHaveLength(listeAffichee(3, pages).length + 1)
    expect(emplacements).toEqual([
      { numeroPage: 0, ordre: 0 }, // début
      { numeroPage: 0, ordre: 1 }, // après la page insérée (0, 0)
      { numeroPage: 1, ordre: 0 }, // après la page 1 du PDF
      { numeroPage: 2, ordre: 0 }, // après la page 2 du PDF
      { numeroPage: 2, ordre: 1 }, // après (2, 0)
      { numeroPage: 2, ordre: 2 }, // après (2, 1)
      { numeroPage: 3, ordre: 0 }, // après la page 3 du PDF
      { numeroPage: 3, ordre: 1 }, // après (3, 0) : fin
    ])
  })

  it('chaque emplacement valide figure une seule fois, et aucun autre', () => {
    const valides: string[] = []
    for (let n = 0; n <= 3; n++) {
      const nb = pages.filter((p) => p.numeroPage === n).length
      for (let o = 0; o <= nb; o++) valides.push(`${n},${o}`)
    }
    const obtenus = emplacements.map((e) => `${e.numeroPage},${e.ordre}`)
    expect(new Set(obtenus).size).toBe(obtenus.length)
    expect([...obtenus].sort()).toEqual([...valides].sort())
  })

  it('l\'emplacement avant un élément donne la position de la page qui y serait insérée', () => {
    // Insérer en (2, 1) place la page entre (2, 0) et (2, 1) : position 5 (exemple : 2 + 1 + 1 + 1).
    const liste = listeAffichee(3, pages)
    const i = emplacements.findIndex((e) => e.numeroPage === 2 && e.ordre === 1)
    expect(liste[i].position).toBe(2 + 1 + 1 + 1)
  })
})

describe('numérotation : cas limites (B6)', () => {
  const libelle = (e: ReturnType<typeof listeAffichee>[number]) =>
    e.genre === 'PAGE_PDF' ? `p${e.numeroPage}@${e.position}` : `q${e.page.idPage}@${e.position}`

  it('plusieurs pages au même endroit : positions consécutives par ordre, page suivante du PDF décalée d\'autant', () => {
    const liste = listeAffichee(6, [quiz(3, 4, 2), quiz(1, 4, 0), quiz(2, 4, 1)])
    expect(liste.map(libelle)).toEqual([
      'p1@1', 'p2@2', 'p3@3', 'p4@4', 'q1@5', 'q2@6', 'q3@7', 'p5@8', 'p6@9',
    ])
  })

  it('pages avant la première (numeroPage 0) : en tête, la page 1 du PDF décalée', () => {
    const liste = listeAffichee(2, [quiz(1, 0, 0), quiz(2, 0, 1)])
    expect(liste.map(libelle)).toEqual(['q1@1', 'q2@2', 'p1@3', 'p2@4'])
  })

  it('pages après la dernière (numeroPage = nbPages) : en fin, pages du PDF non décalées', () => {
    const liste = listeAffichee(3, [quiz(1, 3, 0), quiz(2, 3, 1)])
    expect(liste.map(libelle)).toEqual(['p1@1', 'p2@2', 'p3@3', 'q1@4', 'q2@5'])
  })
})

describe('emplacements : bornes et pages au même endroit (B6)', () => {
  const pages = [quiz(1, 4, 0), quiz(2, 4, 1)]
  const emplacements = emplacementsInsertion(5, pages)
  const texte = emplacements.map((e) => `${e.numeroPage},${e.ordre}`)

  it('premier (0, 0), dernier (nbPages, 0) ; rien hors de 0 ≤ numeroPage ≤ nbPages', () => {
    expect(texte[0]).toBe('0,0')
    expect(texte[texte.length - 1]).toBe('5,0')
    expect(emplacements.every((e) => e.numeroPage >= 0 && e.numeroPage <= 5 && e.ordre >= 0)).toBe(true)
  })

  it('autour de deux pages en (4, x) : (4,0) juste avant, (4,1) entre, (4,2) juste après', () => {
    const i = texte.indexOf('4,0')
    expect(texte.slice(i, i + 3)).toEqual(['4,0', '4,1', '4,2'])
    expect(texte[i + 3]).toBe('5,0')
    expect(texte).not.toContain('4,3')
  })

  it('aucune page insérée : un emplacement par espace, (p, 0) pour p de 0 à nbPages', () => {
    expect(emplacementsInsertion(3, [])).toEqual([0, 1, 2, 3].map((numeroPage) => ({ numeroPage, ordre: 0 })))
  })
})
