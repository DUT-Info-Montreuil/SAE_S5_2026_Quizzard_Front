import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Emplacement } from '../domain/cours.ts'
import { ERREURS_INSERTION } from '../domain/erreursEditeur.ts'
import { emplacementsActifs, insertionPossible } from '../domain/machineEditeur.ts'
import type { EtatEditeur, Selection } from '../domain/machineEditeur.ts'
import { ApercuPage } from './ApercuPage.tsx'
import { BandeauErreur } from './BandeauErreur.tsx'
import { DialogueChoixQuiz } from './DialogueChoixQuiz.tsx'
import { DialogueConfirmationRetrait } from './DialogueConfirmationRetrait.tsx'
import './EditeurCours.css'
import { EnteteEditeur } from './EnteteEditeur.tsx'
import { LIBELLES } from './libelles.ts'
import { ListePages } from './ListePages.tsx'
import type { RendrePage } from './RenduPdf.tsx'

interface Props {
  etat: EtatEditeur
  rendrePage: RendrePage
  onSelectionner(selection: Selection): void
  onOuvrirChoix(emplacement: Emplacement): void
  onAnnulerChoix(): void
  /** `idQuiz` null : « Nouveau quiz ». */
  onConfirmer(idQuiz: number | null): void
  onRecharger(): void
  onDemanderRetrait(): void
  onConfirmerRetrait(): void
  onDemanderDeplacement(): void
  /** Bouton « Insérer un quiz ici » choisi pendant un déplacement. */
  onDeplacerVers(emplacement: Emplacement): void
  /**
   * Éléments fournis par l'assemblage (`app`), une feature n'importe pas l'autre (CLAUDE.md, règle 1) :
   * - `actionsEntete` : éléments 9 à 11 de l'en-tête ;
   * - `barreQuiz`, `apercuQuiz`, `panneau` : page de quiz sélectionnée (éléments 4 à 8 et 12 à 18).
   * Absents : emplacements vides « hors périmètre », comme pour l'UC3.
   */
  actionsEntete?: ReactNode
  barreQuiz?: ReactNode
  apercuQuiz?: ReactNode
  panneau?: ReactNode
  /** Détail des pages insérées dans la bande des pages, par `idPage` (« QCM · 30 s »). */
  detailsPages?: ReadonlyMap<number, string>
}

/**
 * Écran E3 « Éditeur cours + quiz », périmètre UC3 (éléments 1 à 4) : composant de présentation, l'état vient du
 * reducer du domaine (`reduireEditeur`) et chaque action remonte par une prop. Éléments 5 à 18 : emplacement vide.
 */
export function EditeurCours(props: Props) {
  const { etat, rendrePage } = props
  // Bouton « Insérer un quiz ici », « Retirer » ou « Déplacer » cliqué : il reprend le focus quand l'opération se
  // termine (annulée, réussie ou refusée), une fois les boutons réactivés ; pendant l'envoi il est désactivé et ne
  // peut pas le recevoir. Disparu (page retirée) : le focus n'est pas déplacé.
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
  const deplacementEnCours = pret?.insertion.nom === 'CHOIX_DEPLACEMENT'

  return (
    <div className="editeur-cours">
      <EnteteEditeur cours={etat.cours} actions={props.actionsEntete} />
      {etat.nom === 'LECTURE_SEULE' && (
        // TODO(UC3): texte du mode lecture seule absent de la spec. Valeur provisoire : message de COURS_ARCHIVE.
        <p className="bandeau-lecture-seule">{ERREURS_INSERTION.COURS_ARCHIVE.message}</p>
      )}
      {pret?.erreur && <BandeauErreur erreur={pret.erreur} onRecharger={props.onRecharger} />}
      <p className="statut-insertion" role="status">{envoi ? LIBELLES.insertionEnCours : ''}</p>
      <main className="editeur-cours-corps">
        <div className="editeur-cours-centre">
          {props.barreQuiz}
          <ApercuPage
            nbPages={etat.nbPages}
            pages={etat.pages}
            selection={etat.selection}
            rendrePage={rendrePage}
            apercuQuiz={props.apercuQuiz}
            actions={pret === null ? undefined : {
              desactivees: !insertionPossible(etat),
              deplacementEnCours,
              onRetirer: (bouton) => {
                setBoutonOuvrant(bouton)
                props.onDemanderRetrait()
              },
              onDeplacer: (bouton) => {
                setBoutonOuvrant(bouton)
                props.onDemanderDeplacement()
              },
              onAnnulerDeplacement: props.onAnnulerChoix,
            }}
          />
        </div>
        {props.panneau === undefined
          ? <aside className="hors-perimetre editeur-cours-question">{LIBELLES.horsPerimetre('5 à 8 et 12 à 18')}</aside>
          : <aside className="editeur-cours-panneau">{props.panneau}</aside>}
      </main>
      <ListePages
        nbPages={etat.nbPages}
        pages={etat.pages}
        selection={etat.selection}
        detailsPages={props.detailsPages}
        rendrePage={rendrePage}
        insertionAffichee={pret !== null}
        insertionDesactivee={!emplacementsActifs(etat)}
        onSelectionner={props.onSelectionner}
        onInserer={(emplacement, bouton) => {
          // Déplacement : le focus reviendra au bouton « Déplacer », toujours affiché.
          if (deplacementEnCours) return props.onDeplacerVers(emplacement)
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
      {pret?.insertion.nom === 'CONFIRMATION_RETRAIT' && (
        <DialogueConfirmationRetrait
          titreQuiz={pret.insertion.page.titreQuiz ?? ''}
          onConfirmer={props.onConfirmerRetrait}
          onAnnuler={props.onAnnulerChoix}
        />
      )}
    </div>
  )
}
