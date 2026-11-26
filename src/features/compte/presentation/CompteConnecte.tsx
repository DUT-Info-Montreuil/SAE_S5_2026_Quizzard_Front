import { useCompte } from '../application/useCompte.ts'
import { nomAffiche } from '../domain/profil.ts'

/** En-tête des écrans enseignant : nom (lecture seule) et déconnexion. */
export function CompteConnecte({ onDeconnecte }: { onDeconnecte: () => void }) {
  const { profil, echec, seDeconnecter } = useCompte(onDeconnecte)
  return (
    <div className="boutons">
      {profil !== null && (
        <span className="nom-utilisateur" title={`${profil.prenom} ${profil.nom}`}>{nomAffiche(profil)}</span>
      )}
      <button type="button" className="bouton bouton-secondaire" onClick={() => void seDeconnecter()}>
        Se déconnecter
      </button>
      {echec && <span role="alert">La déconnexion a échoué, réessayez.</span>}
    </div>
  )
}
