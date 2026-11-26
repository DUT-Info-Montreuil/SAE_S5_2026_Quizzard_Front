// Parcours de l'éditeur E3 (plan UC3, §6, D9, D10, D12, D14, D15 ; UC3, diagramme d'activité, étapes 3, 4, 19 et 21).
// Fausse API (aucun serveur) et faux document PDF (PDF.js ne tourne pas sous jsdom).
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErreurHttp } from '../../../shared/http/ErreurHttp.ts'
import { fauxDocumentPdf, installerFauxNavigateur } from '../../../test/fauxNavigateur.ts'
import type { Cours, PageInseree, PageQuizInseree } from '../domain/cours.ts'
import { EditeurCours } from '../presentation/EditeurCours.tsx'
import { useEditeurCours } from './useEditeurCours.ts'
import type { ApiEditeurCours, EditeurCoursConnecte } from './useEditeurCours.ts'

const COURS: Cours = { idCours: 7, titre: 'Réseaux', archive: false, version: { idVersion: 3, numero: 2, nbPages: 12 } }
const PAGES: PageInseree[] = [{ idPage: 1, numeroPage: 2, ordre: 0, type: 'QUIZ', titreQuiz: 'Quiz 1' }]
const QUIZ = [{ idQuiz: 40, titre: 'Quiz 1' }]
const EMPLACEMENT = { numeroPage: 4, ordre: 0 }

const REPONSE: PageQuizInseree = {
  idPage: 2,
  idQuiz: 42,
  titreQuiz: 'Quiz 2',
  quizCree: true,
  idQuestion: 90,
  numeroPage: 4,
  ordre: 0,
  pages: [...PAGES, { idPage: 2, numeroPage: 4, ordre: 0, type: 'QUIZ', titreQuiz: 'Quiz 2' }],
}

function fausseApi(surcharge: Partial<FausseApi> = {}): FausseApi {
  return { ...apiParDefaut(), ...surcharge }
}

type FausseApi = ReturnType<typeof apiParDefaut>

function apiParDefaut() {
  return {
    lireCours: vi.fn<ApiEditeurCours['lireCours']>(async () => COURS),
    lirePagesInserees: vi.fn<ApiEditeurCours['lirePagesInserees']>(async () => PAGES),
    lireQuizDuCours: vi.fn<ApiEditeurCours['lireQuizDuCours']>(async () => QUIZ),
    lireFichierPdf: vi.fn<ApiEditeurCours['lireFichierPdf']>(async () => new ArrayBuffer(8)),
    insererPageQuiz: vi.fn<ApiEditeurCours['insererPageQuiz']>(async () => ({ resultat: 'REUSSIE', reponse: REPONSE })),
    retirerPage: vi.fn<ApiEditeurCours['retirerPage']>(async () => ({ resultat: 'REUSSIE', pages: null })),
    deplacerPage: vi.fn<ApiEditeurCours['deplacerPage']>(async () => ({ resultat: 'REUSSIE', pages: [] })),
  }
}

function monter(api = fausseApi(), document = fauxDocumentPdf(12, async () => 'Texte de la page 4')) {
  const ouvrirPdf = vi.fn(async () => document)
  const vue = renderHook(() => useEditeurCours(7, { api, ouvrirPdf }))
  return { api, document, ouvrirPdf, vue, editeur: () => vue.result.current }
}

async function attendrePret(editeur: () => EditeurCoursConnecte) {
  await waitFor(() => expect(editeur().etat.nom).toBe('PRET'))
}

/** Ouvre le dialogue puis confirme ; attend la fin de l'envoi. */
async function inserer(editeur: () => EditeurCoursConnecte, idQuiz: number | null = 40) {
  act(() => editeur().onOuvrirChoix(EMPLACEMENT))
  act(() => editeur().onConfirmer(idQuiz))
  await waitFor(() => {
    const etat = editeur().etat
    expect(etat.nom !== 'PRET' || etat.insertion.nom === 'AUCUNE').toBe(true)
  })
}

const donnees = (editeur: () => EditeurCoursConnecte) => {
  const etat = editeur().etat
  if (etat.nom !== 'PRET') throw new Error(`état PRET attendu, obtenu ${etat.nom}`)
  return etat
}

beforeEach(() => {
  installerFauxNavigateur()
})

describe('chargement', () => {
  it('cours, pages, quiz et PDF lus → PRET, page 1 sélectionnée ; document fermé au démontage', async () => {
    const { api, document, editeur, vue } = monter()
    expect(editeur().etat.nom).toBe('CHARGEMENT')
    await attendrePret(editeur)
    expect(api.lirePagesInserees).toHaveBeenCalledWith(7, 3, expect.any(AbortSignal))
    expect(donnees(editeur)).toMatchObject({ nbPages: 12, pages: PAGES, quiz: QUIZ, selection: { genre: 'PAGE_PDF', numeroPage: 1 } })
    vue.unmount()
    expect(document.fermer).toHaveBeenCalledOnce()
  })

  it('nombre de pages : `nbPages` de la version (validé par le back), pas `numPages` du PDF (D8)', async () => {
    const { editeur } = monter(fausseApi(), fauxDocumentPdf(13, async () => ''))
    await attendrePret(editeur)
    expect(donnees(editeur).nbPages).toBe(12)
  })

  it('« Recharger » : relit cours, pages, quiz et PDF, ferme l\'ancien document', async () => {
    const { api, document, ouvrirPdf, editeur } = monter()
    await attendrePret(editeur)
    act(() => editeur().onRecharger())
    expect(editeur().etat.nom).toBe('CHARGEMENT')
    await attendrePret(editeur)
    expect(document.fermer).toHaveBeenCalledOnce()
    for (const lecture of [api.lireCours, api.lirePagesInserees, api.lireQuizDuCours, api.lireFichierPdf, ouvrirPdf]) {
      expect(lecture).toHaveBeenCalledTimes(2)
    }
  })
})

describe('insertion', () => {
  it('201 : liste remplacée par la réponse, nouvelle page sélectionnée, quiz créé ajouté à la liste des quiz', async () => {
    const { api, editeur } = monter()
    await attendrePret(editeur)
    await inserer(editeur, null)

    expect(api.insererPageQuiz).toHaveBeenCalledOnce()
    const etat = donnees(editeur)
    expect(etat.pages).toEqual(REPONSE.pages)
    expect(etat.selection).toEqual({ genre: 'PAGE_INSEREE', idPage: 2, titreQuiz: 'Quiz 2' })
    expect(etat.quiz).toEqual([...QUIZ, { idQuiz: 42, titre: 'Quiz 2' }])
  })

  it('201 sans quizCree : liste des quiz inchangée', async () => {
    const reponse = { ...REPONSE, idQuiz: 40, titreQuiz: 'Quiz 1', quizCree: false }
    const { editeur } = monter(fausseApi({ insererPageQuiz: vi.fn<ApiEditeurCours['insererPageQuiz']>(async () => ({ resultat: 'REUSSIE', reponse })) }))
    await attendrePret(editeur)
    await inserer(editeur, 40)
    expect(donnees(editeur).quiz).toEqual(QUIZ)
  })

  it('requête : emplacement choisi, quiz choisi, repère extrait de la page numeroPage', async () => {
    const { api, document, editeur } = monter()
    await attendrePret(editeur)
    await inserer(editeur, 40)
    expect(document.lireTextePage).toHaveBeenCalledWith(4)
    expect(api.insererPageQuiz).toHaveBeenCalledWith(
      7,
      { idVersion: 3, emplacement: EMPLACEMENT, idQuiz: 40, repereTexte: 'Texte de la page 4' },
      expect.any(AbortSignal),
    )
  })

  it('double confirmation avant le rendu suivant : une seule requête (verrou synchrone, D12)', async () => {
    const { api, editeur } = monter()
    await attendrePret(editeur)
    act(() => editeur().onOuvrirChoix(EMPLACEMENT))
    act(() => {
      const { onConfirmer } = editeur()
      onConfirmer(40)
      onConfirmer(40)
    })
    await waitFor(() => expect(donnees(editeur).insertion.nom).toBe('AUCUNE'))
    expect(api.insererPageQuiz).toHaveBeenCalledOnce()
  })

  it('extraction du repère en échec : requête envoyée sans repereTexte', async () => {
    const document = fauxDocumentPdf(12, async () => {
      throw new Error('texte illisible')
    })
    const { api, editeur } = monter(fausseApi(), document)
    await attendrePret(editeur)
    await inserer(editeur)
    expect(api.insererPageQuiz).toHaveBeenCalledOnce()
    expect(api.insererPageQuiz.mock.calls[0][1].repereTexte).toBeUndefined()
  })

  it('panne réseau : pages relues, liste remplacée, message et « Recharger », aucun renvoi automatique', async () => {
    const relues: PageInseree[] = REPONSE.pages
    const api = fausseApi({ insererPageQuiz: vi.fn<ApiEditeurCours['insererPageQuiz']>(async () => ({ resultat: 'ECHEC_RESEAU' })) })
    const { editeur } = monter(api)
    await attendrePret(editeur)
    api.lirePagesInserees.mockResolvedValueOnce(relues)
    await inserer(editeur)

    expect(api.lirePagesInserees).toHaveBeenCalledTimes(2) // chargement, puis relecture
    const etat = donnees(editeur)
    expect(etat.pages).toEqual(relues)
    expect(etat.erreur).toMatchObject({ message: 'L\'insertion a échoué, réessayez.', action: 'RECHARGER' })
    await new Promise((fin) => setTimeout(fin, 20))
    expect(api.insererPageQuiz).toHaveBeenCalledOnce()
  })

  it('401 à l\'insertion : état CONNEXION (redirection par l\'écran, D5)', async () => {
    const erreur = new ErreurHttp(401, { error: 'Non authentifié', request_id: 'r' })
    const { editeur } = monter(fausseApi({ insererPageQuiz: vi.fn<ApiEditeurCours['insererPageQuiz']>(async () => ({ resultat: 'REFUSEE', erreur })) }))
    await attendrePret(editeur)
    await inserer(editeur)
    expect(editeur().etat).toEqual({ nom: 'CONNEXION' })
  })
})

describe('parcours dans l\'écran E3', () => {
  function Ecran({ api, document }: { api: ApiEditeurCours, document: ReturnType<typeof fauxDocumentPdf> }) {
    const editeur = useEditeurCours(7, { api, ouvrirPdf: async () => document })
    return <EditeurCours {...editeur} />
  }

  it('double clic sur « Insérer » : une seule requête ; boutons désactivés pendant l\'envoi ; nouvelle page sélectionnée', async () => {
    let terminer: () => void = () => undefined
    const api = fausseApi({
      insererPageQuiz: vi.fn<ApiEditeurCours['insererPageQuiz']>(() => new Promise((fin) => {
        terminer = () => fin({ resultat: 'REUSSIE', reponse: REPONSE })
      })),
    })
    render(<Ecran api={api} document={fauxDocumentPdf(12)} />)
    const boutons = await screen.findAllByRole('button', { name: /^Insérer un quiz/ })
    await userEvent.click(boutons[0])
    const dialogue = screen.getByRole('dialog', { hidden: true })
    await userEvent.dblClick(within(dialogue).getByRole('button', { name: 'Insérer', hidden: true }))

    await waitFor(() => expect(api.insererPageQuiz).toHaveBeenCalledOnce())
    for (const b of screen.getAllByRole('button', { name: /^Insérer un quiz/ })) expect(b).toBeDisabled()

    await act(async () => terminer())
    expect(api.insererPageQuiz).toHaveBeenCalledOnce()
    expect(screen.getByRole('region', { name: 'Aperçu de la page' })).toHaveTextContent('Question à paramétrer')
    for (const b of screen.getAllByRole('button', { name: /^Insérer un quiz/ })) expect(b).toBeEnabled()
  })
})

describe('retrait et déplacement', () => {
  const choisirPageQuiz = (editeur: () => EditeurCoursConnecte) =>
    act(() => editeur().onSelectionner({ genre: 'PAGE_INSEREE', idPage: 1, titreQuiz: 'Quiz 1' }))

  it('retrait confirmé : DELETE de la page, pages relues, page du PDF qui précédait sélectionnée', async () => {
    const { api, editeur } = monter()
    await attendrePret(editeur)
    choisirPageQuiz(editeur)
    act(() => editeur().onDemanderRetrait())
    api.lirePagesInserees.mockResolvedValueOnce([])
    act(() => editeur().onConfirmerRetrait())
    await waitFor(() => expect(donnees(editeur).insertion.nom).toBe('AUCUNE'))

    expect(api.retirerPage).toHaveBeenCalledWith(1, expect.any(AbortSignal))
    expect(api.lirePagesInserees).toHaveBeenCalledTimes(2) // chargement, puis relecture après le 204
    expect(donnees(editeur)).toMatchObject({ pages: [], selection: { genre: 'PAGE_PDF', numeroPage: 2 } })
  })

  it('déplacement vers « après la page 4 » : PATCH (4, 0), pages de la réponse', async () => {
    const deplacees: PageInseree[] = [{ idPage: 1, numeroPage: 4, ordre: 0, type: 'QUIZ', titreQuiz: 'Quiz 1' }]
    const api = fausseApi({
      deplacerPage: vi.fn<ApiEditeurCours['deplacerPage']>(async () => ({ resultat: 'REUSSIE', pages: deplacees })),
    })
    const { editeur } = monter(api)
    await attendrePret(editeur)
    choisirPageQuiz(editeur)
    act(() => editeur().onDemanderDeplacement())
    act(() => editeur().onDeplacerVers({ numeroPage: 4, ordre: 0 }))
    await waitFor(() => expect(donnees(editeur).insertion.nom).toBe('AUCUNE'))

    expect(api.deplacerPage).toHaveBeenCalledWith(1, { numeroPage: 4, ordre: 0 }, expect.any(AbortSignal))
    expect(donnees(editeur).pages).toEqual(deplacees)
  })

  it('espace juste avant ou après la page : aucune requête, sortie du choix', async () => {
    const { api, editeur } = monter()
    await attendrePret(editeur)
    choisirPageQuiz(editeur)
    act(() => editeur().onDemanderDeplacement())
    act(() => editeur().onDeplacerVers({ numeroPage: 2, ordre: 1 }))
    expect(donnees(editeur).insertion.nom).toBe('AUCUNE')
    expect(api.deplacerPage).not.toHaveBeenCalled()
  })
})
