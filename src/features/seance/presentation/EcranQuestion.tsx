import { LogoIut } from '../../../shared/ui/LogoIut.tsx'
import { reponseComplete } from '../domain/question.ts'
import type { Question, ReponseSaisie } from '../domain/question.ts'
import { Decompte } from './Decompte.tsx'
import { ZoneQcm } from './ZoneQcm.tsx'
import { ZoneRelier } from './ZoneRelier.tsx'
import { ZoneReponseLibre } from './ZoneReponseLibre.tsx'
import './ecranEtudiant.css'
import './EcranQuestion.css'

interface EcranQuestionProps {
  question: Question
  saisie: ReponseSaisie
  onChangerSaisie: (saisie: ReponseSaisie) => void
  /** Temps restant calculé par l'appelant sur l'heure du serveur (D9). */
  tempsRestantMs: number
  envoiEnCours: boolean
  /** Message d'erreur corrigeable (tableau des erreurs, écran E8), ou `null`. */
  erreur: string | null
  /** L'étudiant arrive alors que la question est déjà ouverte. */
  arriveeEnCours: boolean
  onValider: () => void
}

/** Écran E8 « Question » : présentation seule, toutes les données et actions arrivent par props. */
export function EcranQuestion({
  question,
  saisie,
  onChangerSaisie,
  tempsRestantMs,
  envoiEnCours,
  erreur,
  arriveeEnCours,
  onValider,
}: EcranQuestionProps) {
  const verrouille = envoiEnCours || tempsRestantMs <= 0
  const validerDesactive = verrouille || !reponseComplete(question, saisie)

  return (
    <main className="ecran-etudiant">
      <header className="ecran-question-entete">
        <LogoIut />
      </header>

      <Decompte position={question.position} tempsRestantMs={tempsRestantMs} dureeSec={question.dureeSec} />

      {arriveeEnCours && (
        // TODO(UC9): texte et durée d'affichage du bandeau absents de la spec (charte §9, E8-?). Texte repris de la
        // maquette E8 : à valider.
        <p className="bandeau-arrivee" role="status">
          Tu arrives en cours de route : les points comptent dès maintenant.
        </p>
      )}

      <h1 className="ecran-question-enonce">{question.enonce}</h1>

      {question.image && (
        <figure className="ecran-question-image">
          {/* TODO(UC9): texte alternatif absent du message de question (D15, question B12). Valeur provisoire. */}
          <img src={question.image} alt="Image de la question" />
        </figure>
      )}

      {question.type === 'QCM' && saisie.type === 'QCM' && (
        <ZoneQcm
          propositions={question.propositions}
          choixMultiple={question.choixMultiple === true}
          choix={saisie.propositions}
          onChanger={(propositions) => onChangerSaisie({ type: 'QCM', propositions })}
          desactive={verrouille}
        />
      )}
      {question.type === 'POINTS_A_RELIER' && saisie.type === 'POINTS_A_RELIER' && (
        <ZoneRelier
          key={question.idQuestion}
          elementsGauche={question.elementsGauche}
          elementsDroite={question.elementsDroite}
          liens={saisie.liens}
          onChanger={(liens) => onChangerSaisie({ type: 'POINTS_A_RELIER', liens })}
          desactive={verrouille}
        />
      )}
      {question.type === 'REPONSE_LIBRE' && saisie.type === 'REPONSE_LIBRE' && (
        <ZoneReponseLibre
          texte={saisie.texte}
          onChanger={(texte) => onChangerSaisie({ type: 'REPONSE_LIBRE', texte })}
          desactive={verrouille}
        />
      )}

      <div className="ecran-etudiant-pied">
        {erreur && <p className="message-erreur" role="alert">{erreur}</p>}
        <button
          type="button"
          className="bouton-principal"
          disabled={validerDesactive}
          aria-busy={envoiEnCours}
          onClick={onValider}
        >
          Valider ma réponse
        </button>
      </div>
    </main>
  )
}
