// Règles de l'import d'un PDF (UC2). Le serveur fait foi : il contrôle le contenu du fichier.

/** Taille maximale côté back (50 Mo, à valider avec le client). Au-delà de 100 Mo il coupe la connexion. */
export const TAILLE_MAX_OCTETS = 50 * 1024 * 1024
export const LONGUEUR_MAX_TITRE = 200

/** Ce que le domaine a besoin de savoir d'un fichier choisi. */
export interface FichierChoisi {
  name: string
  type: string
  size: number
}

export interface ErreursImport {
  fichier?: string
  titre?: string
}

/** Titre proposé à partir du nom du fichier. */
export function titrePropose(nomFichier: string): string {
  return [...nomFichier.replace(/\.pdf$/i, '').trim()].slice(0, LONGUEUR_MAX_TITRE).join('').trim()
}

export function erreurFichier(fichier: FichierChoisi | null): string | undefined {
  if (fichier === null) return 'Choisissez un fichier PDF.'
  if (fichier.type !== 'application/pdf' && !/\.pdf$/i.test(fichier.name)) return "Le fichier n'est pas un PDF."
  if (fichier.size > TAILLE_MAX_OCTETS) return 'Le fichier dépasse la limite de 50 Mo.'
  return undefined
}

export function erreurTitre(titre: string): string | undefined {
  // Comme le back : la longueur se compte en caractères Unicode, pas en unités UTF-16.
  const longueur = [...titre.trim()].length
  return longueur === 0 || longueur > LONGUEUR_MAX_TITRE
    ? 'Le titre est obligatoire (200 caractères au plus).'
    : undefined
}
