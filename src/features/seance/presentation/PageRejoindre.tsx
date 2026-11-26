import { useRejoindreQuiz } from '../application/useRejoindreQuiz.ts'
import type { OptionsRejoindreQuiz } from '../application/useRejoindreQuiz.ts'
import { EcranRejoindre } from './EcranRejoindre.tsx'

/** Route de E7 « Rejoindre » : relie `useRejoindreQuiz` (chargement, envoi, jeton) et l'écran de présentation. */
export function PageRejoindre(options: OptionsRejoindreQuiz) {
  const { ecran, peutEntrer, changerSaisie, entrer, choisirSuggestion } = useRejoindreQuiz(options)
  return (
    <EcranRejoindre
      ecran={ecran}
      peutEntrer={peutEntrer}
      onSaisie={changerSaisie}
      onEntrer={entrer}
      onSuggestion={choisirSuggestion}
      onRecharger={() => location.reload()}
    />
  )
}
