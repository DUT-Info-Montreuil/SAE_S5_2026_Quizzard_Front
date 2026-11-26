import type { ErreursImport } from './importCours.ts'

/** Ce que le domaine lit d'une erreur du back. */
export interface ErreurBack {
  statut: number
  error: string | null
  request_id: string | null
  champs?: Record<string, string>
  code?: string
}

export type EchecImport =
  | { type: 'NON_CONNECTE' }
  | { type: 'DOUBLON', message: string }
  | { type: 'CHAMPS', erreurs: ErreursImport }
  | { type: 'MESSAGE', message: string, requestId: string | null }

const MESSAGE_ECHEC = "L'import a échoué, réessayez."

/** @param erreur `null` si le serveur n'a pas répondu. */
export function echecImport(erreur: ErreurBack | null): EchecImport {
  if (erreur === null) return { type: 'MESSAGE', message: MESSAGE_ECHEC, requestId: null }
  const { statut, error, request_id, champs, code } = erreur
  if (statut === 401) return { type: 'NON_CONNECTE' }
  if (code === 'DOUBLON_COURS') {
    return { type: 'DOUBLON', message: error ?? 'Vous avez déjà importé ce PDF. Importer quand même ?' }
  }
  if (statut === 413) {
    return { type: 'CHAMPS', erreurs: { fichier: error ?? 'Le fichier envoyé est trop volumineux.' } }
  }
  if (code === 'FICHIER_NON_PDF') {
    return { type: 'CHAMPS', erreurs: { fichier: error ?? "Le fichier n'est pas un PDF." } }
  }
  if (statut === 422 && (champs?.fichier !== undefined || champs?.titre !== undefined)) {
    return { type: 'CHAMPS', erreurs: { fichier: champs.fichier, titre: champs.titre } }
  }
  if (statut >= 500) return { type: 'MESSAGE', message: MESSAGE_ECHEC, requestId: request_id }
  return { type: 'MESSAGE', message: error ?? MESSAGE_ECHEC, requestId: request_id }
}
