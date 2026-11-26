import { useState } from 'react'
import { LogoIut } from '../../../shared/ui/LogoIut.tsx'
import { useSeanceEnDirect } from '../application/useSeanceEnDirect.ts'
import type { OptionsSeanceEnDirect } from '../application/useSeanceEnDirect.ts'
import { estTerminee, etapeSuivante } from '../domain/seanceAnimee.ts'
import type { EtapeSuivante } from '../domain/seanceAnimee.ts'
import { DecompteProjete } from './DecompteProjete.tsx'
import './ecranEnseignant.css'
import { LIBELLES_ANIMATION as L } from './libellesAnimation.ts'
import { QuestionProjetee } from './QuestionProjetee.tsx'
import { ZoneAcces } from './ZoneAcces.tsx'

interface EcranQuizEnCoursProps extends OptionsSeanceEnDirect {
  onQuitter: () => void
}

const LIBELLE_SUIVANT: Record<EtapeSuivante, string> = {
  DEMARRER: L.demarrer,
  SUIVANT: L.suivant,
  TERMINER: L.terminer,
}

/**
 * E5 « Quiz en cours », projeté en salle (UC7). Avant la première question : QR code et lien en grand. Pendant une
 * question : décompte, énoncé, histogramme en direct, et l'accès en colonne (on peut rejoindre à tout moment).
 * Aucune identité d'étudiant (CLAUDE.md, règle 6) : seulement des nombres.
 */
export function EcranQuizEnCours({ onQuitter, ...options }: EcranQuizEnCoursProps) {
  const { direct, refus, erreur, connexionPerdue, commandeEnCours, questionSuivante, cloreQuestion, terminer } =
    useSeanceEnDirect(options)
  const [confirmeFin, setConfirmeFin] = useState(false)

  const bandeau = connexionPerdue && <p className="bandeau-projete" role="alert">{L.connexionPerdue}</p>

  if (refus !== null) {
    return (
      <main className="ecran-projete ecran-projete-message">
        <div className="alerte-projetee" role="alert"><p>{refus.message}</p></div>
        <button type="button" className="bouton-projete" onClick={onQuitter}>{L.retourEditeur}</button>
      </main>
    )
  }
  if (direct === null) {
    return (
      <main className="ecran-projete ecran-projete-message">
        {bandeau}
        <p role="status">{L.chargement}</p>
      </main>
    )
  }

  const { seance, fin } = direct

  if (estTerminee(seance)) {
    return (
      <main className="ecran-projete ecran-projete-message">
        <h1 className="ecran-projete-titre">{seance.titre}</h1>
        <p role="status">{L.seanceTerminee}</p>
        <button type="button" className="bouton-projete" onClick={onQuitter}>{L.retourEditeur}</button>
      </main>
    )
  }

  const attente = seance.question === null

  return (
    <main className="ecran-projete" data-attente={attente}>
      {bandeau}
      <header className="ecran-projete-entete">
        <LogoIut />
        <h1 className="ecran-projete-titre">{seance.titre}</h1>
        <p className="ecran-projete-connectes" role="status">
          {L.connectes} : <strong>{seance.connectes}</strong>
        </p>
      </header>

      <div className="ecran-projete-corps">
        {seance.question !== null && (
          <div className="ecran-projete-question">
            {fin !== null ? (
              <DecompteProjete
                fin={fin}
                position={seance.question.position}
                nbQuestions={seance.nbQuestions}
                dureeSec={seance.question.dureeSec}
              />
            ) : (
              <p className="decompte-position">Question {seance.question.position} / {seance.nbQuestions}</p>
            )}
            <QuestionProjetee seance={seance} />
          </div>
        )}
        {seance.lienAcces !== null && (
          <div className="ecran-projete-acces">
            <ZoneAcces lienAcces={seance.lienAcces} qrCode={seance.qrCode} modeNote={seance.modeNote} />
            {attente && <p className="ecran-projete-attente">{L.enAttente}</p>}
          </div>
        )}
      </div>

      {erreur !== null && (
        <div className="alerte-projetee" role="alert">
          <p>{erreur.message}</p>
          {erreur.requestId !== null && <p className="alerte-reference">{L.reference} {erreur.requestId}</p>}
        </div>
      )}

      {confirmeFin ? (
        <div className="alerte-projetee" role="alertdialog" aria-labelledby="titre-fin-seance">
          <p id="titre-fin-seance">{L.confirmerFin}</p>
          <div className="boutons-projetes">
            <button
              type="button"
              className="bouton-projete bouton-projete-action"
              disabled={commandeEnCours}
              onClick={() => {
                setConfirmeFin(false)
                void terminer()
              }}
            >
              {L.confirmerFinBouton}
            </button>
            <button type="button" className="bouton-projete bouton-projete-discret" autoFocus onClick={() => setConfirmeFin(false)}>
              {L.annuler}
            </button>
          </div>
        </div>
      ) : (
        <footer className="boutons-projetes">
          <button
            type="button"
            className="bouton-projete"
            disabled={commandeEnCours || !seance.questionOuverte}
            onClick={cloreQuestion}
          >
            {L.clore}
          </button>
          <button
            type="button"
            className="bouton-projete bouton-projete-action"
            disabled={commandeEnCours || seance.questionOuverte}
            onClick={questionSuivante}
          >
            {LIBELLE_SUIVANT[etapeSuivante(seance)]}
          </button>
          <button
            type="button"
            className="bouton-projete bouton-projete-discret bouton-projete-fin"
            disabled={commandeEnCours}
            onClick={() => setConfirmeFin(true)}
          >
            {L.cloreQuiz}
          </button>
        </footer>
      )}
    </main>
  )
}
