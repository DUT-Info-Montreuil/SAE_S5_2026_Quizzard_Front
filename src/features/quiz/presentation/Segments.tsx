import { useId } from 'react'
import type { ReactNode } from 'react'

export interface OptionSegment<T extends string> {
  valeur: T
  libelle: ReactNode
}

interface SegmentsProps<T extends string> {
  /** Nom du groupe, lu par les lecteurs d'écran (et affiché si `legendeVisible`). */
  legende: string
  legendeVisible?: boolean
  options: readonly OptionSegment<T>[]
  valeur: T
  desactive?: boolean
  onChange(valeur: T): void
  className?: string
}

/**
 * Choix unique en segments (maquette E3 : « QCM / Relier / Libre », « Non noté / Noté », « Manuel / Auto »).
 * Boutons radio natifs habillés : clavier (flèches) et lecteurs d'écran sans code en plus.
 */
export function Segments<T extends string>({
  legende, legendeVisible = false, options, valeur, desactive = false, onChange, className = '',
}: SegmentsProps<T>) {
  const nom = useId()
  return (
    <fieldset className={`segments ${className}`} disabled={desactive}>
      <legend className={legendeVisible ? 'segments-legende' : 'visuellement-cache'}>{legende}</legend>
      <div className="segments-options">
        {options.map((option) => (
          <label key={option.valeur} className="segment">
            <input
              type="radio"
              className="visuellement-cache"
              name={nom}
              value={option.valeur}
              checked={option.valeur === valeur}
              onChange={() => onChange(option.valeur)}
            />
            <span className="segment-libelle">{option.libelle}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
