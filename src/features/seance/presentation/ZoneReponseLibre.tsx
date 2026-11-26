import { useId } from 'react'
import { LONGUEUR_MAX_REPONSE_LIBRE } from '../domain/question.ts'

interface ZoneReponseLibreProps {
  texte: string
  onChanger: (texte: string) => void
  desactive: boolean
}

/** E8-3, réponse libre : zone de texte de 1000 caractères au plus, avec compteur. */
export function ZoneReponseLibre({ texte, onChanger, desactive }: ZoneReponseLibreProps) {
  const id = useId()

  return (
    <div className="zone-libre">
      {/* TODO(UC9): libellé absent de la spec : à valider. */}
      <label className="zone-libre-libelle" htmlFor={`${id}-texte`}>Ta réponse</label>
      <textarea
        id={`${id}-texte`}
        className="zone-libre-texte"
        rows={5}
        maxLength={LONGUEUR_MAX_REPONSE_LIBRE}
        value={texte}
        disabled={desactive}
        aria-describedby={`${id}-compteur`}
        onChange={(e) => onChanger(e.target.value)}
      />
      <p id={`${id}-compteur`} className="zone-libre-compteur">
        {texte.length}/{LONGUEUR_MAX_REPONSE_LIBRE}
      </p>
    </div>
  )
}
