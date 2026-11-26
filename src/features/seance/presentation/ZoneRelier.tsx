import { useState } from 'react'
import { delier, relier } from '../domain/question.ts'
import type { ElementARelier, Lien } from '../domain/question.ts'

interface ZoneRelierProps {
  elementsGauche: ElementARelier[]
  elementsDroite: ElementARelier[]
  liens: Lien[]
  onChanger: (liens: Lien[]) => void
  desactive: boolean
}

/**
 * E8-3, points à relier (D8) : toucher un élément à gauche, puis un élément à droite. Toucher un élément déjà relié
 * défait son lien. Chaque paire porte le numéro de l'élément de gauche : la couleur ne porte pas seule le sens.
 */
export function ZoneRelier({ elementsGauche, elementsDroite, liens, onChanger, desactive }: ZoneRelierProps) {
  // État d'interface seul : l'élément de gauche touché, en attente de son élément de droite.
  const [gaucheChoisi, setGaucheChoisi] = useState<number | null>(null)
  const numero = (idGauche: number) => elementsGauche.findIndex((e) => e.id === idGauche) + 1
  const libelleDroite = (id: number) => elementsDroite.find((e) => e.id === id)?.libelle ?? ''

  function toucherGauche(id: number) {
    if (liens.some((l) => l.gauche === id)) {
      onChanger(delier(liens, 'gauche', id))
      setGaucheChoisi(null)
      return
    }
    setGaucheChoisi(gaucheChoisi === id ? null : id)
  }

  function toucherDroite(id: number) {
    if (liens.some((l) => l.droite === id)) {
      onChanger(delier(liens, 'droite', id))
      return
    }
    if (gaucheChoisi === null) return
    onChanger(relier(liens, gaucheChoisi, id))
    setGaucheChoisi(null)
  }

  return (
    <div className="zone-relier">
      {/* TODO(UC9): consigne absente de la spec : libellé à valider. */}
      <p className="zone-relier-consigne">Touche un élément à gauche, puis un élément à droite.</p>
      <div className="zone-relier-colonnes">
        <ul className="zone-relier-colonne" aria-label="Éléments de gauche">
          {elementsGauche.map((e, i) => {
            const lien = liens.find((l) => l.gauche === e.id)
            return (
              <li key={e.id}>
                <button
                  type="button"
                  className="carte-reponse carte-relier"
                  data-coche={lien !== undefined || gaucheChoisi === e.id}
                  aria-pressed={gaucheChoisi === e.id}
                  disabled={desactive}
                  onClick={() => toucherGauche(e.id)}
                  aria-label={
                    lien
                      ? `${i + 1}. ${e.libelle}, relié à ${libelleDroite(lien.droite)}. Toucher pour défaire le lien.`
                      : `${i + 1}. ${e.libelle}`
                  }
                >
                  <span className="carte-reponse-lettre lettre-1" aria-hidden="true">{i + 1}</span>
                  <span className="carte-reponse-libelle">{e.libelle}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <ul className="zone-relier-colonne" aria-label="Éléments de droite">
          {elementsDroite.map((e) => {
            const lien = liens.find((l) => l.droite === e.id)
            return (
              <li key={e.id}>
                <button
                  type="button"
                  className="carte-reponse carte-relier"
                  data-coche={lien !== undefined}
                  disabled={desactive || (lien === undefined && gaucheChoisi === null)}
                  onClick={() => toucherDroite(e.id)}
                  aria-label={
                    lien
                      ? `${e.libelle}, relié à ${numero(lien.gauche)}. Toucher pour défaire le lien.`
                      : e.libelle
                  }
                >
                  <span className="carte-reponse-libelle">{e.libelle}</span>
                  {lien && (
                    <span className="carte-reponse-lettre lettre-1" aria-hidden="true">{numero(lien.gauche)}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
