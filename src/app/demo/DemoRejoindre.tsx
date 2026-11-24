// DÉMO de E7 « Rejoindre » (plan UC8, B3 et D17), sans back : http://localhost:5173/demo/rejoindre?cas=…, en
// développement seulement (route absente du build de production). Un sélecteur change le cas affiché.
// `PageRejoindre` tourne avec une fausse API ; un succès mène à /demo/question.

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { ResultatConsultation, ResultatRejoindre } from '../../features/seance/api/rejoindreApi.ts'
import type { ApiRejoindre } from '../../features/seance/application/useRejoindreQuiz.ts'
import type { SessionPublique } from '../../features/seance/domain/ecranRejoindre.ts'
import { PageRejoindre } from '../../features/seance/presentation/PageRejoindre.tsx'
import { ErreurHttp } from '../../shared/http/ErreurHttp.ts'

const CODE_ACCES = 'DEMO42'

const CAS = {
  formulaire: 'Formulaire (succès vers E8)',
  pris: 'Pseudonyme pris, avec proposition',
  doublon: 'Pseudonyme pris, sans proposition',
  note: 'Quiz noté',
  introuvable: 'Quiz inexistant',
  termine: 'Quiz terminé',
  echec: 'Échec du chargement',
  chargement: 'Chargement',
} as const

type Cas = keyof typeof CAS

const SESSION: SessionPublique = { titreCours: 'CM 1 Programmation avancée', titreQuiz: 'Quiz 1', estNotee: false }

const attendre = () => new Promise((fin) => setTimeout(fin, 400))

const refus = (statut: number, code: string, suggestion?: string) =>
  new ErreurHttp(statut, { error: 'Message du back.', request_id: 'demo', code, suggestion })

function creerApi(cas: Cas): ApiRejoindre {
  let essais = 0
  return {
    async consulterSession(): Promise<ResultatConsultation> {
      if (cas === 'chargement') return new Promise(() => {})
      await attendre()
      if (cas === 'introuvable') return { resultat: 'REFUSEE', erreur: refus(404, 'SESSION_INTROUVABLE') }
      if (cas === 'termine') return { resultat: 'REFUSEE', erreur: refus(409, 'SESSION_CLOSE') }
      if (cas === 'echec') return { resultat: 'ECHEC_RESEAU' }
      return { resultat: 'OUVERTE', session: { ...SESSION, estNotee: cas === 'note' } }
    },
    // Premier essai refusé pour « pris » et « doublon », puis succès.
    async rejoindreSession(_code, pseudonyme): Promise<ResultatRejoindre> {
      await attendre()
      essais += 1
      if (essais === 1 && cas === 'pris') {
        return { resultat: 'REFUSEE', erreur: refus(409, 'PSEUDONYME_DEJA_PRIS', `${pseudonyme.trim().slice(0, 19)}2`) }
      }
      if (essais === 1 && cas === 'doublon') return { resultat: 'REFUSEE', erreur: refus(409, 'PSEUDONYME_DEJA_PRIS') }
      return { resultat: 'REJOINT', jeton: 'jeton-demo' }
    },
  }
}

function DemoCas({ cas }: { cas: Cas }) {
  const navigate = useNavigate()
  const [api] = useState(() => creerApi(cas))
  return <PageRejoindre codeAcces={CODE_ACCES} onRejoint={() => navigate('/demo/question', { replace: true })} api={api} />
}

export default function DemoRejoindre() {
  const [parametres, setParametres] = useSearchParams()
  const demande = parametres.get('cas')
  const cas: Cas = demande !== null && Object.hasOwn(CAS, demande) ? demande as Cas : 'formulaire'

  return (
    <>
      <label>
        Cas de démo :{' '}
        <select value={cas} onChange={(evenement) => setParametres({ cas: evenement.target.value })}>
          {Object.entries(CAS).map(([valeur, libelle]) => <option key={valeur} value={valeur}>{libelle}</option>)}
        </select>
      </label>
      {/* `key` : chaque cas repart d'un écran neuf. */}
      <DemoCas key={cas} cas={cas} />
    </>
  )
}
