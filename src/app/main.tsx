import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import '../shared/styles/tokens.css'
import '../shared/styles/police.css'
import '../index.css'
import { ConnexionProvisoire } from './ConnexionProvisoire.tsx'
import { PageAVenir } from './PageAVenir.tsx'
import { RouteMesCours } from './RouteMesCours.tsx'
import { RouteQuestion } from './RouteQuestion.tsx'
import { RouteRejoindre } from './RouteRejoindre.tsx'

// Routes de la SPA (docs/ARCHITECTURE.md §4).
const routeur = createBrowserRouter([
  { path: '/rejoindre/:codeAcces', Component: RouteRejoindre },
  { path: '/rejoindre/:codeAcces/question', Component: RouteQuestion },
  { path: '/connexion', Component: ConnexionProvisoire },
  { path: '/cours', Component: RouteMesCours },
  // Éditeur E3 (enseignant) en `lazy` : PDF.js et l'éditeur restent hors du bundle des écrans étudiants.
  { path: '/cours/:idCours/editeur', lazy: async () => ({ Component: (await import('./RouteEditeur.tsx')).RouteEditeur }) },
  { path: '/cours/:idCours/resultats', element: <PageAVenir titre="Résultats" /> },
  { path: '/classements', element: <PageAVenir titre="Mes classements" /> },
  // E5 « Quiz en cours » (enseignant, projeté), en `lazy` comme l'éditeur.
  { path: '/seances/:idSession', lazy: async () => ({ Component: (await import('./RouteSeance.tsx')).RouteSeance }) },
  // Démo sans back, en développement seulement : absente du build de production.
  ...(import.meta.env.DEV
    ? [
      { path: '/demo/question', lazy: async () => ({ Component: (await import('./demo/DemoQuestion.tsx')).default }) },
      { path: '/demo/rejoindre', lazy: async () => ({ Component: (await import('./demo/DemoRejoindre.tsx')).default }) },
      { path: '/demo/editeur', lazy: async () => ({ Component: (await import('./demo/DemoEditeur.tsx')).default }) },
    ]
    : []),
  { path: '*', element: <Navigate to="/cours" replace /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={routeur} />
  </StrictMode>,
)
