import './ecranEtudiant.css'

// TODO(UC9): message d'une perte de connexion absent de la spec (plan UC9, question U5). Valeur provisoire, à valider.
const LIBELLE_CONNEXION_PERDUE = 'Connexion perdue, reconnexion en cours…'

/** Bandeau affiché sur E8 et E9 pendant une coupure du temps réel (plan UC9, §5). */
export function BandeauConnexion() {
  return (
    <p className="bandeau-connexion" role="alert">
      {LIBELLE_CONNEXION_PERDUE}
    </p>
  )
}
