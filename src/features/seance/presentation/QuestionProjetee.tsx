import { barres } from '../domain/seanceAnimee.ts'
import type { EtatSeance, TypeEcran } from '../domain/seanceAnimee.ts'

interface QuestionProjeteeProps {
  seance: EtatSeance
  ecran: TypeEcran | null
}

/**
 * E5 : énoncé, propositions et histogramme des réponses reçues ; une fois la question close, la bonne réponse.
 * Écran intermédiaire BONNE_REPONSE : sans le nombre de réponses.
 * TODO(UC11): écran CLASSEMENT : le classement projeté est E6 ; en attendant, la correction reste affichée.
 */
export function QuestionProjetee({ seance, ecran }: QuestionProjeteeProps) {
  const { question, repartition, correction } = seance
  if (question === null) return null
  const avecNombres = correction === null || ecran !== 'BONNE_REPONSE'

  return (
    <section className="question-projetee" aria-label="Question en cours">
      <p className="question-projetee-position">Question {question.position} / {seance.nbQuestions}</p>
      <h2 className="question-projetee-enonce">{question.enonce}</h2>

      {question.type === 'QCM' && (
        <ol className="histogramme">
          {barres(question.propositions, repartition, correction).map((b, i) => (
            <li key={b.idProposition} className={b.bonne ? 'histogramme-ligne histogramme-bonne' : 'histogramme-ligne'}>
              <span className={`histogramme-lettre couleur-reponse-${i % 4}`}>{b.lettre}</span>
              <span className="histogramme-corps">
                <span className="histogramme-libelle">{b.libelle}</span>
                {b.bonne && <span className="histogramme-marque">✓ Bonne réponse</span>}
                <span className="histogramme-piste" aria-hidden="true">
                  <span
                    className={`histogramme-barre couleur-reponse-${i % 4}`}
                    style={{ width: avecNombres ? `${b.part * 100}%` : 0 }}
                  />
                </span>
              </span>
              {avecNombres && (
                <span className="histogramme-nombre" role="img" aria-label={`Réponses ${b.lettre} : ${b.nombre}`}>
                  {b.nombre}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {question.type === 'POINTS_A_RELIER' && correction === null && (
        <div className="relier-projete">
          <ul>{question.elementsGauche.map((e) => <li key={e.id}>{e.libelle}</li>)}</ul>
          <ul>{question.elementsDroite.map((e) => <li key={e.id}>{e.libelle}</li>)}</ul>
        </div>
      )}

      {question.type !== 'QCM' && correction !== null && (
        <div className="correction">
          <p className="correction-titre">✓ Bonne réponse</p>
          <ul>
            {correction.paires.map((p) => (
              <li key={`${p.libelleGauche}→${p.libelleDroite}`}>{p.libelleGauche} → {p.libelleDroite}</li>
            ))}
            {correction.reponsesAcceptees.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
      )}

      {avecNombres && <p>Réponses reçues : <strong>{repartition?.total ?? 0}</strong> / {seance.connectes}</p>}
    </section>
  )
}
