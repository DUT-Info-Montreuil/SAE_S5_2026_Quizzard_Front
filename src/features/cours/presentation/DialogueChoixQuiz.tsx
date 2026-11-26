import { useEffect, useId, useRef, useState } from 'react'
import type { QuizResume } from '../domain/cours.ts'
import { LIBELLES } from './libelles.ts'

interface Props {
  quiz: readonly QuizResume[]
  /** Quiz présélectionné (`quizParDefaut` du domaine) ; `null` : « Nouveau quiz ». */
  idQuizPropose: number | null
  /** `idQuiz` null : « Nouveau quiz » (requête sans `idQuiz`). */
  onConfirmer(idQuiz: number | null): void
  onAnnuler(): void
}

/**
 * Choix du quiz de la nouvelle page (plan UC3, D11, proposition à valider U1) : `<dialog>` modal natif, ouvert au
 * montage et fermé au démontage. Le focus va au quiz présélectionné et reste piégé dans le dialogue (modal natif) ;
 * l'écran le rend au bouton d'origine. Échap = « Annuler ».
 */
export function DialogueChoixQuiz({ quiz, idQuizPropose, onConfirmer, onAnnuler }: Props) {
  const dialogue = useRef<HTMLDialogElement>(null)
  const [choix, setChoix] = useState(idQuizPropose)
  const idTitre = useId()

  useEffect(() => {
    const element = dialogue.current
    if (!element) return
    element.showModal()
    element.querySelector<HTMLInputElement>('input:checked')?.focus()
    return () => element.close()
  }, [])

  return (
    <dialog
      ref={dialogue}
      className="dialogue-quiz"
      aria-labelledby={idTitre}
      // Échap : l'état de l'éditeur ferme le dialogue (ANNULER_CHOIX), pas le navigateur.
      onCancel={(evenement) => {
        evenement.preventDefault()
        onAnnuler()
      }}
    >
      <form
        onSubmit={(evenement) => {
          evenement.preventDefault()
          onConfirmer(choix)
        }}
      >
        <h2 id={idTitre} className="dialogue-quiz-titre">{LIBELLES.choixQuizTitre}</h2>
        <fieldset className="dialogue-quiz-choix">
          <legend className="visuellement-cache">{LIBELLES.choixQuizLegende}</legend>
          {quiz.map((q) => (
            <label key={q.idQuiz} className="dialogue-quiz-option">
              <input
                type="radio"
                name="quiz"
                checked={choix === q.idQuiz}
                onChange={() => setChoix(q.idQuiz)}
              />
              {q.titre}
            </label>
          ))}
          <label className="dialogue-quiz-option">
            <input type="radio" name="quiz" checked={choix === null} onChange={() => setChoix(null)} />
            {LIBELLES.nouveauQuiz}
          </label>
        </fieldset>
        <div className="dialogue-quiz-actions">
          <button type="button" className="bouton-secondaire" onClick={onAnnuler}>{LIBELLES.annuler}</button>
          <button type="submit" className="bouton-action">{LIBELLES.inserer}</button>
        </div>
      </form>
    </dialog>
  )
}
