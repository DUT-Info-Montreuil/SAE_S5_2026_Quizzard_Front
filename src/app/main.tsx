import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import '../shared/styles/tokens.css'
import '../shared/styles/police.css'
import '../index.css'
import App from '../App.tsx'
import { RejoindreProvisoire } from './RejoindreProvisoire.tsx'
import { RouteQuestion } from './RouteQuestion.tsx'

// Routes de la SPA (docs/ARCHITECTURE.md §4).
const routeur = createBrowserRouter([
  { path: '/rejoindre/:codeAcces', Component: RejoindreProvisoire },
  { path: '/rejoindre/:codeAcces/question', Component: RouteQuestion },
  // Démo sans back, en développement seulement : absente du build de production.
  ...(import.meta.env.DEV
    ? [
      { path: '/demo/question', lazy: async () => ({ Component: (await import('./demo/DemoQuestion.tsx')).default }) },
      { path: '/demo/rejoindre', lazy: async () => ({ Component: (await import('./demo/DemoRejoindre.tsx')).default }) },
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
