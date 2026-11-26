import { Navigate, useNavigate, useParams } from 'react-router'
import { lireJeton } from '../features/seance/application/jetonParticipant.ts'
import { PageQuestion } from '../features/seance/presentation/PageQuestion.tsx'

const routeRejoindre = (codeAcces: string) => `/rejoindre/${encodeURIComponent(codeAcces)}`

/** `/rejoindre/:codeAcces/question` avec la garde étudiant : sans jeton pour ce `codeAcces`, retour à E7. */
export function RouteQuestion() {
  const { codeAcces = '' } = useParams()
  const navigate = useNavigate()
  const jeton = lireJeton(codeAcces)
  if (jeton === null) return <Navigate to={routeRejoindre(codeAcces)} replace />

  return (
    <PageQuestion
      codeAcces={codeAcces}
      jetonParticipant={jeton}
      onRejoindre={() => navigate(routeRejoindre(codeAcces), { replace: true })}
    />
  )
}
