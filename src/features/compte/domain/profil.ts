/** Enseignant connecté (`GET /api/auth/moi`). */
export interface Profil {
  nom: string
  prenom: string
}

/** « A. Bossard » : initiale du prénom et nom (en-tête E2). */
export function nomAffiche({ prenom, nom }: Profil): string {
  const initiale = prenom.trim().charAt(0).toUpperCase()
  return initiale === '' ? nom : `${initiale}. ${nom}`
}
