import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { EcranQuizEnCours } from '../features/seance/presentation/EcranQuizEnCours.tsx'

/** `/seances/:idSession` (E5). L'écran est recréé si la séance change. */
export function RouteSeance() {
  const { idSession = '' } = useParams()
  const { pathname, state } = useLocation()
  const navigate = useNavigate()
  if (!/^[1-9]\d*$/.test(idSession)) return <Navigate to="/cours" replace />

  const retour = (state as { retour?: string } | null)?.retour ?? '/cours'
  return (
    <EcranQuizEnCours
      key={idSession}
      idSession={Number(idSession)}
      onNonConnecte={() => navigate('/connexion', { state: { retour: pathname } })}
      onQuitter={() => navigate(retour)}
    />
  )
}
