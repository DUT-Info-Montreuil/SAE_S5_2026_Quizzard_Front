import { barres } from '../domain/seanceAnimee.ts'
import type { EtatSeance } from '../domain/seanceAnimee.ts'
import { LIBELLES_ANIMATION as L } from './libellesAnimation.ts'

/**
 * E5 : énoncé, propositions avec leur lettre et histogramme des réponses reçues, mis à jour en direct ; une fois la
 * question close, la bonne réponse et le nombre d'étudiants par réponse. Aucune identité : seulement des nombres.
 * Image de la question (UC4) et écrans intermédiaires (UC14) : hors périmètre de l'UC7.
 */
export function QuestionProjetee({ seance }: { seance: EtatSeance }) {
  const { question, repartition, correction } = seance
  if (question === null) return null

  return (
    <section className="question-projetee" aria-label={L.questionEnCours}>
      <h2 className="question-projetee-enonce">{question.enonce}</h2>

      {question.type === 'QCM' && (
        <ol className="histogramme">
          {barres(question.propositions, repartition, correction).map((b, i) => (
            <li key={b.idProposition} className={b.bonne ? 'histogramme-ligne histogramme-bonne' : 'histogramme-ligne'}>
              <span className={`histogramme-lettre couleur-reponse-${i % 4}`} aria-hidden="true">{b.lettre}</span>
              <span className="histogramme-corps">
                <span className="histogramme-libelle">
                  <span className="visuellement-cache">{b.lettre}. </span>
                  {b.libelle}
                </span>
                {b.bonne && <span className="histogramme-marque">✓ {L.bonneReponse}</span>}
                <span className="histogramme-piste" aria-hidden="true">
                  <span className={`histogramme-barre couleur-reponse-${i % 4}`} style={{ width: `${b.part * 100}%` }} />
                </span>
              </span>
              <span className="histogramme-nombre" role="img" aria-label={L.reponsesPour(b.lettre, b.nombre)}>
                {b.nombre}
              </span>
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
        <div className="correction-projetee">
          <p className="correction-projetee-titre">✓ {L.bonneReponse}</p>
          <ul>
            {correction.paires.map((p) => (
              <li key={`${p.libelleGauche}→${p.libelleDroite}`}>{p.libelleGauche} → {p.libelleDroite}</li>
            ))}
            {correction.reponsesAcceptees.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
      )}

      <p className="question-projetee-recues">
        {L.reponsesRecues} : <strong>{repartition?.total ?? 0}</strong> / {seance.connectes}
        {correction !== null && <span className="question-projetee-close"> · {L.questionClose}</span>}
      </p>
    </section>
  )
}
