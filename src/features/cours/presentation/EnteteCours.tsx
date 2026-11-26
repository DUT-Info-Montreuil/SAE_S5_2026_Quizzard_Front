import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useCours } from '../application/useCours.ts'
import type { CoursOuvert } from '../domain/cours.ts'
import { resumeVersion, sigleCours } from '../domain/cours.ts'
import './enteteCours.css'

interface EnteteCoursProps {
  /** Texte de l'adresse (`/cours/:idCours`). */
  idCours: string | undefined
  /** 401 : retour à l'écran de connexion. */
  onNonConnecte: () => void
  /** Contenu de l'éditeur, affiché une fois le cours chargé. */
  children?: (cours: CoursOuvert) => ReactNode
}

/** E3, en-tête : titre et version du cours ouvert (lecture seule), `GET /api/cours/{idCours}`. */
export function EnteteCours({ idCours, onNonConnecte, children }: EnteteCoursProps) {
  const { etat, recharger } = useCours(idCours, onNonConnecte)

  return (
    <div className="entete-cours">
      <Link className="entete-cours-retour" to="/cours">← Mes cours</Link>
      {etat.phase === 'CHARGEMENT' && <p role="status">Chargement du cours…</p>}
      {etat.phase === 'INTROUVABLE' && (
        <p className="entete-cours-alerte" role="alert">Ce cours n'existe pas ou n'est plus disponible.</p>
      )}
      {etat.phase === 'ECHEC' && (
        <div className="entete-cours-alerte" role="alert">
          <p>{etat.message}</p>
          {etat.requestId !== null && <p>Référence : {etat.requestId}</p>}
          <button type="button" onClick={recharger}>Réessayer</button>
        </div>
      )}
      {etat.phase === 'PRET' && (
        <>
          <header className="entete-cours-titre">
            <span className={`entete-cours-pastille pastille-${etat.cours.idCours % 4}`} aria-hidden="true">
              {sigleCours(etat.cours.titre)}
            </span>
            <div>
              <h1>{etat.cours.titre}</h1>
              <p>{resumeVersion(etat.cours)}</p>
            </div>
          </header>
          {children?.(etat.cours)}
        </>
      )}
    </div>
  )
}
