import './Decompte.css'

interface DecompteProps {
  /** Position de la question dans le quiz. */
  position: number
  /** Nombre de questions du quiz, s'il est connu (E5) : « Question 1 / 3 ». */
  nbQuestions?: number
  tempsRestantMs: number
  dureeSec: number
}

/** E8-1 et E5 : barre et nombre de secondes ; le nombre porte le sens, pas la couleur (charte §1). */
export function Decompte({ position, nbQuestions, tempsRestantMs, dureeSec }: DecompteProps) {
  const secondes = Math.max(0, Math.ceil(tempsRestantMs / 1000))
  const part = dureeSec > 0 ? Math.min(1, Math.max(0, tempsRestantMs / (dureeSec * 1000))) : 0
  const minutes = Math.floor(secondes / 60)
  const reste = String(secondes % 60).padStart(2, '0')

  return (
    <div className="decompte">
      <div className="decompte-barre" aria-hidden="true">
        <div className="decompte-remplissage" style={{ width: `${part * 100}%` }} />
      </div>
      <div className="decompte-ligne">
        {/* TODO(UC9): la maquette E8 affiche « Question 1/3 », mais le message de question ne donne pas le nombre de
            questions (plan UC9, §3). Côté étudiant : la position seule. E5 le connaît par l'état de la séance. */}
        <span className="decompte-position">
          Question {position}{nbQuestions === undefined ? '' : ` / ${nbQuestions}`}
        </span>
        <p className="decompte-chiffre" role="timer" aria-label={`${secondes} secondes restantes`}>
          {minutes}:{reste}
        </p>
      </div>
    </div>
  )
}
