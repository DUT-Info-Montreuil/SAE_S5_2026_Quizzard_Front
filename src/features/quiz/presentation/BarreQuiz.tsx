import { Icone } from '../../../shared/ui/Icone.tsx'
import type { DerouleQuiz } from '../domain/questionEditee.ts'
import './EditeurQuiz.css'
import { LIBELLES_QUIZ as L } from './libellesQuiz.ts'
import { Segments } from './Segments.tsx'

interface BarreQuizProps {
  /** Pages du cours qui encadrent la page de quiz (positions affichées) ; `null` au début ou à la fin. */
  avant: number | null
  apres: number | null
  deroule: DerouleQuiz
  desactive?: boolean
  onChange(deroule: DerouleQuiz): void
}

function emplacement(avant: number | null, apres: number | null): string {
  if (avant !== null && apres !== null) return L.entrePages(avant, apres)
  if (apres !== null) return L.avantPage(apres)
  return avant !== null ? L.apresPage(avant) : ''
}

/** Au-dessus de l'aperçu d'une page de quiz : emplacement, mode (élément 14) et cours en séance (élément 17). */
export function BarreQuiz({ avant, apres, deroule, desactive = false, onChange }: BarreQuizProps) {
  return (
    <div className="barre-quiz">
      <span className="barre-quiz-pastille">
        <Icone nom="eclair" taille={14} />
        {L.pageQuiz}
      </span>
      <span className="barre-quiz-emplacement">{emplacement(avant, apres)}</span>
      <Segments
        className="barre-quiz-choix"
        legende={L.mode}
        legendeVisible
        desactive={desactive}
        valeur={deroule.note ? 'NOTE' : 'NON_NOTE'}
        options={[
          { valeur: 'NON_NOTE', libelle: L.nonNote },
          { valeur: 'NOTE', libelle: <><Icone nom="cadenas" taille={14} />{L.note}</> },
        ]}
        onChange={(v) => onChange({ ...deroule, note: v === 'NOTE' })}
      />
      {/* TODO(UC13): mode d'affichage du cours en séance « (à valider) » avec le client (docs/DESIGN.md, E3). */}
      <Segments
        className="barre-quiz-choix"
        legende={L.coursEnSeance}
        legendeVisible
        desactive={desactive}
        valeur={deroule.coursSurTelephones ? 'TELEPHONES' : 'ECRAN'}
        options={[
          { valeur: 'ECRAN', libelle: L.monEcran },
          { valeur: 'TELEPHONES', libelle: L.aussiTelephones },
        ]}
        onChange={(v) => onChange({ ...deroule, coursSurTelephones: v === 'TELEPHONES' })}
      />
    </div>
  )
}
