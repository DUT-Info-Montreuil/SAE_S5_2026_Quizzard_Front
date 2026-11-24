import type { KeyboardEvent } from 'react'
import { LogoIut } from '../../../shared/ui/LogoIut.tsx'
import type { EcranRejoindre as EtatEcranRejoindre, SessionPublique } from '../domain/ecranRejoindre.ts'
import { LONGUEUR_MAX_PSEUDONYME, longueurPseudonyme, nettoyerPseudonyme } from '../domain/pseudonyme.ts'
import { MENTION_INFORMATION } from './mentionInformation.ts'
import './ecranEtudiant.css'
import './EcranRejoindre.css'

// Libellés de E7. « Entrer dans le quiz » (E7-3) et « Pseudonyme » (E7-2) viennent de l'UC8 ; « Chargement… » et
// « Recharger » sont ceux de l'UC9.
// TODO(UC8): titre absent de la spec (plan UC8, D4 et question U4). Valeur provisoire : titre de la maquette.
const LIBELLES_E7 = {
  titre: 'Choisis ton pseudo pour rejoindre',
  pseudonyme: 'Pseudonyme',
  entrer: 'Entrer dans le quiz',
  chargement: 'Chargement…',
  recharger: 'Recharger',
} as const

const ID_CHAMP = 'e7-pseudonyme'
const ID_COMPTEUR = 'e7-pseudonyme-compteur'
const ID_ERREUR = 'e7-pseudonyme-erreur'

interface EcranRejoindreProps {
  ecran: EtatEcranRejoindre
  /** « Entrer dans le quiz » actif (pseudonyme nettoyé valide, aucun envoi en cours). */
  peutEntrer: boolean
  onSaisie: (texte: string) => void
  onEntrer: () => void
  /** Remplit le champ avec le pseudonyme proposé. */
  onSuggestion: () => void
  /** Rechargement de la page (échec du chargement). */
  onRecharger: () => void
}

/** E7-1 : nom du cours et du quiz. */
function TitresQuiz({ session }: { session: SessionPublique }) {
  return <p className="ecran-rejoindre-quiz">{session.titreCours} • {session.titreQuiz}</p>
}

/** Écran E7 « Rejoindre » : présentation seule, toutes les données et actions arrivent par props. */
export function EcranRejoindre({ ecran, peutEntrer, onSaisie, onEntrer, onSuggestion, onRecharger }: EcranRejoindreProps) {
  return (
    <main className="ecran-etudiant ecran-rejoindre">
      <header>
        <LogoIut />
      </header>

      {ecran.nom === 'CHARGEMENT' && <p role="status">{LIBELLES_E7.chargement}</p>}

      {(ecran.nom === 'INTROUVABLE' || ecran.nom === 'TERMINE') && (
        <p className="message-erreur" role="alert">{ecran.message}</p>
      )}

      {ecran.nom === 'ECHEC_CHARGEMENT' && (
        <>
          <p className="message-erreur" role="alert">{ecran.message}</p>
          <div className="ecran-etudiant-pied">
            <button type="button" className="bouton-principal" onClick={onRecharger}>{LIBELLES_E7.recharger}</button>
          </div>
        </>
      )}

      {/* E7-4 (connexion avec le compte IUT, UC15) hors périmètre : message seul, sans formulaire (D10). */}
      {ecran.nom === 'QUIZ_NOTE' && (
        <>
          <TitresQuiz session={ecran.session} />
          <p className="message-erreur" role="alert">{ecran.message}</p>
        </>
      )}

      {ecran.nom === 'FORMULAIRE' && (
        <Formulaire
          ecran={ecran}
          peutEntrer={peutEntrer}
          onSaisie={onSaisie}
          onEntrer={onEntrer}
          onSuggestion={onSuggestion}
        />
      )}
    </main>
  )
}

type PropsFormulaire = Omit<EcranRejoindreProps, 'ecran' | 'onRecharger'> & {
  ecran: Extract<EtatEcranRejoindre, { nom: 'FORMULAIRE' }>
}

function Formulaire({ ecran, peutEntrer, onSaisie, onEntrer, onSuggestion }: PropsFormulaire) {
  const { session, saisie, erreur, suggestion, envoi } = ecran
  const longueur = longueurPseudonyme(nettoyerPseudonyme(saisie))

  // Entrée avec le bouton désactivé : pas de soumission implicite du navigateur ; ENTRER affiche alors le message du
  // pseudonyme invalide (le reducer ignore ENTRER pendant l'envoi).
  const surTouche = (evenement: KeyboardEvent<HTMLInputElement>) => {
    if (evenement.key === 'Enter' && !peutEntrer) {
      evenement.preventDefault()
      onEntrer()
    }
  }

  return (
    <>
      <TitresQuiz session={session} />
      <h1 className="ecran-rejoindre-titre">{LIBELLES_E7.titre}</h1>

      <form
        className="ecran-rejoindre-formulaire"
        noValidate
        onSubmit={(evenement) => {
          evenement.preventDefault()
          onEntrer()
        }}
      >
        {/* E7-2 : libellé lu par les lecteurs d'écran, caché à l'écran comme sur la maquette (D4). */}
        <label htmlFor={ID_CHAMP} className="visuellement-cache">{LIBELLES_E7.pseudonyme}</label>
        <input
          id={ID_CHAMP}
          name="pseudonyme"
          className="ecran-rejoindre-champ"
          type="text"
          value={saisie}
          onChange={(evenement) => onSaisie(evenement.target.value)}
          onKeyDown={surTouche}
          readOnly={envoi}
          autoComplete="nickname"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-invalid={erreur !== null}
          aria-describedby={erreur === null ? ID_COMPTEUR : `${ID_ERREUR} ${ID_COMPTEUR}`}
        />
        <p id={ID_COMPTEUR} className="ecran-rejoindre-compteur">
          {longueur}/{LONGUEUR_MAX_PSEUDONYME}
        </p>
        {erreur !== null && <p id={ID_ERREUR} className="message-erreur" role="alert">{erreur}</p>}

        {/* Pseudonyme proposé (409, D5) : rendu comme texte ; un clic remplit le champ. */}
        {suggestion !== null && (
          <button type="button" className="ecran-rejoindre-suggestion" onClick={onSuggestion}>{suggestion}</button>
        )}

        {/* E7-3 : seule action principale de l'écran. */}
        <button type="submit" className="bouton-principal bouton-principal-action" disabled={!peutEntrer}>
          {LIBELLES_E7.entrer}
        </button>
      </form>

      {/* E7-5 */}
      <p className="ecran-rejoindre-mention">{MENTION_INFORMATION}</p>
    </>
  )
}
