import { Navigate, useNavigate } from 'react-router'
import { useEditeurCours } from '../features/cours/application/useEditeurCours.ts'
import type { OptionsEditeurCours } from '../features/cours/application/useEditeurCours.ts'
import type { EtatEditeur } from '../features/cours/domain/machineEditeur.ts'
import { EditeurCours } from '../features/cours/presentation/EditeurCours.tsx'
import { BoutonLancerPresentation } from '../features/seance/presentation/BoutonLancerPresentation.tsx'

const routeEditeur = (idCours: number) => `/cours/${idCours}/editeur`
const routeConnexion = (retour: string) => `/connexion?retour=${encodeURIComponent(retour)}`

/** Quiz de la page de quiz sélectionnée, proposé en premier au lancement ; `null` sinon. */
function quizDeLaSelection(etat: EtatEditeur): number | null {
  if ((etat.nom !== 'PRET' && etat.nom !== 'LECTURE_SEULE') || etat.selection.genre !== 'PAGE_INSEREE') return null
  const { idPage } = etat.selection
  return etat.pages.find((p) => p.idPage === idPage)?.idQuiz ?? null
}

/**
 * Éditeur E3 branché sur le back ; un 401 (état CONNEXION) mène à l'écran de connexion avec le retour (D5).
 * Élément 11 (UC7) : branché ici, la feature `cours` ne connaît pas la feature `seance`. Lancement ou reprise → E5.
 */
export function EcranEditeurCours({ idCours, options }: { idCours: number, options?: OptionsEditeurCours }) {
  const editeur = useEditeurCours(idCours, options)
  const navigate = useNavigate()
  const retour = routeEditeur(idCours)

  if (editeur.etat.nom === 'CONNEXION') return <Navigate to={routeConnexion(retour)} replace />

  const { etat } = editeur
  // Cours archivé (lecture seule) : le back refuse le lancement (404), le bouton n'est pas proposé.
  const lancement = etat.nom === 'PRET' && (
    <BoutonLancerPresentation
      quiz={etat.quiz}
      idQuizPropose={quizDeLaSelection(etat)}
      // TODO(UC7): l'éditeur ne connaît pas encore les questions (UC4) : impossible de savoir si une question est
      // incomplète (plan UC7, question Q2). En attendant, le bouton reste actif et le 422 QUIZ_INCOMPLET fait foi.
      quizPret
      onSeance={(idSession) => navigate(`/seances/${idSession}`, { state: { retour } })}
      onNonConnecte={() => navigate(routeConnexion(retour))}
    />
  )

  return <EditeurCours {...editeur} actionsEntete={lancement || undefined} />
}
