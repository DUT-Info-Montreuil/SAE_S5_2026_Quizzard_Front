// Routes REST de E2 (docs/API.md du back, §3.2).

import { requete } from '../../../shared/http/clientHttp.ts'
import type { Cours } from '../domain/cours.ts'

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

/**
 * Cours de l'enseignant connecté.
 * TODO(UC2): route documentée mais pas encore écrite côté back. Forme supposée : un tableau de la réponse de l'import.
 */
export async function listerCours(signal?: AbortSignal): Promise<Cours[]> {
  const { donnees } = await requete<unknown>('/api/cours', { signal })
  if (!Array.isArray(donnees)) throw new Error('Liste des cours illisible')
  return donnees.map(lireCours)
}

export interface DemandeImport {
  fichier: File
  titre: string
  /** Vrai pour importer un PDF déjà présent dans un autre cours. */
  confirmerDoublon: boolean
}

/** Importe un PDF : crée un cours en version 1. */
export async function importerCours({ fichier, titre, confirmerDoublon }: DemandeImport): Promise<Cours> {
  const corps = new FormData()
  corps.append('fichier', fichier)
  corps.append('titre', titre)
  corps.append('confirmerDoublon', String(confirmerDoublon))
  const { donnees } = await requete<unknown>('/api/cours', { methode: 'POST', corps })
  return lireCours(donnees)
}
