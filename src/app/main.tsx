import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import '../shared/styles/tokens.css'
import '../shared/styles/police.css'
import '../index.css'
import App from '../App.tsx'
import { ConnexionProvisoire } from './ConnexionProvisoire.tsx'
import { RejoindreProvisoire } from './RejoindreProvisoire.tsx'
import { RouteQuestion } from './RouteQuestion.tsx'

// Routes de la SPA (docs/ARCHITECTURE.md §4).
const routeur = createBrowserRouter([
  { path: '/rejoindre/:codeAcces', Component: RejoindreProvisoire },
  { path: '/rejoindre/:codeAcces/question', Component: RouteQuestion },
  // Éditeur E3 (enseignant) en `lazy` : PDF.js et l'éditeur restent hors du bundle des écrans étudiants.
  { path: '/cours/:idCours/editeur', lazy: async () => ({ Component: (await import('./RouteEditeur.tsx')).RouteEditeur }) },
  // E5 « Quiz en cours » (enseignant, projeté), en `lazy` comme l'éditeur.
  { path: '/seances/:idSession', lazy: async () => ({ Component: (await import('./RouteSeance.tsx')).RouteSeance }) },
  { path: '/connexion', Component: ConnexionProvisoire },
  // Démo sans back, en développement seulement : absente du build de production.
  ...(import.meta.env.DEV
    ? [
        { path: '/demo/question', lazy: async () => ({ Component: (await import('./demo/DemoQuestion.tsx')).default }) },
        { path: '/demo/editeur', lazy: async () => ({ Component: (await import('./demo/DemoEditeur.tsx')).default }) },
      ]
    : []),
  // Modèle Vite, à remplacer.
  { path: '*', Component: App },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={routeur} />
  </StrictMode>,
)
