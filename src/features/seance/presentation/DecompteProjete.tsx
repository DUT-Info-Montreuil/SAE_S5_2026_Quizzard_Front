import { useEffect, useState } from 'react'
import { tempsRestantMs } from '../../../shared/lib/heureServeur.ts'
import type { FinDeQuestion } from '../domain/seanceAnimee.ts'

/** Temps restant sur l'heure du serveur. Le rôle `timer` n'annonce pas chaque seconde aux lecteurs d'écran. */
export function DecompteProjete({ fin, dureeSec }: { fin: FinDeQuestion, dureeSec: number }) {
  const [maintenant, setMaintenant] = useState(() => Date.now())

  useEffect(() => {
    const minuteur = setInterval(() => setMaintenant(Date.now()), 200)
    return () => clearInterval(minuteur)
  }, [])

  const restantMs = tempsRestantMs(fin.echeanceMs, fin.ecartMs, maintenant)
  const secondes = Math.ceil(restantMs / 1000)
  const part = Math.min(1, restantMs / (dureeSec * 1000))

  return (
    <div className="decompte-projete">
      <div className="decompte-projete-barre" aria-hidden="true">
        <div className="decompte-projete-reste" style={{ width: `${part * 100}%` }} />
      </div>
      <p className="decompte-projete-chiffre" role="timer" aria-label={`${secondes} secondes restantes`}>
        {Math.floor(secondes / 60)}:{String(secondes % 60).padStart(2, '0')}
      </p>
    </div>
  )
}
