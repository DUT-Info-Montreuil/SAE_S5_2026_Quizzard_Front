import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import '../shared/styles/tokens.css'
import '../shared/styles/police.css'
import '../index.css'
import App from '../App.tsx'

// Début du bloc « démo » : démos temporaires de E8 (?demo=e8) et E9 (?demo=e9), en développement seulement.
// À supprimer avec src/app/demo/.
const demo = import.meta.env.DEV ? new URLSearchParams(location.search).get('demo') : null
/* eslint-disable react-refresh/only-export-components -- point d'entrée, sans fast refresh à préserver */
const Racine = demo === 'e8'
  ? lazy(() => import('./demo/DemoE8.tsx'))
  : demo === 'e9'
    ? lazy(() => import('./demo/DemoE9.tsx'))
    : App
/* eslint-enable react-refresh/only-export-components */
// Fin du bloc « démo ».

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense>
      <Racine />
    </Suspense>
  </StrictMode>,
)
