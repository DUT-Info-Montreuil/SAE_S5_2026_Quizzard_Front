import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Icone } from '../../../shared/ui/Icone.tsx'
import { LogoIut } from '../../../shared/ui/LogoIut.tsx'
import { useMesCours } from '../application/useMesCours.ts'
import type { CoursListe } from '../domain/cours.ts'
import { FormulaireImport } from './FormulaireImport.tsx'
import { TableauCours } from './TableauCours.tsx'
import './mesCours.css'

interface EcranMesCoursProps {
  /** Nom de l'enseignant et déconnexion, fournis par `app`. */
  compte?: ReactNode
  /** 401 : retour à l'écran de connexion. */
  onNonConnecte: () => void
}

/** E2 « Mes cours » : liste des cours et import d'un PDF (UC2). */
export function EcranMesCours({ compte, onNonConnecte }: EcranMesCoursProps) {
  const { etat, cours, recharger, ajouter } = useMesCours(onNonConnecte)
  // Change à chaque import ou abandon : remonte un formulaire vierge.
  const [cleImport, setCleImport] = useState(0)
  const [importe, setImporte] = useState<CoursListe | null>(null)
  const nbQuiz = cours.reduce((total, c) => total + c.nbQuiz, 0)

  return (
    <div className="mes-cours">
      <header className="mes-cours-entete">
        <div className="mes-cours-marque">
          <LogoIut />
          <span className="mes-cours-ecran">Mes cours</span>
        </div>
        <div className="boutons">
          <Link className="bouton bouton-secondaire" to="/classements">
            <Icone nom="trophee" /> Mes classements
          </Link>
          {compte}
        </div>
      </header>

      <main>
        <div className="mes-cours-titre">
          <h1>Mes cours</h1>
          {etat.phase !== 'CHARGEMENT' && (
            <p className="mes-cours-compte">
              {cours.length} cours · {nbQuiz} quiz
            </p>
          )}
        </div>

        <div role="status">
          {importe !== null && (
            <p className="succes">
              ✓ Cours « {importe.titre} » importé en version {importe.numeroVersion} ({importe.nbPages}{' '}
              {importe.nbPages > 1 ? 'pages' : 'page'}).
            </p>
          )}
        </div>

        <FormulaireImport
          key={cleImport}
          onNonConnecte={onNonConnecte}
          onAnnuler={() => setCleImport((n) => n + 1)}
          onImporte={(nouveau) => {
            ajouter(nouveau)
            setImporte(nouveau)
            setCleImport((n) => n + 1)
          }}
        />

        {etat.phase === 'CHARGEMENT' && <p role="status">Chargement de vos cours…</p>}
        {etat.phase === 'ECHEC' && (
          <div className="alerte" role="alert">
            <p>{etat.message}</p>
            {etat.requestId !== null && <p className="reference">Référence : {etat.requestId}</p>}
            <button type="button" className="bouton bouton-secondaire" onClick={recharger}>Réessayer</button>
          </div>
        )}
        {etat.phase === 'PRETE' && cours.length === 0 && (
          <p className="carte">Aucun cours pour l'instant. Importez un PDF pour créer le premier.</p>
        )}
        {cours.length > 0 && <TableauCours cours={cours} />}
      </main>
    </div>
  )
}
