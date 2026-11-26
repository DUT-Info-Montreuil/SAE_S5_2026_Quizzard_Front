import { useEffect, useState } from 'react'
import type { Emplacement } from '../domain/cours.ts'
import { ERREURS_INSERTION } from '../domain/erreursEditeur.ts'
import { insertionPossible } from '../domain/machineEditeur.ts'
import type { EtatEditeur, Selection } from '../domain/machineEditeur.ts'
import { ApercuPage } from './ApercuPage.tsx'
import { BandeauErreur } from './BandeauErreur.tsx'
import { DialogueChoixQuiz } from './DialogueChoixQuiz.tsx'
import './EditeurCours.css'
import { EnteteEditeur } from './EnteteEditeur.tsx'
import { LIBELLES } from './libelles.ts'
import { ListePages } from './ListePages.tsx'
import type { RendrePage } from './RenduPdf.tsx'

interface Props {
  etat: EtatEditeur
  rendrePage: RendrePage
  /**
   * Titre du quiz de chaque page de quiz connue, par `idPage`.
   * TODO(UC3): la liste des pages du back ne donne pas le quiz d'une page (plan UC3, Q5). Valeur provisoire : titres
   * fournis par l'appelant (pages insérées dans l'éditeur) ; sans titre, la page affiche seulement « Page de quiz ».
   */
  titresQuiz?: ReadonlyMap<number, string>
  onSelectionner(selection: Selection): void
  onOuvrirChoix(emplacement: Emplacement): void
  onAnnulerChoix(): void
  /** `idQuiz` null : « Nouveau quiz ». */
  onConfirmer(idQuiz: number | null): void
  onRecharger(): void
}

const AUCUN_TITRE: ReadonlyMap<number, string> = new Map()

/**
 * Écran E3 « Éditeur cours + quiz », périmètre UC3 (éléments 1 à 4) : composant de présentation, l'état vient du
 * reducer du domaine (`reduireEditeur`) et chaque action remonte par une prop. Éléments 5 à 18 : emplacement vide.
 */
export function EditeurCours(props: Props) {
  const { etat, rendrePage, titresQuiz = AUCUN_TITRE } = props
  // Bouton « Insérer un quiz ici » cliqué : il reprend le focus quand l'insertion se termine (annulée, réussie ou
  // refusée), une fois les boutons réactivés ; pendant l'envoi il est désactivé et ne peut pas le recevoir.
  const [boutonOuvrant, setBoutonOuvrant] = useState<HTMLElement | null>(null)
  const nomInsertion = etat.nom === 'PRET' ? etat.insertion.nom : null
  useEffect(() => {
    if (nomInsertion === 'AUCUNE' && boutonOuvrant?.isConnected) boutonOuvrant.focus()
  }, [nomInsertion, boutonOuvrant])

  if (etat.nom === 'CONNEXION') return null // le hook redirige vers l'écran de connexion (plan UC3, D5)
  if (etat.nom === 'CHARGEMENT') {
    return <main className="editeur-cours editeur-cours-attente"><p role="status">{LIBELLES.chargement}</p></main>
  }
  if (etat.nom === 'ERREUR_CHARGEMENT') {
    return (
      <main className="editeur-cours editeur-cours-attente">
        <BandeauErreur erreur={etat.erreur} requestId={etat.erreur.requestId} onRecharger={props.onRecharger} />
      </main>
    )
  }

  const pret = etat.nom === 'PRET' ? etat : null
  const envoi = pret?.insertion.nom === 'ENVOI'

  return (
    <div className="editeur-cours">
      <EnteteEditeur cours={etat.cours} />
      {etat.nom === 'LECTURE_SEULE' && (
        // TODO(UC3): texte du mode lecture seule absent de la spec. Valeur provisoire : message de COURS_ARCHIVE.
        <p className="bandeau-lecture-seule">{ERREURS_INSERTION.COURS_ARCHIVE.message}</p>
      )}
      {pret?.erreur && <BandeauErreur erreur={pret.erreur} onRecharger={props.onRecharger} />}
      <p className="statut-insertion" role="status">{envoi ? LIBELLES.insertionEnCours : ''}</p>
      <main className="editeur-cours-corps">
        <ApercuPage nbPages={etat.nbPages} pages={etat.pages} selection={etat.selection} rendrePage={rendrePage} />
        <aside className="hors-perimetre editeur-cours-question">{LIBELLES.horsPerimetre('5 à 8 et 12 à 18')}</aside>
      </main>
      <ListePages
        nbPages={etat.nbPages}
        pages={etat.pages}
        selection={etat.selection}
        titresQuiz={titresQuiz}
        rendrePage={rendrePage}
        insertionAffichee={pret !== null}
        insertionDesactivee={!insertionPossible(etat)}
        onSelectionner={props.onSelectionner}
        onInserer={(emplacement, bouton) => {
          setBoutonOuvrant(bouton)
          props.onOuvrirChoix(emplacement)
        }}
      />
      {pret?.insertion.nom === 'CHOIX_QUIZ' && (
        <DialogueChoixQuiz
          quiz={pret.quiz}
          idQuizPropose={pret.insertion.idQuizPropose}
          onConfirmer={props.onConfirmer}
          onAnnuler={props.onAnnulerChoix}
        />
      )}
    </div>
  )
}
