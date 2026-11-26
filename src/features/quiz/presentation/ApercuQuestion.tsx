import { useId, useRef } from 'react'
import { Icone } from '../../../shared/ui/Icone.tsx'
import { TYPES_IMAGE } from '../domain/questionEditee.ts'
import type { QuestionEditee } from '../domain/questionEditee.ts'
import './EditeurQuiz.css'
import { LIBELLES_QUIZ as L } from './libellesQuiz.ts'

interface ApercuQuestionProps {
  titreQuiz: string
  numero: number
  total: number
  question: QuestionEditee
  /** Vrai après le refus d'un fichier (type ou taille) : les formats acceptés sont annoncés. */
  imageRefusee: boolean
  lectureSeule?: boolean
  onChoisirImage(fichier: File): void
  onRetirerImage(): void
}

const lettre = (i: number) => String.fromCharCode(65 + i)

/**
 * Aperçu d'une page de quiz (élément 4) tel que les étudiants la verront, avec la zone de l'image (élément 18).
 * L'énoncé et les propositions sont affichés comme texte (jamais de HTML interprété, CLAUDE.md règle 8).
 */
export function ApercuQuestion({
  titreQuiz, numero, total, question, imageRefusee, lectureSeule = false, onChoisirImage, onRetirerImage,
}: ApercuQuestionProps) {
  const fichier = useRef<HTMLInputElement>(null)
  const idFormats = useId()

  return (
    <div className="apercu-question-carte">
      <div className="apercu-question-entete">
        <span>{L.entete(titreQuiz, numero, total)}</span>
        <span className="apercu-question-duree">
          <Icone nom="horloge" taille={14} />
          {L.duree(question.dureeSec)}
        </span>
      </div>

      <p className={question.enonce.trim() === '' ? 'apercu-question-enonce apercu-question-vide' : 'apercu-question-enonce'}>
        {question.enonce.trim() === '' ? L.enonceVide : question.enonce}
      </p>

      <div className="zone-image">
        {question.image === null
          ? <Icone nom="image" taille={72} className="zone-image-icone" />
          : <img className="zone-image-apercu" src={question.image} alt={L.image} />}
        <p className="zone-image-titre">{L.image}</p>
        <p id={idFormats} className="zone-image-formats" role={imageRefusee ? 'alert' : undefined}>
          {L.formatsImage}
        </p>
        <div className="zone-image-actions">
          <input
            ref={fichier}
            type="file"
            className="visuellement-cache"
            tabIndex={-1}
            accept={TYPES_IMAGE.join(',')}
            aria-hidden="true"
            onChange={(e) => {
              const choisi = e.target.files?.[0]
              if (choisi) onChoisirImage(choisi)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="bouton-secondaire bouton-petit"
            disabled={lectureSeule}
            aria-describedby={idFormats}
            onClick={() => fichier.current?.click()}
          >
            {L.remplacer}
          </button>
          <button
            type="button"
            className="bouton-secondaire bouton-petit"
            disabled={lectureSeule || question.image === null}
            onClick={onRetirerImage}
          >
            {L.retirer}
          </button>
        </div>
      </div>

      {question.type === 'QCM' && (
        <ul className="apercu-reponses">
          {question.propositions.map((p, i) => (
            <li key={p.id} className={p.correcte ? 'apercu-reponse apercu-reponse-bonne' : 'apercu-reponse'}>
              <span className={`apercu-reponse-lettre reponse-${i % 4}`} aria-hidden="true">{lettre(i)}</span>
              <span className="visuellement-cache">{lettre(i)}. </span>
              <span className="apercu-reponse-libelle">{p.libelle}</span>
              {p.correcte && (
                <span className="apercu-reponse-coche">
                  <Icone nom="coche" taille={18} />
                  <span className="visuellement-cache">{L.bonneReponse}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {question.type === 'POINTS_A_RELIER' && (
        <ul className="apercu-paires">
          {question.paires.map((p) => (
            <li key={p.id} className="apercu-paire">
              <span className="apercu-reponse">{p.gauche}</span>
              <span aria-hidden="true">→</span>
              <span className="apercu-reponse">{p.droite}</span>
            </li>
          ))}
        </ul>
      )}

      {question.type === 'REPONSE_LIBRE' && (
        <ul className="apercu-libres">
          {question.reponsesAcceptees.filter((r) => r.trim() !== '').map((r) => (
            <li key={r} className="apercu-reponse apercu-reponse-bonne">
              <span className="apercu-reponse-libelle">{r}</span>
              <span className="apercu-reponse-coche">
                <Icone nom="coche" taille={18} />
                <span className="visuellement-cache">{L.bonneReponse}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
