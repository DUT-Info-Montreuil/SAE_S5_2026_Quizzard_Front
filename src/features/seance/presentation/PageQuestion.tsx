import { useRepondreQuestion } from '../application/useRepondreQuestion.ts'
import type { OptionsRepondreQuestion } from '../application/useRepondreQuestion.ts'
import { connexionInterrompue } from '../domain/machineReponse.ts'
import { BandeauConnexion } from './BandeauConnexion.tsx'
import { EcranQuestion } from './EcranQuestion.tsx'
import { EcranResultat } from './EcranResultat.tsx'
import './ecranEtudiant.css'

// TODO(UC9): libellé absent de la spec (plan UC9, question U3). Valeur provisoire, à valider.
const LIBELLE_CHARGEMENT = 'Chargement…'

interface PageQuestionProps extends OptionsRepondreQuestion {
  /** Retour vers E7 « Rejoindre » (session expirée). */
  onRejoindre: () => void
}

/** Route de l'étudiant pendant une séance : E8 « Question » ou E9 « Résultat », selon l'état de `useRepondreQuestion`. */
export function PageQuestion({ onRejoindre, ...options }: PageQuestionProps) {
  const { etat, saisie, changerSaisie, tempsRestantMs, arriveeEnCours, valider } = useRepondreQuestion(options)
  const { ecran } = etat

  return (
    <>
      {connexionInterrompue(etat) && <BandeauConnexion />}
      {ecran.nom === 'CHARGEMENT' && (
        <main className="ecran-etudiant"><p role="status">{LIBELLE_CHARGEMENT}</p></main>
      )}
      {(ecran.nom === 'SAISIE' || ecran.nom === 'ENVOI') && saisie !== null && (
        <EcranQuestion
          question={ecran.question}
          saisie={saisie}
          onChangerSaisie={changerSaisie}
          tempsRestantMs={tempsRestantMs}
          envoiEnCours={ecran.nom === 'ENVOI'}
          erreur={ecran.nom === 'SAISIE' ? ecran.erreur?.message ?? null : null}
          arriveeEnCours={arriveeEnCours}
          onValider={valider}
        />
      )}
      {ecran.nom !== 'CHARGEMENT' && ecran.nom !== 'SAISIE' && ecran.nom !== 'ENVOI' && (
        <EcranResultat ecran={ecran} onRejoindre={onRejoindre} onRecharger={() => location.reload()} />
      )}
    </>
  )
}
