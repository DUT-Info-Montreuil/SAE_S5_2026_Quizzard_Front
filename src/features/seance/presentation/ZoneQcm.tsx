import { useId } from 'react'
import { basculerProposition } from '../domain/question.ts'
import type { Proposition } from '../domain/question.ts'

interface ZoneQcmProps {
  propositions: Proposition[]
  choixMultiple: boolean
  choix: number[]
  onChanger: (choix: number[]) => void
  desactive: boolean
}

/** E8-3, QCM : boutons radio en choix unique, cases à cocher en choix multiple (D13). Lettre et couleur. */
export function ZoneQcm({ propositions, choixMultiple, choix, onChanger, desactive }: ZoneQcmProps) {
  const nom = useId()

  return (
    <fieldset className="zone-qcm" disabled={desactive}>
      {/* TODO(UC9): libellé lu par le lecteur d'écran, absent de la spec : à valider. */}
      <legend className="visuellement-cache">
        {choixMultiple ? 'Choisis une ou plusieurs réponses' : 'Choisis une réponse'}
      </legend>
      {propositions.map((p, i) => {
        const coche = choix.includes(p.idProposition)
        const lettre = String.fromCharCode(65 + i)
        return (
          <label key={p.idProposition} className="carte-reponse" data-coche={coche}>
            <input
              className="visuellement-cache"
              type={choixMultiple ? 'checkbox' : 'radio'}
              name={nom}
              checked={coche}
              onChange={() => onChanger(basculerProposition(choix, p.idProposition, choixMultiple))}
            />
            <span className={`carte-reponse-lettre lettre-${i % 4}`} aria-hidden="true">{lettre}</span>
            <span className="visuellement-cache">Réponse {lettre} : </span>
            <span className="carte-reponse-libelle">{p.libelle}</span>
            <span className={choixMultiple ? 'indicateur indicateur-case' : 'indicateur'} aria-hidden="true">
              {coche ? '✓' : ''}
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
