import { useId } from 'react'
import { Icone } from '../../../shared/ui/Icone.tsx'
import { useImporterCours } from '../application/useImporterCours.ts'
import type { OptionsImporterCours } from '../application/useImporterCours.ts'

interface FormulaireImportProps extends OptionsImporterCours {
  /** Abandon de l'import : le parent remonte un formulaire vierge. */
  onAnnuler: () => void
}

/** E2, élément 3 « Importer un PDF » (UC2) : zone toujours visible, le titre se saisit une fois le fichier choisi. */
export function FormulaireImport({ onAnnuler, ...options }: FormulaireImportProps) {
  const { fichier, titre, etat, choisirFichier, saisirTitre, importer, importerQuandMeme, refuserDoublon } =
    useImporterCours(options)
  const id = useId()
  const echec = etat.phase === 'ECHEC' ? etat.echec : null
  const erreurs = echec?.type === 'CHAMPS' ? echec.erreurs : {}
  const enCours = etat.phase === 'EN_COURS'
  const doublon = echec?.type === 'DOUBLON' ? echec : null
  const bloque = enCours || doublon !== null

  return (
    <form
      className="zone-import"
      aria-labelledby={`${id}-entete`}
      aria-busy={enCours}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (!bloque) void importer()
      }}
    >
      <div className="zone-import-entete">
        <span className="zone-import-icone" aria-hidden="true"><Icone nom="document" taille={22} /></span>
        <div className="zone-import-textes">
          <h2 id={`${id}-entete`}>Importer un PDF</h2>
          <p>Il devient un cours en ligne dans lequel vous insérez vos quiz. PDF uniquement. 50 Mo maximum.</p>
          {fichier !== null && <p className="zone-import-fichier">Fichier choisi : {fichier.name}</p>}
        </div>
        <label className={`bouton bouton-action choix-fichier${bloque ? ' choix-fichier-bloque' : ''}`}>
          <input
            className="visuellement-cache"
            type="file"
            accept=".pdf,application/pdf"
            required
            disabled={bloque}
            aria-label="Fichier PDF (50 Mo au plus)"
            aria-invalid={erreurs.fichier !== undefined}
            aria-describedby={`${id}-erreur-fichier`}
            onChange={(e) => choisirFichier(e.target.files?.[0] ?? null)}
          />
          <Icone nom="plus" /> {fichier === null ? 'Choisir un fichier' : 'Changer de fichier'}
        </label>
      </div>
      <p id={`${id}-erreur-fichier`} className="champ-erreur" role="alert">{erreurs.fichier}</p>

      {fichier !== null && (
        <div className="zone-import-details">
          <div className="champ">
            <label htmlFor={`${id}-titre`}>Titre du cours</label>
            <input
              id={`${id}-titre`}
              type="text"
              value={titre}
              required
              autoComplete="off"
              autoFocus
              disabled={bloque}
              aria-invalid={erreurs.titre !== undefined}
              aria-describedby={`${id}-erreur-titre`}
              onChange={(e) => saisirTitre(e.target.value)}
            />
            <p id={`${id}-erreur-titre`} className="champ-erreur" role="alert">{erreurs.titre}</p>
          </div>

          {echec?.type === 'MESSAGE' && (
            <div className="alerte" role="alert">
              <p>{echec.message}</p>
              {echec.requestId !== null && <p className="reference">Référence : {echec.requestId}</p>}
            </div>
          )}

          {doublon !== null ? (
            <div className="alerte" role="alertdialog" aria-labelledby={`${id}-doublon`}>
              <p id={`${id}-doublon`}>{doublon.message}</p>
              <div className="boutons">
                <button type="button" className="bouton bouton-action" onClick={() => void importerQuandMeme()}>
                  Importer quand même
                </button>
                <button type="button" className="bouton bouton-secondaire" autoFocus onClick={refuserDoublon}>
                  Ne pas importer
                </button>
              </div>
            </div>
          ) : (
            <div className="boutons">
              <button type="submit" className="bouton bouton-structure" disabled={enCours}>
                {enCours ? 'Import en cours…' : 'Importer'}
              </button>
              <button type="button" className="bouton bouton-secondaire" disabled={enCours} onClick={onAnnuler}>
                Annuler
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  )
}
