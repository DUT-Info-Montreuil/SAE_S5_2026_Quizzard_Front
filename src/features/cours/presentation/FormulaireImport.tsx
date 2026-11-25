import { useId } from 'react'
import { useImporterCours } from '../application/useImporterCours.ts'
import type { OptionsImporterCours } from '../application/useImporterCours.ts'

interface FormulaireImportProps extends OptionsImporterCours {
  onAnnuler: () => void
}

/** E2, élément 3 « Importer un PDF » (UC2). */
export function FormulaireImport({ onAnnuler, ...options }: FormulaireImportProps) {
  const { titre, etat, choisirFichier, saisirTitre, importer, importerQuandMeme, refuserDoublon } =
    useImporterCours(options)
  const id = useId()
  const echec = etat.phase === 'ECHEC' ? etat.echec : null
  const erreurs = echec?.type === 'CHAMPS' ? echec.erreurs : {}
  const enCours = etat.phase === 'EN_COURS'
  const doublon = echec?.type === 'DOUBLON' ? echec : null
  const bloque = enCours || doublon !== null

  return (
    <form
      className="carte formulaire-import"
      aria-labelledby={`${id}-entete`}
      aria-busy={enCours}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (!bloque) void importer()
      }}
    >
      <h2 id={`${id}-entete`}>Importer un PDF</h2>

      <div className="champ">
        <label htmlFor={`${id}-fichier`}>Fichier PDF (50 Mo au plus)</label>
        <input
          id={`${id}-fichier`}
          type="file"
          accept=".pdf,application/pdf"
          required
          autoFocus
          disabled={bloque}
          aria-invalid={erreurs.fichier !== undefined}
          aria-describedby={`${id}-erreur-fichier`}
          onChange={(e) => choisirFichier(e.target.files?.[0] ?? null)}
        />
        <p id={`${id}-erreur-fichier`} className="champ-erreur" role="alert">{erreurs.fichier}</p>
      </div>

      <div className="champ">
        <label htmlFor={`${id}-titre`}>Titre du cours</label>
        <input
          id={`${id}-titre`}
          type="text"
          value={titre}
          required
          autoComplete="off"
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
            <button type="button" className="bouton bouton-discret" autoFocus onClick={refuserDoublon}>
              Ne pas importer
            </button>
          </div>
        </div>
      ) : (
        <div className="boutons">
          <button type="submit" className="bouton bouton-action" disabled={enCours}>
            {enCours ? 'Import en cours…' : 'Importer'}
          </button>
          <button type="button" className="bouton bouton-discret" disabled={enCours} onClick={onAnnuler}>
            Annuler
          </button>
        </div>
      )}
    </form>
  )
}
