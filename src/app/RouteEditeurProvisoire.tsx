import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { EnteteCours } from '../features/cours/presentation/EnteteCours.tsx'
import { BoutonLancerPresentation } from '../features/seance/presentation/BoutonLancerPresentation.tsx'

/**
 * `/cours/:idCours?quiz=…` : tient lieu de E3. Le cours et sa dernière version sont lus par `GET /api/cours/{idCours}`
 * (en-tête) ; seul l'élément 11 « Lancer la présentation » est branché (UC7). Sans `quiz`, l'identifiant de l'adresse
 * sert de numéro de quiz. À remplacer par l'éditeur (UC3 à UC6), qui fournira aussi `quizPret`.
 */
export function RouteEditeurProvisoire() {
  const { idCours } = useParams()
  const [parametres] = useSearchParams()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const texte = parametres.get('quiz') ?? idCours ?? ''
  const retour = pathname + search
  const versConnexion = () => navigate('/connexion', { state: { retour } })

  return (
    <main className="page-enseignant">
      <EnteteCours idCours={idCours} onNonConnecte={versConnexion}>
        {(cours) => (
          <section aria-label="Éditeur (provisoire)">
            <p>Éditeur à venir (UC3 à UC6) · version affichée : v{cours.numeroVersion}</p>
            {/* TODO(fusion): lien provisoire vers l'éditeur de l'UC3, en attendant que E3 porte aussi l'élément 11. */}
            <p><Link to={`/cours/${idCours}/editeur`}>Ouvrir l'éditeur</Link></p>
            {/^[1-9]\d*$/.test(texte) ? (
              <>
                <p>Quiz n° {texte}</p>
                <BoutonLancerPresentation
                  idQuiz={Number(texte)}
                  onSeance={(idSession) => navigate(`/seances/${idSession}`, { state: { retour } })}
                  onNonConnecte={versConnexion}
                />
              </>
            ) : <p role="alert">Ce quiz n'existe pas ou a été supprimé.</p>}
          </section>
        )}
      </EnteteCours>
    </main>
  )
}
