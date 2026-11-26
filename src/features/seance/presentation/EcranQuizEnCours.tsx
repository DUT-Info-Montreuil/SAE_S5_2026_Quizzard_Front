import { useState } from 'react'
import { useSeanceEnDirect } from '../application/useSeanceEnDirect.ts'
import type { OptionsSeanceEnDirect } from '../application/useSeanceEnDirect.ts'
import { estTerminee, libelleSuivant } from '../domain/seanceAnimee.ts'
import { DecompteProjete } from './DecompteProjete.tsx'
import { QuestionProjetee } from './QuestionProjetee.tsx'
import { ZoneAcces } from './ZoneAcces.tsx'
import './ecranEnseignant.css'

interface EcranQuizEnCoursProps extends OptionsSeanceEnDirect {
  onQuitter: () => void
}

/** E5 « Quiz en cours », projeté en salle (UC7). Aucune identité d'étudiant : seulement des nombres. */
export function EcranQuizEnCours({ onQuitter, ...options }: EcranQuizEnCoursProps) {
  const { direct, refus, erreur, connexionPerdue, commandeEnCours, questionSuivante, cloreQuestion, terminer } =
    useSeanceEnDirect(options)
  const [confirmeFin, setConfirmeFin] = useState(false)

  const bandeau = connexionPerdue && (
    <p className="bandeau-projete" role="alert">Connexion perdue, reconnexion en cours…</p>
  )

  if (refus !== null) {
    return (
      <main className="ecran-projete">
        <div className="alerte" role="alert"><p>{refus.message}</p></div>
        <button type="button" className="bouton" onClick={onQuitter}>Retour à l'éditeur</button>
      </main>
    )
  }
  if (direct === null) {
    return <main className="ecran-projete">{bandeau}<p role="status">Chargement de la séance…</p></main>
  }

  const { seance, fin, ecran } = direct

  if (estTerminee(seance)) {
    return (
      <main className="ecran-projete">
        <h1>{seance.titre}</h1>
        <p role="status">La séance est terminée. Le lien et le QR code ne sont plus valides.</p>
        <button type="button" className="bouton" onClick={onQuitter}>Retour à l'éditeur</button>
      </main>
    )
  }

  return (
    <main className="ecran-projete" data-attente={seance.question === null}>
      {bandeau}
      <header className="projete-entete">
        <h1>{seance.titre}</h1>
        <p>Connectés : <strong>{seance.connectes}</strong></p>
      </header>

      <div className="projete-corps">
        {seance.question !== null && (
          <div>
            {fin !== null && <DecompteProjete fin={fin} dureeSec={seance.question.dureeSec} />}
            <QuestionProjetee seance={seance} ecran={ecran} />
          </div>
        )}
        {seance.lienAcces !== null && (
          <ZoneAcces lienAcces={seance.lienAcces} qrCode={seance.qrCode} modeNote={seance.modeNote} />
        )}
      </div>

      {erreur !== null && (
        <div className="alerte" role="alert">
          <p>{erreur.message}</p>
          {erreur.requestId !== null && <p className="reference">Référence : {erreur.requestId}</p>}
        </div>
      )}

      {confirmeFin ? (
        <div className="alerte" role="alertdialog" aria-labelledby="titre-fin">
          <p id="titre-fin">Terminer la séance ? Le lien et le QR code ne seront plus valides.</p>
          <div className="boutons">
            <button
              type="button"
              className="bouton bouton-action"
              disabled={commandeEnCours}
              onClick={() => {
                setConfirmeFin(false)
                void terminer()
              }}
            >
              Terminer la séance
            </button>
            <button type="button" className="bouton bouton-discret" autoFocus onClick={() => setConfirmeFin(false)}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <footer className="boutons">
          <button
            type="button"
            className="bouton bouton-action"
            disabled={commandeEnCours || seance.questionOuverte}
            onClick={questionSuivante}
          >
            {libelleSuivant(seance)}
          </button>
          <button
            type="button"
            className="bouton"
            disabled={commandeEnCours || !seance.questionOuverte}
            onClick={cloreQuestion}
          >
            Clore
          </button>
          <button
            type="button"
            className="bouton bouton-discret"
            disabled={commandeEnCours}
            onClick={() => setConfirmeFin(true)}
          >
            Clore le quiz
          </button>
        </footer>
      )}
    </main>
  )
}
