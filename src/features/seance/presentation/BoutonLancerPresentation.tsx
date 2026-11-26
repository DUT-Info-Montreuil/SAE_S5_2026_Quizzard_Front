import { useId, useState } from 'react'
import { Icone } from '../../../shared/ui/Icone.tsx'
import { useLancerQuiz } from '../application/useLancerQuiz.ts'
import type { OptionsLancerQuiz } from '../application/useLancerQuiz.ts'
import './ecranEnseignant.css'
import { LIBELLES_ANIMATION as L } from './libellesAnimation.ts'

/** Quiz du cours, tel que l'éditeur le connaît (l'assemblage se fait dans `app`). */
export interface QuizALancer {
  idQuiz: number
  titre: string
}

interface BoutonLancerPresentationProps extends Omit<OptionsLancerQuiz, 'idQuiz'> {
  /** Quiz du cours ; vide : bouton désactivé. */
  quiz: readonly QuizALancer[]
  /** Quiz proposé d'abord (celui de la page sélectionnée), sinon le premier. */
  idQuizPropose?: number | null
  /** Faux si une question du quiz est incomplète : bouton désactivé, avec l'alerte (E3). Le serveur fait foi. */
  quizPret?: boolean
}

/**
 * E3, élément 11 « Lancer la présentation » (UC7). Une erreur s'affiche sans quitter l'éditeur ; les deux 409
 * demandent une décision : reprendre ou terminer la séance ouverte, autoriser l'identité non vérifiée.
 */
export function BoutonLancerPresentation({
  quiz, idQuizPropose = null, quizPret = true, ...options
}: BoutonLancerPresentationProps) {
  const [choix, setChoix] = useState<number | null>(null)
  const idQuiz = [choix, idQuizPropose].find((id) => id !== null && quiz.some((q) => q.idQuiz === id))
    ?? quiz[0]?.idQuiz ?? null
  const { etat, lancer, autoriserEtLancer, reprendre, terminerEtLancer, annuler } =
    useLancerQuiz({ ...options, idQuiz: idQuiz ?? 0 })
  const idTitre = useId()
  const idListe = useId()
  const echec = etat.phase === 'ECHEC' ? etat.echec : null
  const enCours = etat.phase === 'EN_COURS'

  return (
    <div className="lancement">
      <div className="lancement-ligne">
        {/* Page de quiz sélectionnée : c'est son quiz qui est lancé ; sinon, choix parmi les quiz du cours. */}
        {quiz.length > 1 && idQuizPropose === null && (
          <>
            <label className="lancement-etiquette" htmlFor={idListe}>{L.quizALancer}</label>
            <select
              id={idListe}
              className="lancement-liste"
              value={idQuiz ?? ''}
              disabled={enCours}
              onChange={(e) => {
                setChoix(Number(e.target.value))
                annuler()
              }}
            >
              {quiz.map((q) => <option key={q.idQuiz} value={q.idQuiz}>{q.titre}</option>)}
            </select>
          </>
        )}
        <button
          type="button"
          className="bouton-lancer"
          aria-label={enCours ? undefined : L.lancer}
          disabled={idQuiz === null || !quizPret || enCours}
          onClick={lancer}
        >
          {enCours ? L.lancementEnCours : <><Icone nom="lecture" taille={14} />{L.lancerCourt}</>}
        </button>
      </div>

      {idQuiz === null && <p className="lancement-aide">{L.aucunQuiz}</p>}
      {idQuiz !== null && !quizPret && <p className="alerte-lancement">{L.quizIncomplet}</p>}

      {echec?.type === 'MESSAGE' && (
        <div className="alerte-lancement" role="alert">
          <p>{echec.message}</p>
          {echec.requestId !== null && <p className="alerte-reference">{L.reference} {echec.requestId}</p>}
        </div>
      )}

      {echec?.type === 'SESSION_DEJA_OUVERTE' && (
        <div className="alerte-lancement" role="alertdialog" aria-labelledby={idTitre}>
          <p id={idTitre}>{echec.message}</p>
          <div className="lancement-ligne">
            <button type="button" className="bouton-lancer-secondaire" autoFocus onClick={reprendre}>
              {L.reprendre}
            </button>
            <button type="button" className="bouton-lancer" onClick={terminerEtLancer}>{L.terminerEtLancer}</button>
            <button type="button" className="bouton-lancer-secondaire" onClick={annuler}>{L.annuler}</button>
          </div>
        </div>
      )}

      {echec?.type === 'ANNUAIRE_INDISPONIBLE' && (
        <div className="alerte-lancement" role="alertdialog" aria-labelledby={idTitre}>
          <p id={idTitre}>{echec.message}</p>
          <div className="lancement-ligne">
            <button type="button" className="bouton-lancer" onClick={autoriserEtLancer}>{L.autoriser}</button>
            <button type="button" className="bouton-lancer-secondaire" autoFocus onClick={annuler}>{L.annuler}</button>
          </div>
        </div>
      )}
    </div>
  )
}
