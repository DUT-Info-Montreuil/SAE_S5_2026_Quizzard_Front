import { useCompte } from '../application/useCompte.ts'

/** En-tête des écrans enseignant : nom (lecture seule) et déconnexion. */
export function CompteConnecte({ onDeconnecte }: { onDeconnecte: () => void }) {
  const { profil, echec, seDeconnecter } = useCompte(onDeconnecte)
  return (
    <div className="boutons">
      {profil !== null && <span>{profil.prenom} {profil.nom}</span>}
      <button type="button" className="lien" onClick={() => void seDeconnecter()}>Se déconnecter</button>
      {echec && <span role="alert">La déconnexion a échoué, réessayez.</span>}
    </div>
  )
}
