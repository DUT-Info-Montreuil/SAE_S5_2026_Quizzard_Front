import { useEffect, useId, useRef } from 'react'
import { LIBELLES } from './libelles.ts'

interface Props {
  /** Titre du quiz de la page, cité dans le message. */
  titreQuiz: string
  onConfirmer(): void
  onAnnuler(): void
}

/**
 * Confirmation avant de retirer une page de quiz (`DELETE /api/pages/{idPage}`) : `<dialog>` modal natif, ouvert au
 * montage et fermé au démontage. Le focus va à « Annuler » (action sans risque) ; Échap = « Annuler ».
 */
export function DialogueConfirmationRetrait({ titreQuiz, onConfirmer, onAnnuler }: Props) {
  const dialogue = useRef<HTMLDialogElement>(null)
  const annuler = useRef<HTMLButtonElement>(null)
  const idTitre = useId()
  const idTexte = useId()

  useEffect(() => {
    const element = dialogue.current
    if (!element) return
    element.showModal()
    annuler.current?.focus()
    return () => element.close()
  }, [])

  return (
    <dialog
      ref={dialogue}
      className="dialogue-quiz"
      aria-labelledby={idTitre}
      aria-describedby={idTexte}
      // Échap : l'état de l'éditeur ferme le dialogue (ANNULER_CHOIX), pas le navigateur.
      onCancel={(evenement) => {
        evenement.preventDefault()
        onAnnuler()
      }}
    >
      <h2 id={idTitre} className="dialogue-quiz-titre">{LIBELLES.retraitTitre}</h2>
      <p id={idTexte}>{LIBELLES.retraitTexte(titreQuiz)}</p>
      <div className="dialogue-quiz-actions">
        <button ref={annuler} type="button" className="bouton-secondaire" onClick={onAnnuler}>{LIBELLES.annuler}</button>
        <button type="button" className="bouton-action" onClick={onConfirmer}>{LIBELLES.retirer}</button>
      </div>
    </dialog>
  )
}
