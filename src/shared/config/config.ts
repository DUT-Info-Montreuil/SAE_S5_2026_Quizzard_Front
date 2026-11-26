// Configuration de l'application, lue dans les variables d'environnement de Vite (fichier .env).
// C'est le seul fichier qui lit import.meta.env : le reste du code importe les constantes ci-dessous.
// Rappel : ces valeurs sont recopiées dans le JavaScript envoyé au navigateur, elles sont publiques.

function lireUrlApi(): string {
  const valeur: unknown = import.meta.env.VITE_API_URL
  if (typeof valeur !== 'string') {
    throw new Error(
      'VITE_API_URL manquante : copier .env.example en .env (voir docs/ARCHITECTURE.md §10).',
    )
  }
  // Une chaîne vide est permise : chemins relatifs, quand front et back partagent la même origine (production).
  return valeur.trim().replace(/\/+$/, '')
}

/** Adresse du back, sans barre finale (exemple : `http://localhost:8080`). */
export const urlApi = lireUrlApi()

/**
 * Adresse du point d'entrée STOMP `/ws`, déduite de `urlApi` (`http` → `ws`, `https` → `wss`).
 * `urlApi` vide (même origine) : origine de la page.
 */
export const urlWs = (urlApi === '' ? location.origin : urlApi).replace(/^http/, 'ws') + '/ws'

/** Vrai avec `npm run dev`, faux dans le build de production. */
export const estEnDeveloppement = import.meta.env.DEV
