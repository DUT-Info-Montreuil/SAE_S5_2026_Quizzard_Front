import { useId } from 'react'
import { Icone } from '../../../shared/ui/Icone.tsx'
import { DUREES_PROPOSEES, PAIRES_MIN, PROPOSITIONS_MAX, PROPOSITIONS_MIN } from '../domain/questionEditee.ts'
import type { ActionQuestion, DerouleQuiz, EcranIntermediaireEdite, QuestionEditee, TypeQuestion } from '../domain/questionEditee.ts'
import { basculerEcran } from '../domain/questionEditee.ts'
import './EditeurQuiz.css'
import { LIBELLES_QUIZ as L } from './libellesQuiz.ts'
import { Segments } from './Segments.tsx'

interface PanneauQuestionProps {
  question: QuestionEditee
  deroule: DerouleQuiz
  lectureSeule?: boolean
  onQuestion(action: ActionQuestion): void
  onDeroule(deroule: DerouleQuiz): void
}

const lettre = (i: number) => String.fromCharCode(65 + i)
const FORMAT_POINTS = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

const ICONES_TYPE = { QCM: 'liste', POINTS_A_RELIER: 'lien', REPONSE_LIBRE: 'texte' } as const

/** Interrupteur (rôle `switch`) : « Décroissance… », « Points partiels ». */
function Interrupteur({ libelle, actif, desactive, onBasculer }: {
  libelle: string, actif: boolean, desactive: boolean, onBasculer(): void
}) {
  const id = useId()
  return (
    <div className="ligne-reglage">
      <span id={id}>{libelle}</span>
      <button
        type="button"
        role="switch"
        className="interrupteur"
        aria-checked={actif}
        aria-labelledby={id}
        disabled={desactive}
        onClick={onBasculer}
      />
    </div>
  )
}

function detailEcran(ecran: EcranIntermediaireEdite): string {
  if (!ecran.actif) return L.desactive
  return ecran.delaiSec === 0 ? L.aLaCloture : L.delai(ecran.delaiSec)
}

/**
 * Colonne de droite de E3 pour une page de quiz : type, énoncé et réponses (éléments 5 à 7), barème et durée
 * (éléments 12 et 8), passage et écrans intermédiaires (éléments 15 et 16).
 */
export function PanneauQuestion({ question: q, deroule, lectureSeule = false, onQuestion, onDeroule }: PanneauQuestionProps) {
  const idEnonce = useId()
  const idPoints = useId()

  return (
    <div className="panneau-question">
      <section className="carte-reglages" aria-label={L.typeQuestion}>
        <Segments<TypeQuestion>
          className="segments-pleins"
          legende={L.typeQuestion}
          desactive={lectureSeule}
          valeur={q.type}
          options={(['QCM', 'POINTS_A_RELIER', 'REPONSE_LIBRE'] as const).map((type) => ({
            valeur: type,
            libelle: (
              <>
                <Icone nom={ICONES_TYPE[type]} taille={14} />
                <span aria-hidden="true">{L.types[type]}</span>
                <span className="visuellement-cache">{L.typesLongs[type]}</span>
              </>
            ),
          }))}
          onChange={(valeur) => onQuestion({ type: 'TYPE', valeur })}
        />

        <label className="visuellement-cache" htmlFor={idEnonce}>{L.enonce}</label>
        <input
          id={idEnonce}
          className="champ"
          value={q.enonce}
          placeholder={L.enonce}
          readOnly={lectureSeule}
          required
          onChange={(e) => onQuestion({ type: 'ENONCE', valeur: e.target.value })}
        />

        {q.type === 'QCM' && (
          <ul className="liste-reponses" aria-label={L.reponses}>
            {q.propositions.map((p, i) => (
              <li key={p.id} className="ligne-reponse">
                <span className={`lettre-reponse reponse-${i % 4}`} aria-hidden="true">{lettre(i)}</span>
                <button
                  type="button"
                  role="checkbox"
                  className="case-bonne"
                  aria-checked={p.correcte}
                  aria-label={L.marquerBonne(lettre(i))}
                  disabled={lectureSeule}
                  onClick={() => onQuestion({ type: 'BASCULER_CORRECTE', id: p.id })}
                >
                  {p.correcte && <Icone nom="coche" taille={14} />}
                </button>
                <input
                  className="champ"
                  aria-label={L.proposition(lettre(i))}
                  value={p.libelle}
                  readOnly={lectureSeule}
                  onChange={(e) => onQuestion({ type: 'PROPOSITION', id: p.id, libelle: e.target.value })}
                />
                {q.propositions.length > PROPOSITIONS_MIN && !lectureSeule && (
                  <button
                    type="button"
                    className="bouton-icone"
                    aria-label={L.retirerProposition(lettre(i))}
                    onClick={() => onQuestion({ type: 'RETIRER_PROPOSITION', id: p.id })}
                  >
                    <Icone nom="croix" taille={14} />
                  </button>
                )}
              </li>
            ))}
            {q.propositions.length < PROPOSITIONS_MAX && !lectureSeule && (
              <li>
                <button type="button" className="bouton-ajout" onClick={() => onQuestion({ type: 'AJOUTER_PROPOSITION' })}>
                  {L.ajouterProposition}
                </button>
              </li>
            )}
          </ul>
        )}

        {q.type === 'POINTS_A_RELIER' && (
          <ul className="liste-reponses" aria-label={L.reponses}>
            {q.paires.map((p, i) => (
              <li key={p.id} className="ligne-paire">
                <input
                  className="champ"
                  aria-label={L.gauche(i + 1)}
                  value={p.gauche}
                  readOnly={lectureSeule}
                  onChange={(e) => onQuestion({ type: 'PAIRE', id: p.id, cote: 'gauche', valeur: e.target.value })}
                />
                <span aria-hidden="true">→</span>
                <input
                  className="champ"
                  aria-label={L.droite(i + 1)}
                  value={p.droite}
                  readOnly={lectureSeule}
                  onChange={(e) => onQuestion({ type: 'PAIRE', id: p.id, cote: 'droite', valeur: e.target.value })}
                />
                {q.paires.length > PAIRES_MIN && !lectureSeule && (
                  <button
                    type="button"
                    className="bouton-icone"
                    aria-label={L.retirerPaire(i + 1)}
                    onClick={() => onQuestion({ type: 'RETIRER_PAIRE', id: p.id })}
                  >
                    <Icone nom="croix" taille={14} />
                  </button>
                )}
              </li>
            ))}
            {!lectureSeule && (
              <li>
                <button type="button" className="bouton-ajout" onClick={() => onQuestion({ type: 'AJOUTER_PAIRE' })}>
                  {L.ajouterPaire}
                </button>
              </li>
            )}
          </ul>
        )}

        {q.type === 'REPONSE_LIBRE' && (
          <ul className="liste-reponses" aria-label={L.reponses}>
            {q.reponsesAcceptees.map((r, i) => (
              // Liste sans identifiant stable ; l'indice suffit (ajout et retrait sans réordonnancement).
              <li key={i} className="ligne-reponse">
                <input
                  className="champ"
                  aria-label={L.reponseAcceptee(i + 1)}
                  value={r}
                  readOnly={lectureSeule}
                  onChange={(e) => onQuestion({ type: 'REPONSE_ACCEPTEE', indice: i, valeur: e.target.value })}
                />
                {q.reponsesAcceptees.length > 1 && !lectureSeule && (
                  <button
                    type="button"
                    className="bouton-icone"
                    aria-label={L.retirerReponse(i + 1)}
                    onClick={() => onQuestion({ type: 'RETIRER_REPONSE_ACCEPTEE', indice: i })}
                  >
                    <Icone nom="croix" taille={14} />
                  </button>
                )}
              </li>
            ))}
            {!lectureSeule && (
              <li>
                <button type="button" className="bouton-ajout" onClick={() => onQuestion({ type: 'AJOUTER_REPONSE_ACCEPTEE' })}>
                  {L.ajouterReponse}
                </button>
              </li>
            )}
          </ul>
        )}
      </section>

      <section className="carte-reglages" aria-labelledby={`${idPoints}-titre`}>
        <h2 id={`${idPoints}-titre`} className="carte-reglages-titre">
          <Icone nom="eclair" taille={16} />
          {L.bareme}
        </h2>
        <div className="ligne-reglage">
          <label htmlFor={idPoints}>{L.pointsMax}</label>
          <input
            id={idPoints}
            className="champ-points"
            type="text"
            inputMode="numeric"
            // « 1 000 » comme sur la maquette ; seuls les chiffres saisis sont gardés.
            value={FORMAT_POINTS.format(q.pointsMax)}
            readOnly={lectureSeule}
            onChange={(e) => onQuestion({ type: 'POINTS_MAX', valeur: Number(e.target.value.replace(/\D/g, '') || '0') })}
          />
        </div>
        <Interrupteur
          libelle={L.decroissance}
          actif={q.decroissance}
          desactive={lectureSeule}
          onBasculer={() => onQuestion({ type: 'BASCULER_DECROISSANCE' })}
        />
        <Interrupteur
          libelle={L.pointsPartiels}
          actif={q.pointsPartiels}
          desactive={lectureSeule}
          onBasculer={() => onQuestion({ type: 'BASCULER_POINTS_PARTIELS' })}
        />
        <Segments
          className="segments-durees"
          legende={L.dureeMax}
          desactive={lectureSeule}
          valeur={String(q.dureeSec)}
          options={DUREES_PROPOSEES.map((d) => ({ valeur: String(d), libelle: L.duree(d) }))}
          onChange={(v) => onQuestion({ type: 'DUREE', valeur: Number(v) })}
        />
      </section>

      <section className="carte-reglages" aria-label={L.apresQuestion}>
        <div className="ligne-reglage">
          <span className="carte-reglages-titre" aria-hidden="true">
            <Icone nom="lecture" taille={14} />
            {L.apresQuestion}
          </span>
          <Segments
            legende={L.apresQuestion}
            desactive={lectureSeule}
            valeur={deroule.passage}
            options={[{ valeur: 'MANUEL', libelle: L.manuel }, { valeur: 'AUTO', libelle: L.auto }]}
            onChange={(passage) => onDeroule({ ...deroule, passage })}
          />
        </div>
        {/* TODO(UC14): réordonner les écrans (poignée de la maquette) ; ordre fixe en attendant. */}
        <ul className="liste-ecrans">
          {deroule.ecrans.map((ecran) => (
            <li key={ecran.type} className={ecran.actif ? 'ligne-ecran' : 'ligne-ecran ligne-ecran-inactif'}>
              <Icone nom="poignee" taille={14} className="ligne-ecran-poignee" />
              <button
                type="button"
                role="checkbox"
                className="case-bonne"
                aria-checked={ecran.actif}
                aria-label={L.afficherEcran(L.ecrans[ecran.type])}
                disabled={lectureSeule}
                onClick={() => onDeroule(basculerEcran(deroule, ecran.type))}
              >
                {ecran.actif && <Icone nom="coche" taille={14} />}
              </button>
              <span className="ligne-ecran-nom" aria-hidden="true">{L.ecrans[ecran.type]}</span>
              <span className="ligne-ecran-detail">{detailEcran(ecran)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
