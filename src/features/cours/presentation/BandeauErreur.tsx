import type { ErreurEditeur } from '../domain/erreursEditeur.ts'
import { LIBELLES } from './libelles.ts'

interface Props {
  erreur: ErreurEditeur
  /** Identifiant de la requête (erreur de chargement), à transmettre à l'équipe pour un incident. */
  requestId?: string | null
  onRecharger(): void
}

/** Bandeau d'erreur de l'éditeur : message exact de la spec, et « Recharger » quand il dit « rechargez l'éditeur ». */
export function BandeauErreur({ erreur, requestId, onRecharger }: Props) {
  return (
    <div className="bandeau-erreur" role="alert">
      <p className="bandeau-erreur-message">
        {erreur.message}
        {requestId && <span className="bandeau-erreur-requete"> {LIBELLES.identifiantRequete} {requestId}</span>}
      </p>
      {erreur.action === 'RECHARGER' && (
        <button type="button" className="bouton-secondaire" onClick={onRecharger}>{LIBELLES.recharger}</button>
      )}
    </div>
  )
}
