import { describe, expect, it } from 'vitest'
import { echecImport } from './erreursImport.ts'
import { erreurFichier, erreurTitre, TAILLE_MAX_OCTETS, titrePropose } from './importCours.ts'

const pdf = (size: number) => ({ name: 'a.PDF', type: '', size })

describe('règles de l\'import', () => {
  it('propose le nom du fichier sans extension, 200 caractères au plus', () => {
    expect(titrePropose('Réseaux v1.2.PDF')).toBe('Réseaux v1.2')
    expect(titrePropose('a'.repeat(250) + '.pdf')).toHaveLength(200)
  })

  it('refuse un fichier absent, non PDF ou trop lourd', () => {
    expect(erreurFichier(null)).toBeDefined()
    expect(erreurFichier({ name: 'a.docx', type: '', size: 1 })).toBe("Le fichier n'est pas un PDF.")
    expect(erreurFichier(pdf(TAILLE_MAX_OCTETS + 1))).toMatch(/50 Mo/)
    expect(erreurFichier(pdf(TAILLE_MAX_OCTETS))).toBeUndefined()
  })

  it('compte le titre en caractères, sans les espaces autour', () => {
    expect(erreurTitre('   ')).toBeDefined()
    expect(erreurTitre('é'.repeat(201))).toBeDefined()
    expect(erreurTitre(` ${'😀'.repeat(200)} `)).toBeUndefined()
  })

  it('413 du reverse proxy, sans corps : message sous le fichier', () => {
    expect(echecImport({ statut: 413, error: null, request_id: null })).toMatchObject({
      type: 'CHAMPS', erreurs: { fichier: 'Le fichier envoyé est trop volumineux.' },
    })
  })
})
