// Routes REST de E2 et de l'ouverture d'un cours (docs/API.md du back, §3.2).

import { requete } from '../../../shared/http/clientHttp.ts'
import type { Cours, CoursOuvert } from '../domain/cours.ts'

function lireCours(valeur: unknown): Cours {
  const { idCours, titre, numeroVersion, nbPages, nbQuiz, dateModification } =
    (valeur ?? {}) as Record<string, unknown>
  if (
    typeof idCours !== 'number' || typeof titre !== 'string' || typeof numeroVersion !== 'number' ||
    typeof nbPages !== 'number' || typeof nbQuiz !== 'number' || typeof dateModification !== 'string'
  ) {
    throw new Error('Cours illisible')
  }
  return { idCours, titre, numeroVersion, nbPages, nbQuiz, dateModification }
}

/** `GET /api/cours` : cours non archivés de l'enseignant connecté, le plus récemment modifié d'abord. */
export async function listerCours(signal?: AbortSignal): Promise<Cours[]> {
  const { donnees } = await requete<unknown>('/api/cours', { signal })
  if (!Array.isArray(donnees)) throw new Error('Liste des cours illisible')
  return donnees.map(lireCours)
}

/**
 * `GET /api/cours/{idCours}` : le cours et sa dernière version (`idVersion`).
 * 404 `COURS_INTROUVABLE` : cours inexistant, archivé ou d'un autre enseignant.
 */
export async function ouvrirCours(idCours: number, signal?: AbortSignal): Promise<CoursOuvert> {
  const { donnees } = await requete<unknown>(`/api/cours/${idCours}`, { signal })
  const cours = lireCours(donnees)
  const { idVersion } = donnees as Record<string, unknown>
  if (typeof idVersion !== 'number') throw new Error('Cours illisible')
  return { ...cours, idVersion }
}

export interface DemandeImport {
  fichier: File
  titre: string
  /** Vrai pour importer un PDF déjà présent dans un autre cours. */
  confirmerDoublon: boolean
}

/** `POST /api/cours` : importe un PDF, crée un cours en version 1. */
export async function importerCours({ fichier, titre, confirmerDoublon }: DemandeImport): Promise<Cours> {
  const corps = new FormData()
  corps.append('fichier', fichier)
  corps.append('titre', titre)
  corps.append('confirmerDoublon', String(confirmerDoublon))
  const { donnees } = await requete<unknown>('/api/cours', { methode: 'POST', corps })
  return lireCours(donnees)
}
