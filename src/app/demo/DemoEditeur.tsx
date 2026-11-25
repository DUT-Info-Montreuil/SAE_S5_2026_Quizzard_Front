// DÉMO de l'écran E3 (plan UC3, B4 et D17), sans back ni PDF : http://localhost:5173/demo/editeur, en développement
// seulement (route absente du build de production). Faux cours de 12 pages avec une page de quiz en (2, 0) ; les
// pages sont dessinées sur le canvas (« Diapositive n »). L'état vient du vrai reducer du domaine ; un sélecteur
// force chaque état (chargement, prêt, insertion, erreurs, lecture seule). L'insertion répond 201 après un délai.

import { useReducer, useRef, useState } from 'react'
import type { Cours, PageInseree, PageQuizInseree, QuizResume } from '../../features/cours/domain/cours.ts'
import { ETAT_INITIAL, reduireEditeur } from '../../features/cours/domain/machineEditeur.ts'
import type { ActionEditeur, EtatEditeur } from '../../features/cours/domain/machineEditeur.ts'
import { EditeurCours } from '../../features/cours/presentation/EditeurCours.tsx'
import type { RendrePage } from '../../features/cours/presentation/RenduPdf.tsx'

const NB_PAGES = 12
const DELAI_MS = 800
const COURS: Cours = {
  idCours: 1,
  titre: 'CM 1 Programmation avancée',
  archive: false,
  version: { idVersion: 3, numero: 3, nbPages: NB_PAGES },
}
const PAGES: PageInseree[] = [{ idPage: 1, numeroPage: 2, ordre: 0, type: 'QUIZ' }]
const QUIZ: QuizResume[] = [{ idQuiz: 1, titre: 'Quiz 1' }, { idQuiz: 2, titre: 'Quiz 2' }]

const charge = (cours: Cours, pages = PAGES, quiz = QUIZ): ActionEditeur =>
  ({ type: 'CHARGE', cours, nbPages: NB_PAGES, pages, quiz })

const derouler = (...actions: ActionEditeur[]) => actions.reduce(reduireEditeur, ETAT_INITIAL)
const pret = () => derouler(charge(COURS))
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
  'Chargement': () => ETAT_INITIAL,
  'Prêt': pret,
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
  'Panne réseau pendant l\'insertion': () => reduireEditeur(envoi(), { type: 'ECHEC_RESEAU_INSERTION' }),
  'Erreur de chargement': () => derouler({
    type: 'ECHEC_CHARGEMENT',
    erreur: { statut: 500, error: null, request_id: 'demo-0001' },
  }),
  'Lecture seule (cours archivé)': () => derouler(charge({ ...COURS, archive: true })),
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

type ActionDemo = ActionEditeur | { type: 'FORCER', etat: EtatEditeur }

function reduireDemo(etat: EtatEditeur, action: ActionDemo): EtatEditeur {
  return action.type === 'FORCER' ? action.etat : reduireEditeur(etat, action)
}

export default function DemoEditeur() {
  const [etat, envoyer] = useReducer(reduireDemo, undefined, pret)
  const [choix, setChoix] = useState('Prêt')
  const [titresQuiz, setTitresQuiz] = useState<ReadonlyMap<number, string>>(() => new Map([[1, 'Quiz 1']]))
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
      { idPage, numeroPage, ordre, type: 'QUIZ' },
    ]
    if (quizCree) s.quiz = [...s.quiz, quiz]
    const reponse: PageQuizInseree = {
      idPage, idQuiz: quiz.idQuiz, titreQuiz: quiz.titre, quizCree, idQuestion: idPage, numeroPage, ordre, pages: s.pages,
    }
    window.setTimeout(() => {
      setTitresQuiz((titres) => new Map(titres).set(idPage, quiz.titre))
      envoyer({ type: 'INSERTION_REUSSIE', reponse })
    }, DELAI_MS)
  }

  function recharger() {
    envoyer({ type: 'RECHARGER' })
    window.setTimeout(() => envoyer(charge(COURS, serveur.current.pages, serveur.current.quiz)), DELAI_MS)
  }

  return (
    <>
      <label>
        État de la démo{' '}
        <select
          value={choix}
          onChange={(evenement) => {
            setChoix(evenement.target.value)
            envoyer({ type: 'FORCER', etat: ETATS[evenement.target.value]() })
          }}
        >
          {Object.keys(ETATS).map((nom) => <option key={nom}>{nom}</option>)}
        </select>
      </label>
      <EditeurCours
        etat={etat}
        rendrePage={rendreFaussePage}
        titresQuiz={titresQuiz}
        onSelectionner={(selection) => envoyer({ type: 'SELECTIONNER', selection })}
        onOuvrirChoix={(emplacement) => envoyer({ type: 'OUVRIR_CHOIX', emplacement })}
        onAnnulerChoix={() => envoyer({ type: 'ANNULER_CHOIX' })}
        onConfirmer={confirmer}
        onRecharger={recharger}
      />
    </>
  )
}
