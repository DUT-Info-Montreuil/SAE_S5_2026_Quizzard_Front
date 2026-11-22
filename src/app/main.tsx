import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import '../shared/styles/tokens.css'
import '../shared/styles/police.css'
import '../index.css'
import App from '../App.tsx'

// Début du bloc « démo » : démo temporaire de E8 (?demo=e8), en développement seulement. À supprimer avec src/app/demo/.
const demoE8 = import.meta.env.DEV && new URLSearchParams(location.search).get('demo') === 'e8'
// eslint-disable-next-line react-refresh/only-export-components -- point d'entrée, sans fast refresh à préserver
const Racine = demoE8 ? lazy(() => import('./demo/DemoE8.tsx')) : App
// Fin du bloc « démo ».

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense>
      <Racine />
    </Suspense>
  </StrictMode>,
)
