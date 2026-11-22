// DÉMO TEMPORAIRE de l'écran E8 (plan UC9, B4), sans back : http://localhost:5173/?demo=e8 en développement.
// Pour la supprimer : effacer le dossier src/app/demo/ et le bloc « démo » de src/app/main.tsx.
// Le minuteur ci-dessous simule le décompte ; il ne fait aucun appel réseau.

import { useEffect, useState } from 'react'
import { ERREURS_REPONSE } from '../../features/seance/domain/erreursReponse.ts'
import { saisieVide } from '../../features/seance/domain/question.ts'
import type { Question, ReponseSaisie } from '../../features/seance/domain/question.ts'
import { EcranQuestion } from '../../features/seance/presentation/EcranQuestion.tsx'
import './DemoE8.css'

const DUREE_SEC = 30

const commun = { position: 1, dureeSec: DUREE_SEC, echeance: '' }

const QUESTIONS: { nom: string, question: Question }[] = [
  {
    nom: 'QCM choix unique',
    question: {
      ...commun,
      idQuestion: 1,
      type: 'QCM',
      enonce: 'Quelle structure garantit un accès en O(1) en moyenne ?',
      propositions: [
        { idProposition: 11, libelle: 'Liste chaînée' },
        { idProposition: 12, libelle: 'Table de hachage' },
        { idProposition: 13, libelle: 'Arbre binaire' },
        { idProposition: 14, libelle: 'Pile' },
      ],
    },
  },
  {
    nom: 'QCM choix multiple',
    question: {
      ...commun,
      idQuestion: 2,
      position: 2,
      type: 'QCM',
      choixMultiple: true,
      enonce: 'Lesquels de ces langages sont typés statiquement ?',
      propositions: [
        { idProposition: 21, libelle: 'Java' },
        { idProposition: 22, libelle: 'Python' },
        { idProposition: 23, libelle: 'TypeScript' },
        { idProposition: 24, libelle: 'Rust' },
      ],
    },
  },
  {
    nom: 'Points à relier',
    question: {
      ...commun,
      idQuestion: 3,
      position: 3,
      type: 'POINTS_A_RELIER',
      enonce: 'Relie chaque structure à sa complexité de recherche.',
      elementsGauche: [
        { id: 31, libelle: 'Tableau trié' },
        { id: 32, libelle: 'Table de hachage' },
        { id: 33, libelle: 'Liste chaînée' },
      ],
      elementsDroite: [
        { id: 34, libelle: 'O(n)' },
        { id: 35, libelle: 'O(log n)' },
        { id: 36, libelle: 'O(1)' },
      ],
    },
  },
  {
    nom: 'Réponse libre',
    question: {
      ...commun,
      idQuestion: 5,
      position: 5,
      type: 'REPONSE_LIBRE',
      enonce: 'Explique en une phrase le principe d\'une file (FIFO).',
    },
  },
]

const ERREURS_DEMO = [
  ERREURS_REPONSE.REPONSE_INVALIDE.message,
  ERREURS_REPONSE.ERREUR_SERVEUR.message,
]

export default function DemoE8() {
  const [indice, setIndice] = useState(0)
  const { question } = QUESTIONS[indice]
  const [saisie, setSaisie] = useState<ReponseSaisie>(() => saisieVide(question))
  const [finMs, setFinMs] = useState(() => Date.now() + DUREE_SEC * 1000)
  const [maintenant, setMaintenant] = useState(() => Date.now())
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [arriveeEnCours, setArriveeEnCours] = useState(true)
  const [journal, setJournal] = useState('')

  useEffect(() => {
    const minuteur = setInterval(() => setMaintenant(Date.now()), 250)
    return () => clearInterval(minuteur)
  }, [])

  function choisirQuestion(i: number) {
    setIndice(i)
    setSaisie(saisieVide(QUESTIONS[i].question))
    relancer()
  }

  function relancer() {
    setFinMs(Date.now() + DUREE_SEC * 1000)
    setMaintenant(Date.now())
    setEnvoiEnCours(false)
    setErreur(null)
    setJournal('')
  }

  function valider() {
    setEnvoiEnCours(true)
    setErreur(null)
    setJournal(`Envoi simulé : ${JSON.stringify(saisie)}`)
  }

  return (
    <>
      <EcranQuestion
        question={question}
        saisie={saisie}
        onChangerSaisie={setSaisie}
        tempsRestantMs={finMs - maintenant}
        envoiEnCours={envoiEnCours}
        erreur={erreur}
        arriveeEnCours={arriveeEnCours}
        onValider={valider}
      />
      <aside className="demo-e8" aria-label="Commandes de la démo">
        <p className="demo-e8-titre">Démo E8 (temporaire, sans back)</p>
        <label>
          Question{' '}
          <select value={indice} onChange={(e) => choisirQuestion(Number(e.target.value))}>
            {QUESTIONS.map((q, i) => <option key={q.nom} value={i}>{q.nom}</option>)}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={arriveeEnCours}
            onChange={(e) => setArriveeEnCours(e.target.checked)}
          />{' '}
          Bandeau « arrivée en cours de route »
        </label>
        <div className="demo-e8-boutons">
          <button type="button" onClick={relancer}>Relancer ({DUREE_SEC} s)</button>
          <button type="button" onClick={() => setFinMs(Date.now())}>Temps à 0</button>
          {ERREURS_DEMO.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setEnvoiEnCours(false)
                setErreur(m)
              }}
            >
              Erreur : {m}
            </button>
          ))}
        </div>
        {journal && <p className="demo-e8-journal">{journal}</p>}
      </aside>
    </>
  )
}
