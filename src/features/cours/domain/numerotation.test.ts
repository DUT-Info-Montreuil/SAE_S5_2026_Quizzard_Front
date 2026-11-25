// Numérotation et emplacements : plan UC3, §5 ; UC3, « Calcul de l'emplacement et de la numérotation ».
import { describe, expect, it } from 'vitest'
import type { PageInseree } from './cours.ts'
import { emplacementsInsertion, listeAffichee } from './numerotation.ts'

const quiz = (idPage: number, numeroPage: number, ordre: number): PageInseree => ({
  idPage,
  numeroPage,
  ordre,
  type: 'QUIZ',
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
