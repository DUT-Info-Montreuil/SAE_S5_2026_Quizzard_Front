import { useNavigate } from 'react-router'
import { CompteConnecte } from '../features/compte/presentation/CompteConnecte.tsx'
import { EcranMesCours } from '../features/cours/presentation/EcranMesCours.tsx'

/** `/cours` (E2). */
export function RouteMesCours() {
  const navigate = useNavigate()
  return (
    <EcranMesCours
      compte={<CompteConnecte onDeconnecte={() => navigate('/connexion')} />}
      onNonConnecte={() => navigate('/connexion', { state: { retour: '/cours' } })}
    />
  )
}
