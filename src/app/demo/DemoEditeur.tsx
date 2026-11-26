// DÉMO de l'écran E3 (plans UC3 et UC7), sans back ni PDF : http://localhost:5173/demo/editeur, en développement
// seulement (route absente du build de production). Contenu repris de la maquette (docs/maquettes/Capture d'écran
// 2026-11-26 102631.png) : « CM 1 Programmation avancée », version 3, Quiz 1 (QCM, 30 s) entre les pages 2 et 3,
// Quiz 2 (réponse libre, 45 s) et une page de classement cumulé après la page 3.
// L'état de l'éditeur vient du vrai reducer du domaine ; un sélecteur force chaque état (chargement, prêt,
// insertion, erreurs, lecture seule). Les éléments 5 à 18 (UC4, UC5, UC13, UC14) gardent leur état dans la démo :
// aucune route du back n'est appelée. « Lancer » utilise une fausse API (séance n° 1).

import { useReducer, useRef, useState } from 'react'
import type { Cours, PageInseree, PageQuizInseree, QuizResume } from '../../features/cours/domain/cours.ts'
import { ETAT_INITIAL, reduireEditeur } from '../../features/cours/domain/machineEditeur.ts'
import type { ActionEditeur, EtatEditeur } from '../../features/cours/domain/machineEditeur.ts'
import { listeAffichee } from '../../features/cours/domain/numerotation.ts'
import { BoutonReappliquer } from '../../features/cours/presentation/BoutonReappliquer.tsx'
import { EditeurCours } from '../../features/cours/presentation/EditeurCours.tsx'
import type { RendrePage } from '../../features/cours/presentation/RenduPdf.tsx'
import {
  DEROULE_PAR_DEFAUT, imageAcceptee, questionComplete, questionVide, reduireQuestion,
} from '../../features/quiz/domain/questionEditee.ts'
import type { ActionQuestion, DerouleQuiz, QuestionEditee } from '../../features/quiz/domain/questionEditee.ts'
import { ApercuQuestion } from '../../features/quiz/presentation/ApercuQuestion.tsx'
import { BarreQuiz } from '../../features/quiz/presentation/BarreQuiz.tsx'
import { BoutonEnregistrer } from '../../features/quiz/presentation/BoutonEnregistrer.tsx'
import { LIBELLES_QUIZ } from '../../features/quiz/presentation/libellesQuiz.ts'
import { PanneauQuestion } from '../../features/quiz/presentation/PanneauQuestion.tsx'
import type { ApiLancement } from '../../features/seance/application/useLancerQuiz.ts'
import { BoutonLancerPresentation } from '../../features/seance/presentation/BoutonLancerPresentation.tsx'

const NB_PAGES = 12
const DELAI_MS = 800
const COURS: Cours = {
  idCours: 1,
  titre: 'CM 1 Programmation avancée',
  archive: false,
  version: { idVersion: 3, numero: 3, nbPages: NB_PAGES },
}
const PAGES: PageInseree[] = [
  { idPage: 1, numeroPage: 2, ordre: 0, type: 'QUIZ', idQuiz: 1 },
  { idPage: 2, numeroPage: 3, ordre: 0, type: 'QUIZ', idQuiz: 2 },
  { idPage: 3, numeroPage: 3, ordre: 1, type: 'CLASSEMENT' },
]
const QUIZ: QuizResume[] = [{ idQuiz: 1, titre: 'Quiz 1' }, { idQuiz: 2, titre: 'Quiz 2' }]

const QUESTIONS_INITIALES: [number, QuestionEditee][] = [
  [1, {
    ...questionVide('QCM'),
    enonce: 'Quelle structure garantit un accès en O(1) en moyenne ?',
    propositions: [
      { id: 1, libelle: 'Liste chaînée', correcte: false },
      { id: 2, libelle: 'Table de hachage', correcte: true },
      { id: 3, libelle: 'Arbre binaire', correcte: false },
      { id: 4, libelle: 'Pile', correcte: false },
    ],
  }],
  [2, {
    ...questionVide('REPONSE_LIBRE'),
    enonce: 'Quel mot-clé Java interdit la redéfinition d\'une méthode ?',
    reponsesAcceptees: ['final'],
    dureeSec: 45,
  }],
]
const DEROULES_INITIAUX: [number, DerouleQuiz][] = [[1, { ...DEROULE_PAR_DEFAUT, note: true }], [2, DEROULE_PAR_DEFAUT]]
/** Élément 9 : quiz de la version précédente à réappliquer (UC6), valeur de la maquette. */
const QUIZ_A_REAPPLIQUER = 4

const charge = (cours: Cours, pages = PAGES, quiz = QUIZ): ActionEditeur =>
  ({ type: 'CHARGE', cours, nbPages: NB_PAGES, pages, quiz })

const derouler = (...actions: ActionEditeur[]) => actions.reduce(reduireEditeur, ETAT_INITIAL)
const selectionQuiz1: ActionEditeur = { type: 'SELECTIONNER', selection: { genre: 'PAGE_INSEREE', idPage: 1, titreQuiz: 'Quiz 1' } }
const pret = () => derouler(charge(COURS), selectionQuiz1)
const envoi = () => derouler(
  charge(COURS),
  { type: 'OUVRIR_CHOIX', emplacement: { numeroPage: 4, ordre: 0 } },
  { type: 'CONFIRMER', idQuiz: 1 },
)
const refus = (statut: number, code?: string) => reduireEditeur(envoi(), {
  type: 'INSERTION_REFUSEE',
  erreur: { statut, code, error: null },
})

const ETATS: Record<string, () => EtatEditeur> = {
  'Prêt (page de quiz)': pret,
  'Prêt (page du PDF)': () => derouler(charge(COURS)),
  'Chargement': () => ETAT_INITIAL,
  'Insertion en cours': envoi,
  'Erreur 403': () => refus(403),
  'Erreur REQUETE_INVALIDE': () => refus(400, 'REQUETE_INVALIDE'),
  'Erreur COURS_INTROUVABLE': () => refus(404, 'COURS_INTROUVABLE'),
  'Erreur COURS_ARCHIVE': () => refus(409, 'COURS_ARCHIVE'),
  'Erreur VERSION_PERIMEE (bloquée)': () => refus(409, 'VERSION_PERIMEE'),
  'Erreur EMPLACEMENT_INVALIDE (bloquée)': () => refus(422, 'EMPLACEMENT_INVALIDE'),
  'Erreur QUIZ_INTROUVABLE': () => refus(404, 'QUIZ_INTROUVABLE'),
  'Erreur QUIZ_EN_SEANCE': () => refus(409, 'QUIZ_EN_SEANCE'),
  'Erreur ERREUR_SERVEUR': () => refus(500, 'ERREUR_SERVEUR'),
  'Panne réseau pendant l\'insertion': () => reduireEditeur(envoi(), { type: 'ECHEC_RESEAU_INSERTION', pages: null }),
  'Erreur de chargement': () => derouler({
    type: 'ECHEC_CHARGEMENT',
    erreur: { statut: 500, error: null, request_id: 'demo-0001' },
  }),
  'Lecture seule (cours archivé)': () => derouler(charge({ ...COURS, archive: true }), selectionQuiz1),
}

/** Fausse page : fond, titre et lignes grisées, couleurs lues dans les variables de la charte. */
const rendreFaussePage: RendrePage = (numeroPage, canvas, largeur) => {
  let minuterie = 0
  const fin = new Promise<void>((resoudre) => {
    minuterie = window.setTimeout(() => {
      const ratio = window.devicePixelRatio || 1
      const hauteur = Math.round(largeur * 3 / 4)
      canvas.width = Math.floor(largeur * ratio)
      canvas.height = Math.floor(hauteur * ratio)
      canvas.style.width = `${largeur}px`
      const contexte = canvas.getContext('2d')
      if (contexte) {
        const style = getComputedStyle(canvas)
        contexte.scale(ratio, ratio)
        contexte.fillStyle = style.getPropertyValue('--couleur-carte')
        contexte.fillRect(0, 0, largeur, hauteur)
        contexte.fillStyle = style.getPropertyValue('--couleur-texte')
        contexte.font = `700 ${Math.round(largeur / 14)}px ${style.getPropertyValue('--police')}`
        contexte.fillText(`Diapositive ${numeroPage}`, largeur * 0.08, hauteur * 0.2)
        contexte.fillStyle = style.getPropertyValue('--couleur-fond')
        for (let ligne = 0; ligne < 4; ligne++) {
          contexte.fillRect(largeur * 0.08, hauteur * (0.35 + ligne * 0.13), largeur * (0.8 - ligne * 0.12), hauteur * 0.06)
        }
      }
      resoudre()
    }, 300)
  })
  return { fin, annuler: () => window.clearTimeout(minuterie) }
}

/** Lancement simulé : séance n° 1 après un délai, comme un 201. */
const API_LANCEMENT_DEMO: ApiLancement = {
  lancerQuiz: () => new Promise((resoudre) => window.setTimeout(() => resoudre({ idSession: 1 }), DELAI_MS)),
  lireSeanceOuverte: async () => ({ seance: { idSession: 1 } }),
  cloturerSeance: async () => undefined,
}

type ActionDemo = ActionEditeur | { type: 'FORCER', etat: EtatEditeur }

function reduireDemo(etat: EtatEditeur, action: ActionDemo): EtatEditeur {
  return action.type === 'FORCER' ? action.etat : reduireEditeur(etat, action)
}

export default function DemoEditeur() {
  const [etat, envoyer] = useReducer(reduireDemo, undefined, pret)
  const [choix, setChoix] = useState('Prêt (page de quiz)')
  const [titresQuiz, setTitresQuiz] = useState<ReadonlyMap<number, string>>(
    () => new Map([[1, 'Quiz 1'], [2, 'Quiz 2']]))
  const [questions, setQuestions] = useState<ReadonlyMap<number, QuestionEditee>>(() => new Map(QUESTIONS_INITIALES))
  const [deroules, setDeroules] = useState<ReadonlyMap<number, DerouleQuiz>>(() => new Map(DEROULES_INITIAUX))
  const [imageRefusee, setImageRefusee] = useState(false)
  const [modifie, setModifie] = useState(false)
  const [enregistrement, setEnregistrement] = useState(false)
  const [seanceLancee, setSeanceLancee] = useState<number | null>(null)
  // Faux back : pages et quiz enregistrés, relus par « Recharger ».
  const serveur = useRef({ pages: PAGES, quiz: QUIZ, prochainId: 100 })

  function confirmer(idQuiz: number | null) {
    if (etat.nom !== 'PRET' || etat.insertion.nom !== 'CHOIX_QUIZ') return
    const { numeroPage, ordre } = etat.insertion.emplacement
    envoyer({ type: 'CONFIRMER', idQuiz })
    const s = serveur.current
    const idPage = s.prochainId++
    const quizCree = idQuiz === null
    const quiz = quizCree ? { idQuiz: s.prochainId++, titre: `Quiz ${s.quiz.length + 1}` } : s.quiz.find((q) => q.idQuiz === idQuiz)
    if (!quiz) return
    // Décalage fait par le faux back, comme le vrai : le front ne recalcule rien (plan UC3, D9).
    s.pages = [
      ...s.pages.map((p) => p.numeroPage === numeroPage && p.ordre >= ordre ? { ...p, ordre: p.ordre + 1 } : p),
      { idPage, numeroPage, ordre, type: 'QUIZ', idQuiz: quiz.idQuiz },
    ]
    if (quizCree) s.quiz = [...s.quiz, quiz]
    const reponse: PageQuizInseree = {
      idPage, idQuiz: quiz.idQuiz, titreQuiz: quiz.titre, quizCree, idQuestion: idPage, numeroPage, ordre, pages: s.pages,
    }
    window.setTimeout(() => {
      setTitresQuiz((titres) => new Map(titres).set(idPage, quiz.titre))
      setQuestions((qs) => new Map(qs).set(idPage, questionVide()))
      envoyer({ type: 'INSERTION_REUSSIE', reponse })
    }, DELAI_MS)
  }

  function recharger() {
    envoyer({ type: 'RECHARGER' })
    window.setTimeout(() => envoyer(charge(COURS, serveur.current.pages, serveur.current.quiz)), DELAI_MS)
  }

  function enregistrer() {
    setEnregistrement(true)
    window.setTimeout(() => {
      setEnregistrement(false)
      setModifie(false)
    }, DELAI_MS)
  }

  // Page de quiz sélectionnée : sa question, son quiz, sa place dans le cours.
  const donnees = etat.nom === 'PRET' || etat.nom === 'LECTURE_SEULE' ? etat : null
  const lectureSeule = etat.nom === 'LECTURE_SEULE'
  const elements = donnees ? listeAffichee(donnees.nbPages, donnees.pages) : []
  const indice = donnees?.selection.genre === 'PAGE_INSEREE'
    ? elements.findIndex((e) => e.genre === 'PAGE_INSEREE' && e.page.idPage === (donnees.selection as { idPage: number }).idPage)
    : -1
  const element = indice >= 0 ? elements[indice] : null
  const pageQuiz = element?.genre === 'PAGE_INSEREE' && element.page.type === 'QUIZ' ? element.page : null
  const idQuiz = pageQuiz?.idQuiz ?? null
  const question = pageQuiz ? questions.get(pageQuiz.idPage) ?? null : null
  const deroule = idQuiz === null ? DEROULE_PAR_DEFAUT : deroules.get(idQuiz) ?? DEROULE_PAR_DEFAUT
  const pagesDuQuiz = elements.filter((e) => e.genre === 'PAGE_INSEREE' && e.page.idQuiz !== undefined && e.page.idQuiz === idQuiz)

  function modifierQuestion(action: ActionQuestion) {
    if (!pageQuiz) return
    setQuestions((qs) => {
      const actuelle = qs.get(pageQuiz.idPage)
      return actuelle ? new Map(qs).set(pageQuiz.idPage, reduireQuestion(actuelle, action)) : qs
    })
    setModifie(true)
  }

  function modifierDeroule(nouveau: DerouleQuiz) {
    if (idQuiz === null) return
    setDeroules((ds) => new Map(ds).set(idQuiz, nouveau))
    setModifie(true)
  }

  function choisirImage(fichier: File) {
    const acceptee = imageAcceptee(fichier)
    setImageRefusee(!acceptee)
    if (!acceptee) return
    if (question?.image) URL.revokeObjectURL(question.image)
    modifierQuestion({ type: 'IMAGE', valeur: URL.createObjectURL(fichier) })
  }

  function retirerImage() {
    if (question?.image) URL.revokeObjectURL(question.image)
    setImageRefusee(false)
    modifierQuestion({ type: 'IMAGE', valeur: null })
  }

  // Détail des pages dans la bande (maquette : « QCM • 30 s », « cumulé »).
  const detailsPages = new Map<number, string>()
  for (const page of donnees?.pages ?? []) {
    const q = questions.get(page.idPage)
    if (page.type === 'QUIZ' && q) detailsPages.set(page.idPage, `${LIBELLES_QUIZ.types[q.type]} • ${LIBELLES_QUIZ.duree(q.dureeSec)}`)
    // TODO(UC11): simple ou cumulé, donné par le classement ; valeur de la maquette.
    if (page.type === 'CLASSEMENT') detailsPages.set(page.idPage, 'cumulé')
  }

  const quizPret = idQuiz === null || pagesDuQuiz.every((e) => {
    const q = e.genre === 'PAGE_INSEREE' ? questions.get(e.page.idPage) : undefined
    return q !== undefined && questionComplete(q)
  })

  const actions = donnees && (
    <>
      {donnees.cours.version.numero > 1 && (
        <BoutonReappliquer versionPrecedente={donnees.cours.version.numero - 1} nbQuiz={QUIZ_A_REAPPLIQUER} />
      )}
      {!lectureSeule && <BoutonEnregistrer modifie={modifie} enCours={enregistrement} onEnregistrer={enregistrer} />}
      {!lectureSeule && (
        <BoutonLancerPresentation
          api={API_LANCEMENT_DEMO}
          quiz={donnees.quiz}
          idQuizPropose={idQuiz}
          quizPret={quizPret}
          onSeance={setSeanceLancee}
          onNonConnecte={() => {}}
        />
      )}
    </>
  )

  return (
    <>
      <div className="demo-barre">
        <label>
          État de la démo{' '}
          <select
            value={choix}
            onChange={(evenement) => {
              setChoix(evenement.target.value)
              setSeanceLancee(null)
              envoyer({ type: 'FORCER', etat: ETATS[evenement.target.value]() })
            }}
          >
            {Object.keys(ETATS).map((nom) => <option key={nom}>{nom}</option>)}
          </select>
        </label>
        {seanceLancee !== null && (
          <span role="status">Démo : séance n° {seanceLancee} lancée (E5 sur /seances/{seanceLancee} avec le back).</span>
        )}
      </div>
      <EditeurCours
        etat={etat}
        rendrePage={rendreFaussePage}
        titresQuiz={titresQuiz}
        detailsPages={detailsPages}
        actionsEntete={actions || undefined}
        barreQuiz={pageQuiz && (
          <BarreQuiz
            avant={indice > 0 ? elements[indice - 1].position : null}
            apres={indice < elements.length - 1 ? elements[indice + 1].position : null}
            deroule={deroule}
            desactive={lectureSeule}
            onChange={modifierDeroule}
          />
        )}
        apercuQuiz={pageQuiz && question ? (
          <ApercuQuestion
            titreQuiz={titresQuiz.get(pageQuiz.idPage) ?? LIBELLES_QUIZ.pageQuiz}
            numero={pagesDuQuiz.findIndex((e) => e.genre === 'PAGE_INSEREE' && e.page.idPage === pageQuiz.idPage) + 1}
            total={pagesDuQuiz.length}
            question={question}
            imageRefusee={imageRefusee}
            lectureSeule={lectureSeule}
            onChoisirImage={choisirImage}
            onRetirerImage={retirerImage}
          />
        ) : undefined}
        panneau={pageQuiz && question ? (
          <PanneauQuestion
            question={question}
            deroule={deroule}
            lectureSeule={lectureSeule}
            onQuestion={modifierQuestion}
            onDeroule={modifierDeroule}
          />
          // Page du PDF ou de classement : panneau vide (la maquette ne montre que la page de quiz).
        ) : donnees ? <></> : undefined}
        onSelectionner={(selection) => {
          setImageRefusee(false)
          envoyer({ type: 'SELECTIONNER', selection })
        }}
        onOuvrirChoix={(emplacement) => envoyer({ type: 'OUVRIR_CHOIX', emplacement })}
        onAnnulerChoix={() => envoyer({ type: 'ANNULER_CHOIX' })}
        onConfirmer={confirmer}
        onRecharger={recharger}
      />
    </>
  )
}
