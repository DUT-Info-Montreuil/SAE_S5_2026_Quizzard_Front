import type { ResultatQuestion } from '../domain/question.ts'
import { formaterNombre } from './formaterNombre.ts'

interface CarteScoreProps {
  resultat: Pick<ResultatQuestion, 'points' | 'scoreTotal' | 'bonneReponse'>
}

/** E9-2 : points de la question, score total et, si elle est fournie, la bonne réponse. */
// TODO(UC9): la maquette affiche aussi la justesse (« Bonne réponse ») et le temps de réponse (« Répondu en 6 s »),
// absents du message de résultat (plan UC9, question B10). Non affichés en attendant.
export function CarteScore({ resultat }: CarteScoreProps) {
  const { points, scoreTotal, bonneReponse } = resultat
  return (
    <section className="carte-score" aria-labelledby="carte-score-titre">
      {/* TODO(UC9): libellés absents de la spec (plan UC9, question U3). Valeurs provisoires, à valider. */}
      <h2 id="carte-score-titre" className="visuellement-cache">Points de la question</h2>
      <p className="carte-score-points">
        {points >= 0 ? '+' : ''}{formaterNombre(points)} pts
      </p>
      <p className="carte-score-total">Score total : {formaterNombre(scoreTotal)} pts</p>
      {bonneReponse && bonneReponse.length > 0 && (
        <div className="carte-score-bonne-reponse">
          <p className="carte-score-sous-titre">Bonne réponse :</p>
          <ul>
            {bonneReponse.map((libelle) => <li key={libelle}>{libelle}</li>)}
          </ul>
        </div>
      )}
    </section>
  )
}
