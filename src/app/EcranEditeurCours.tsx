import { Navigate } from 'react-router'
import { useEditeurCours } from '../features/cours/application/useEditeurCours.ts'
import { EditeurCours } from '../features/cours/presentation/EditeurCours.tsx'

const routeEditeur = (idCours: number) => `/cours/${idCours}/editeur`

/** Éditeur E3 branché sur le back ; un 401 (état CONNEXION) mène à l'écran de connexion avec le retour (D5). */
export function EcranEditeurCours({ idCours }: { idCours: number }) {
  const editeur = useEditeurCours(idCours)
  if (editeur.etat.nom === 'CONNEXION') {
    return <Navigate to={`/connexion?retour=${encodeURIComponent(routeEditeur(idCours))}`} replace />
  }
  return <EditeurCours {...editeur} />
}
