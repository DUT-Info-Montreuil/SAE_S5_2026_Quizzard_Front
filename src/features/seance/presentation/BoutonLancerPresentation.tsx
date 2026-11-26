import { useId } from 'react'
import { useLancerQuiz } from '../application/useLancerQuiz.ts'
import type { OptionsLancerQuiz } from '../application/useLancerQuiz.ts'
import './ecranEnseignant.css'

interface BoutonLancerPresentationProps extends OptionsLancerQuiz {
  /** Faux si une question du quiz est incomplète : bouton désactivé, avec l'alerte (E3). Le serveur fait foi. */
  quizPret?: boolean
}

/** E3, élément 11 « Lancer la présentation » (UC7). Une erreur s'affiche sans quitter l'éditeur. */
export function BoutonLancerPresentation({ quizPret = true, ...options }: BoutonLancerPresentationProps) {
  const { etat, lancer, autoriserEtLancer, reprendre, terminerEtLancer, annuler } = useLancerQuiz(options)
  const idTitre = useId()
  const echec = etat.phase === 'ECHEC' ? etat.echec : null

  return (
    <div>
      <button
        type="button"
        className="bouton bouton-action"
        disabled={!quizPret || etat.phase === 'EN_COURS'}
        onClick={lancer}
      >
        {etat.phase === 'EN_COURS' ? 'Lancement…' : 'Lancer la présentation'}
      </button>

      {!quizPret && <div className="alerte"><p>Une question est incomplète. Complétez-la avant de lancer.</p></div>}

      {echec?.type === 'MESSAGE' && (
        <div className="alerte" role="alert">
          <p>{echec.message}</p>
          {echec.requestId !== null && <p className="reference">Référence : {echec.requestId}</p>}
        </div>
      )}

      {echec?.type === 'SESSION_DEJA_OUVERTE' && (
        <div className="alerte" role="alertdialog" aria-labelledby={idTitre}>
          <p id={idTitre}>{echec.message}</p>
          <div className="boutons">
            <button type="button" className="bouton" autoFocus onClick={reprendre}>La reprendre</button>
            <button type="button" className="bouton bouton-action" onClick={terminerEtLancer}>
              La terminer et lancer ce quiz
            </button>
            <button type="button" className="bouton bouton-discret" onClick={annuler}>Annuler</button>
          </div>
        </div>
      )}

      {echec?.type === 'ANNUAIRE_INDISPONIBLE' && (
        <div className="alerte" role="alertdialog" aria-labelledby={idTitre}>
          <p id={idTitre}>{echec.message}</p>
          <div className="boutons">
            <button type="button" className="bouton bouton-action" onClick={autoriserEtLancer}>Autoriser</button>
            <button type="button" className="bouton bouton-discret" autoFocus onClick={annuler}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  )
}
