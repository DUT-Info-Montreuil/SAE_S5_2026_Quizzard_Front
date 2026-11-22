// DÉMO TEMPORAIRE de l'écran E9 (plan UC9, B5), sans back : http://localhost:5173/?demo=e9 en développement.
// Pour la supprimer : effacer le dossier src/app/demo/ et le bloc « démo » de src/app/main.tsx.
// Les erreurs passent par `lireErreurEnvoi` du domaine : messages exacts du tableau des erreurs.

import { useState } from 'react'
import { lireErreurEnvoi } from '../../features/seance/domain/erreursReponse.ts'
import type { ErreurEnvoi } from '../../features/seance/domain/erreursReponse.ts'
import type { ResultatQuestion } from '../../features/seance/domain/question.ts'
import { EcranResultat } from '../../features/seance/presentation/EcranResultat.tsx'
import type { EcranE9 } from '../../features/seance/presentation/EcranResultat.tsx'
import './DemoE8.css'

function refusee(erreur: ErreurEnvoi): EcranE9 {
  return { nom: 'REFUSEE', idQuestion: 1, erreur: lireErreurEnvoi(erreur, false) }
}

const RESULTAT: ResultatQuestion = { points: 1420, scoreTotal: 4102, rang: 4, nombreParticipants: 32, evolution: 3 }

const ETATS: { nom: string, ecran: EcranE9 }[] = [
  { nom: 'E9-1 Réponse enregistrée', ecran: { nom: 'CONFIRMEE', idQuestion: 1 } },
  { nom: 'Temps écoulé sans réponse', ecran: { nom: 'TEMPS_ECOULE', idQuestion: 1 } },
  { nom: 'Erreur : HORS_DELAI', ecran: refusee({ statut: 409, code: 'HORS_DELAI', error: null }) },
  { nom: 'Erreur : QUESTION_CLOSE', ecran: refusee({ statut: 409, code: 'QUESTION_CLOSE', error: null }) },
  { nom: 'Erreur : DEJA_REPONDU', ecran: refusee({ statut: 409, code: 'DEJA_REPONDU', error: null }) },
  { nom: 'Erreur : 422 avec t = 0', ecran: refusee({ statut: 422, error: null }) },
  { nom: 'Erreur : 500 avec t = 0', ecran: refusee({ statut: 500, error: null }) },
  { nom: 'Erreur : 409 sans code ni message', ecran: refusee({ statut: 409, error: null }) },
  {
    nom: 'Session expirée (401, Rejoindre)',
    ecran: { nom: 'SESSION_EXPIREE', erreur: lireErreurEnvoi({ statut: 401, error: null }, true) },
  },
  {
    nom: 'Requête invalide (400, Recharger)',
    ecran: refusee({ statut: 400, error: 'Requête invalide (message du back)' }),
  },
  { nom: 'E9-2/E9-3 Résultat, hausse', ecran: { nom: 'RESULTAT', resultat: RESULTAT } },
  {
    nom: 'Résultat, baisse, avec bonne réponse',
    ecran: {
      nom: 'RESULTAT',
      resultat: { ...RESULTAT, points: 0, rang: 6, evolution: -2, bonneReponse: ['Table de hachage'] },
    },
  },
  {
    nom: 'Résultat, égalité, 1 place',
    ecran: { nom: 'RESULTAT', resultat: { ...RESULTAT, points: 800, rang: 1, nombreParticipants: 1, evolution: 0 } },
  },
  { nom: 'E9-4 Attente', ecran: { nom: 'ATTENTE' } },
  { nom: 'Séance close', ecran: { nom: 'SEANCE_CLOSE' } },
]

export default function DemoE9() {
  const [indice, setIndice] = useState(0)
  const [journal, setJournal] = useState('')

  return (
    <>
      <EcranResultat
        ecran={ETATS[indice].ecran}
        onRejoindre={() => setJournal('Rejoindre : retour simulé vers E7')}
        onRecharger={() => setJournal('Recharger : rechargement simulé')}
      />
      <aside className="demo-e8" aria-label="Commandes de la démo">
        <p className="demo-e8-titre">Démo E9 (temporaire, sans back)</p>
        <label>
          État{' '}
          <select
            value={indice}
            onChange={(e) => {
              setIndice(Number(e.target.value))
              setJournal('')
            }}
          >
            {ETATS.map((etat, i) => <option key={etat.nom} value={i}>{etat.nom}</option>)}
          </select>
        </label>
        {journal && <p className="demo-e8-journal">{journal}</p>}
      </aside>
    </>
  )
}
