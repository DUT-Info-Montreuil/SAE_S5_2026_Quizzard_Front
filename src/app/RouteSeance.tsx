import { useLocation, useNavigate, useParams } from 'react-router'
import { EcranQuizEnCours } from '../features/seance/presentation/EcranQuizEnCours.tsx'

/**
 * `/seances/:idSession` : écran projeté E5 « Quiz en cours » (UC7), chargé en `lazy`. Recharger la page reprend la
 * séance (`GET /api/sessions/{idSession}`). Un 401 mène à l'écran de connexion avec le retour ; « Retour à
 * l'éditeur » revient à l'adresse d'où la séance a été lancée (sinon à l'accueil).
 */
export function RouteSeance() {
  const { idSession = '' } = useParams()
  const { pathname, state } = useLocation()
  const navigate = useNavigate()
  const retour = (state as { retour?: string } | null)?.retour ?? '/'

  if (!/^[1-9]\d*$/.test(idSession) || !Number.isSafeInteger(Number(idSession))) {
    return (
      <main className="ecran-projete ecran-projete-message">
        {/* Même message que le 404 SEANCE_INTROUVABLE du back (docs/API.md du back, §3.4). */}
        <p role="alert">Cette séance n'existe pas ou a été supprimée.</p>
      </main>
    )
  }

  return (
    <EcranQuizEnCours
      key={idSession}
      idSession={Number(idSession)}
      onNonConnecte={() => navigate(`/connexion?retour=${encodeURIComponent(pathname)}`)}
      onQuitter={() => navigate(retour)}
    />
  )
}
