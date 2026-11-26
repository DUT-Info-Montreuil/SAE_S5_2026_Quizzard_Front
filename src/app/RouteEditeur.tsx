import { useParams } from 'react-router'
import { MESSAGE_COURS_INTROUVABLE } from '../features/cours/domain/erreursEditeur.ts'
import '../features/cours/presentation/EditeurCours.css'
import { EcranEditeurCours } from './EcranEditeurCours.tsx'

/**
 * `/cours/:idCours/editeur` : éditeur E3 (plan UC3, B5), chargé en `lazy` pour garder PDF.js hors du bundle étudiant.
 * Identifiant non entier : « Cours introuvable. », sans appel au back.
 */
export function RouteEditeur() {
  const { idCours = '' } = useParams()
  const id = /^[1-9]\d*$/.test(idCours) ? Number(idCours) : NaN
  if (!Number.isSafeInteger(id)) {
    return (
      <main className="editeur-cours editeur-cours-attente">
        <p className="bandeau-erreur" role="alert">{MESSAGE_COURS_INTROUVABLE}</p>
      </main>
    )
  }
  // `key` : un autre cours repart d'un état neuf (document PDF, verrou, titres des quiz).
  return <EcranEditeurCours key={id} idCours={id} />
}
