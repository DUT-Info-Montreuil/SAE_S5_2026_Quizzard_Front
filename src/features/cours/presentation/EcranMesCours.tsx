import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { LogoIut } from '../../../shared/ui/LogoIut.tsx'
import { useMesCours } from '../application/useMesCours.ts'
import type { Cours } from '../domain/cours.ts'
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
  const [importOuvert, setImportOuvert] = useState(false)
  const [importe, setImporte] = useState<Cours | null>(null)

  return (
    <div className="mes-cours">
      <header className="mes-cours-entete">
        <LogoIut />
        {compte}
      </header>
      <main>
        <div className="mes-cours-titre">
          <h1>Mes cours</h1>
          <div className="boutons">
            <Link className="lien" to="/classements">Mes classements</Link>
            {!importOuvert && (
              <button
                type="button"
                className="bouton bouton-action"
                onClick={() => {
                  setImporte(null)
                  setImportOuvert(true)
                }}
              >
                Importer un PDF
              </button>
            )}
          </div>
        </div>

        <div role="status">
          {importe !== null && (
            <p className="succes">
              ✓ Cours « {importe.titre} » importé en version {importe.numeroVersion} ({importe.nbPages}{' '}
              {importe.nbPages > 1 ? 'pages' : 'page'}).
            </p>
          )}
        </div>

        {importOuvert && (
          <FormulaireImport
            onNonConnecte={onNonConnecte}
            onAnnuler={() => setImportOuvert(false)}
            onImporte={(nouveau) => {
              ajouter(nouveau)
              setImporte(nouveau)
              setImportOuvert(false)
            }}
          />
        )}

        {etat.phase === 'CHARGEMENT' && <p role="status">Chargement de vos cours…</p>}
        {etat.phase === 'ECHEC' && (
          <div className="alerte" role="alert">
            <p>{etat.message}</p>
            {etat.requestId !== null && <p className="reference">Référence : {etat.requestId}</p>}
            <button type="button" className="bouton" onClick={recharger}>Réessayer</button>
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
