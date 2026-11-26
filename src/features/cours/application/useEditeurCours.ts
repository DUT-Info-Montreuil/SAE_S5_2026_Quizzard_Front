// Assemblage de l'éditeur E3, UC3 « Insérer une page de quiz » (plan UC3, B5 ; D5, D6, D8, D12, D14, D15).
// Relie le reducer du domaine (B2), l'API et le PDF (B3) ; l'écran EditeurCours (B4) reste un composant de
// présentation qui reçoit ce que renvoie ce hook.
//
// - Chargement (état CHARGEMENT) : cours (dernière version), puis en parallèle pages insérées, quiz et PDF (téléchargé
//   et ouvert). CHARGE part une fois le document ouvert ; le nombre de pages est le `nbPages` de la version, celui que
//   le back valide (D8), pas `numPages` ; les miniatures se rendent ensuite, à la demande. Un seul document ouvert : l'ancien est fermé au rechargement et au démontage.
// - Insertion (D12) : verrou synchrone contre le double clic, extraction du repère (échec → sans repère), POST.
//   Panne réseau : les pages sont relues (la page a peut-être été créée), jamais de renvoi automatique.
// - Quitter l'écran annule les requêtes en cours (AbortController) et libère le document PDF.

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { ErreurHttp } from '../../../shared/http/ErreurHttp.ts'
import type { DocumentPdf } from '../../../shared/pdf/documentPdf.ts'
import {
  insererPageQuiz,
  lireCours,
  lireFichierPdf,
  lirePagesInserees,
  lireQuizDuCours,
} from '../api/coursApi.ts'
import { extraireRepere } from '../api/extraireRepere.ts'
import type { Emplacement } from '../domain/cours.ts'
import { ETAT_INITIAL, reduireEditeur } from '../domain/machineEditeur.ts'
import type { EtatEditeur, Selection } from '../domain/machineEditeur.ts'

/** Routes utilisées par l'éditeur ; injectables pour les tests et la démo. */
export interface ApiEditeurCours {
  lireCours: typeof lireCours
  lirePagesInserees: typeof lirePagesInserees
  lireQuizDuCours: typeof lireQuizDuCours
  lireFichierPdf: typeof lireFichierPdf
  insererPageQuiz: typeof insererPageQuiz
}

export interface OptionsEditeurCours {
  api?: ApiEditeurCours
  /** Ouverture du PDF ; par défaut PDF.js (`shared/pdf`), qui ne tourne pas sous jsdom. */
  ouvrirPdf?: (donnees: ArrayBuffer) => Promise<DocumentPdf>
}

const API_COURS: ApiEditeurCours = { lireCours, lirePagesInserees, lireQuizDuCours, lireFichierPdf, insererPageQuiz }

// Import dynamique : PDF.js reste dans un chunk à part, chargé seulement à l'ouverture d'un document.
const ouvrirAvecPdfJs = async (donnees: ArrayBuffer) =>
  (await import('../../../shared/pdf/documentPdf.ts')).ouvrirDocumentPdf(donnees)

export interface EditeurCoursConnecte {
  etat: EtatEditeur
  rendrePage: DocumentPdf['rendrePage']
  onSelectionner(selection: Selection): void
  onOuvrirChoix(emplacement: Emplacement): void
  onAnnulerChoix(): void
  onConfirmer(idQuiz: number | null): void
  onRecharger(): void
}

export function useEditeurCours(idCours: number, options: OptionsEditeurCours = {}): EditeurCoursConnecte {
  // Lues au premier rendu seulement : changer d'API en cours de route relancerait le chargement.
  const [{ api, ouvrirPdf }] = useState(() => ({ api: options.api ?? API_COURS, ouvrirPdf: options.ouvrirPdf ?? ouvrirAvecPdfJs }))
  const [etat, envoyer] = useReducer(reduireEditeur, ETAT_INITIAL)
  const documentPdf = useRef<DocumentPdf | null>(null)
  // Verrou synchrone (D12) : un second clic avant le rendu suivant voit déjà l'insertion en cours.
  const insertionEnCours = useRef(false)
  const annulationInsertion = useRef<AbortController | null>(null)

  const enChargement = etat.nom === 'CHARGEMENT'
  useEffect(() => {
    if (!enChargement) return
    const controleur = new AbortController()
    const { signal } = controleur
    // Rechargement : l'ancien document est fermé (ses miniatures sont déjà démontées).
    void documentPdf.current?.fermer()
    documentPdf.current = null

    void (async () => {
      let promessePdf: Promise<DocumentPdf> | null = null
      try {
        const cours = await api.lireCours(idCours, signal)
        const { idVersion } = cours.version
        promessePdf = api.lireFichierPdf(idCours, idVersion, signal).then(ouvrirPdf)
        const [pages, quiz, pdf] = await Promise.all([
          api.lirePagesInserees(idCours, idVersion, signal),
          api.lireQuizDuCours(idCours, idVersion, signal),
          promessePdf,
        ])
        if (signal.aborted) {
          void pdf.fermer()
          return
        }
        documentPdf.current = pdf
        envoyer({ type: 'CHARGE', cours, nbPages: cours.version.nbPages, pages, quiz })
      } catch (erreur) {
        // Échec d'une autre lecture : le document, s'il s'ouvre quand même, est libéré.
        void promessePdf?.then((pdf) => pdf.fermer(), () => undefined)
        if (signal.aborted) return
        // Réponse mal formée (Error) ou pas de réponse HTTP : `null`, texte provisoire (plan UC3, U4).
        envoyer({ type: 'ECHEC_CHARGEMENT', erreur: erreur instanceof ErreurHttp ? erreur : null })
      }
    })()

    return () => controleur.abort()
  }, [enChargement, idCours, api, ouvrirPdf])

  // Démontage : insertion annulée, document libéré.
  useEffect(() => () => {
    annulationInsertion.current?.abort()
    void documentPdf.current?.fermer()
    documentPdf.current = null
  }, [])

  const rendrePage = useCallback<DocumentPdf['rendrePage']>((numeroPage, canvas, largeur) => {
    const pdf = documentPdf.current
    // Hors PRET et LECTURE_SEULE aucune page n'est affichée : cas de garde seulement.
    if (pdf === null) return { fin: Promise.reject(new Error('Document PDF fermé')), annuler: () => undefined }
    return pdf.rendrePage(numeroPage, canvas, largeur)
  }, [])

  async function confirmer(idQuiz: number | null) {
    const pdf = documentPdf.current
    if (insertionEnCours.current || pdf === null || etat.nom !== 'PRET' || etat.insertion.nom !== 'CHOIX_QUIZ') return
    insertionEnCours.current = true
    const { emplacement } = etat.insertion
    const { idVersion } = etat.cours.version
    const controleur = new AbortController()
    annulationInsertion.current = controleur
    const { signal } = controleur
    envoyer({ type: 'CONFIRMER', idQuiz })

    try {
      const repereTexte = await extraireRepere(pdf, emplacement.numeroPage)
      if (signal.aborted) return
      const resultat = await api.insererPageQuiz(idCours, { idVersion, emplacement, idQuiz, repereTexte }, signal)
      if (resultat.resultat === 'REUSSIE') {
        envoyer({ type: 'INSERTION_REUSSIE', reponse: resultat.reponse })
      } else if (resultat.resultat === 'REFUSEE') {
        envoyer({ type: 'INSERTION_REFUSEE', erreur: resultat.erreur })
      } else {
        // La page a peut-être été créée : relire les pages (boutons toujours désactivés), jamais renvoyer le POST.
        const pages = await api.lirePagesInserees(idCours, idVersion, signal).catch(() => null)
        if (signal.aborted) return
        envoyer({ type: 'ECHEC_RESEAU_INSERTION', pages })
      }
    } catch {
      // Annulation au démontage : rien à afficher. Toute autre exception libère les boutons.
      if (!signal.aborted) envoyer({ type: 'ECHEC_RESEAU_INSERTION', pages: null })
    } finally {
      insertionEnCours.current = false
      annulationInsertion.current = null
    }
  }

  return {
    etat,
    rendrePage,
    onSelectionner: (selection) => envoyer({ type: 'SELECTIONNER', selection }),
    onOuvrirChoix: (emplacement) => envoyer({ type: 'OUVRIR_CHOIX', emplacement }),
    onAnnulerChoix: () => envoyer({ type: 'ANNULER_CHOIX' }),
    onConfirmer: (idQuiz) => void confirmer(idQuiz),
    // Ignoré par le reducer pendant l'envoi (D12) ; sinon l'effet de chargement relit tout (D14).
    onRecharger: () => envoyer({ type: 'RECHARGER' }),
  }
}
