import { Navigate, useNavigate, useParams } from 'react-router'
import { lireJeton } from '../features/seance/application/jetonParticipant.ts'
import { PageRejoindre } from '../features/seance/presentation/PageRejoindre.tsx'

const routeQuestion = (codeAcces: string) => `/rejoindre/${encodeURIComponent(codeAcces)}/question`

/**
 * `/rejoindre/:codeAcces` (E7) avec la garde inverse (plan UC8, D3) : un jeton existe déjà pour ce `codeAcces`, donc
 * l'étudiant est déjà entré ; il va sur E8 sans nouveau participant. Un jeton périmé est supprimé par l'UC9
 * (`JETON_INVALIDE`, séance close) : les deux gardes ne bouclent pas.
 * Succès : le jeton est déjà gardé par le hook, puis navigation `replace` (D12) : Retour ne ramène pas au formulaire.
 */
export function RouteRejoindre() {
  const { codeAcces = '' } = useParams()
  const navigate = useNavigate()
  if (lireJeton(codeAcces) !== null) return <Navigate to={routeQuestion(codeAcces)} replace />

  return <PageRejoindre codeAcces={codeAcces} onRejoint={() => navigate(routeQuestion(codeAcces), { replace: true })} />
}
