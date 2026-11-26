import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import '../shared/styles/tokens.css'
import '../shared/styles/police.css'
import '../index.css'
import { PageAVenir } from './PageAVenir.tsx'
import { RouteEditeurProvisoire } from './RouteEditeurProvisoire.tsx'
import { RouteMesCours } from './RouteMesCours.tsx'
import { RouteSeance } from './RouteSeance.tsx'

// Routes de la SPA (docs/ARCHITECTURE.md §4).
const routeur = createBrowserRouter([
  { path: '/connexion', element: <PageAVenir titre="Connexion" /> },
  { path: '/cours', Component: RouteMesCours },
  { path: '/cours/:idCours', Component: RouteEditeurProvisoire },
  { path: '/cours/:idCours/resultats', element: <PageAVenir titre="Résultats" /> },
  { path: '/classements', element: <PageAVenir titre="Mes classements" /> },
  { path: '/seances/:idSession', Component: RouteSeance },
  { path: '*', element: <Navigate to="/cours" replace /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={routeur} />
  </StrictMode>,
)
