import { LogoIut } from '../../../shared/ui/LogoIut.tsx'
import type { Ecran } from '../domain/machineReponse.ts'
import { CarteRang } from './CarteRang.tsx'
import { CarteScore } from './CarteScore.tsx'
import './ecranEtudiant.css'
import './EcranResultat.css'

/** États de la machine (plan UC9, §5) affichés sur E9. */
export type EcranE9 = Extract<
  Ecran,
  { nom: 'ATTENTE' | 'CONFIRMEE' | 'TEMPS_ECOULE' | 'REFUSEE' | 'SESSION_EXPIREE' | 'RESULTAT' | 'SEANCE_CLOSE' }
>

// TODO(UC9): libellés absents de la spec (plan UC9, question U3). Valeurs provisoires, à valider. Seul
// « Réponse enregistrée » vient de l'UC9 (diagramme d'activité, étape 17).
const LIBELLES_E9 = {
  reponseEnregistree: 'Réponse enregistrée',
  tempsEcoule: 'Temps écoulé : tu n\'as pas répondu.',
  attente: 'Prochaine question bientôt…',
  seanceClose: 'La séance est terminée. Merci d\'avoir participé !',
  // Erreur sans message de l'UC9 ni message `error` du back (409 sans `code`, D3).
  erreurInconnue: 'Une erreur est survenue.',
  rejoindre: 'Rejoindre',
  recharger: 'Recharger',
} as const

interface EcranResultatProps {
  ecran: EcranE9
  /** Retour vers E7 « Rejoindre » (session expirée). */
  onRejoindre: () => void
  /** Rechargement de la page (requête invalide). */
  onRecharger: () => void
}

/** Écran E9 « Résultat et classement » : présentation seule, toutes les données et actions arrivent par props. */
export function EcranResultat({ ecran, onRejoindre, onRecharger }: EcranResultatProps) {
  const erreur = ecran.nom === 'REFUSEE' || ecran.nom === 'SESSION_EXPIREE' ? ecran.erreur : null
  // Message d'attente (E9-4) tant que la séance peut encore envoyer une question.
  const attendQuestion = ecran.nom !== 'SESSION_EXPIREE' && ecran.nom !== 'SEANCE_CLOSE'

  return (
    <main className="ecran-etudiant ecran-resultat">
      <header>
        <LogoIut />
      </header>

      {ecran.nom === 'CONFIRMEE' && (
        <p className="message-e9 message-e9-succes" role="status">
          <span aria-hidden="true">✓ </span>{LIBELLES_E9.reponseEnregistree}
        </p>
      )}
      {ecran.nom === 'TEMPS_ECOULE' && (
        <p className="message-e9" role="status">
          <span aria-hidden="true">⏱ </span>{LIBELLES_E9.tempsEcoule}
        </p>
      )}
      {ecran.nom === 'SEANCE_CLOSE' && <p className="message-e9" role="status">{LIBELLES_E9.seanceClose}</p>}
      {erreur && <p className="message-erreur" role="alert">{erreur.message ?? LIBELLES_E9.erreurInconnue}</p>}

      {ecran.nom === 'RESULTAT' && (
        <>
          <CarteScore resultat={ecran.resultat} />
          <CarteRang resultat={ecran.resultat} />
        </>
      )}

      {attendQuestion && <p className="ecran-resultat-attente" role="status">{LIBELLES_E9.attente}</p>}

      {erreur?.action && (
        <div className="ecran-etudiant-pied">
          <button
            type="button"
            className="bouton-principal"
            onClick={erreur.action === 'REJOINDRE' ? onRejoindre : onRecharger}
          >
            {erreur.action === 'REJOINDRE' ? LIBELLES_E9.rejoindre : LIBELLES_E9.recharger}
          </button>
        </div>
      )}
    </main>
  )
}
