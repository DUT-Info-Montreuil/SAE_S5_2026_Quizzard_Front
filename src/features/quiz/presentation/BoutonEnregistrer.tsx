import { useEffect } from 'react'
import './EditeurQuiz.css'
import { LIBELLES_QUIZ as L } from './libellesQuiz.ts'

interface BoutonEnregistrerProps {
  /** Modifications non enregistrées : le bouton est actif et le navigateur alerte avant de quitter la page. */
  modifie: boolean
  enCours: boolean
  onEnregistrer(): void
}

/** Élément 10 de E3 : « Enregistrer », avec alerte en cas de modifications non enregistrées (Charte Editeur). */
export function BoutonEnregistrer({ modifie, enCours, onEnregistrer }: BoutonEnregistrerProps) {
  useEffect(() => {
    if (!modifie) return
    // Alerte du navigateur à la fermeture ou au rechargement de l'onglet (texte imposé par le navigateur).
    const alerter = (evenement: BeforeUnloadEvent) => evenement.preventDefault()
    window.addEventListener('beforeunload', alerter)
    return () => window.removeEventListener('beforeunload', alerter)
  }, [modifie])

  return (
    <button
      type="button"
      className="bouton-secondaire bouton-enregistrer"
      data-modifie={modifie || undefined}
      aria-description={modifie ? L.nonEnregistre : undefined}
      title={modifie ? L.nonEnregistre : undefined}
      disabled={!modifie || enCours}
      onClick={onEnregistrer}
    >
      {enCours ? L.enregistrement : L.enregistrer}
    </button>
  )
}
