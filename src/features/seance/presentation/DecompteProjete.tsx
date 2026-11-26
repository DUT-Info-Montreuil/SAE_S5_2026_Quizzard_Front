import { useEffect, useState } from 'react'
import { tempsRestantMs } from '../../../shared/lib/heureServeur.ts'
import type { FinDeQuestion } from '../domain/seanceAnimee.ts'
import { Decompte } from './Decompte.tsx'

interface DecompteProjeteProps {
  fin: FinDeQuestion
  position: number
  nbQuestions: number
  dureeSec: number
}

/**
 * E5 : le décompte de l'UC9 (`Decompte`), rafraîchi toutes les 200 ms sur l'heure du serveur (CLAUDE.md, règle 5).
 * À 0, le serveur clôt seul la question ; l'écran attend le message de clôture.
 */
export function DecompteProjete({ fin, position, nbQuestions, dureeSec }: DecompteProjeteProps) {
  const [maintenant, setMaintenant] = useState(() => Date.now())

  useEffect(() => {
    const minuteur = setInterval(() => setMaintenant(Date.now()), 200)
    return () => clearInterval(minuteur)
  }, [])

  return (
    <Decompte
      position={position}
      nbQuestions={nbQuestions}
      tempsRestantMs={tempsRestantMs(fin.echeanceMs, fin.ecartMs, maintenant)}
      dureeSec={dureeSec}
    />
  )
}
