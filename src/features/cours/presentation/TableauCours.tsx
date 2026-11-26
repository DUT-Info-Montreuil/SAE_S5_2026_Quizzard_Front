import { Link } from 'react-router'
import { Icone } from '../../../shared/ui/Icone.tsx'
import { etatCours, formaterDate, libelleDate, resumeVersion, sigleCours } from '../domain/cours.ts'
import type { CoursListe } from '../domain/cours.ts'

const LIBELLES_ETAT = { PRET: 'Prêt', SANS_QUIZ: 'Sans quiz' } as const

/** E2 : liste des cours de l'enseignant, une carte par ligne (sémantique de tableau conservée). */
export function TableauCours({ cours }: { cours: CoursListe[] }) {
  const maintenant = new Date()
  return (
    <table className="tableau-cours">
      <caption className="visuellement-cache">Vos cours</caption>
      <thead className="visuellement-cache">
        <tr>
          <th scope="col">Cours</th>
          <th scope="col">État</th>
          <th scope="col">Dernière modification</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {cours.map((c) => {
          const etat = etatCours(c)
          return (
            <tr key={c.idCours}>
              <th scope="row">
                <div className="cours-identite">
                  <span className={`pastille pastille-${c.idCours % 4}`} aria-hidden="true">{sigleCours(c.titre)}</span>
                  <span className="cours-textes">
                    <span className="cours-titre">{c.titre}</span>
                    <span className="cours-resume">{resumeVersion(c)}</span>
                  </span>
                </div>
              </th>
              <td>
                <span className={`etiquette etiquette-${etat === 'PRET' ? 'prete' : 'sans-quiz'}`}>
                  {LIBELLES_ETAT[etat]}
                </span>
              </td>
              <td className="cours-date" title={formaterDate(c.dateModification)}>{libelleDate(c, maintenant)}</td>
              <td>
                <div className="boutons boutons-cours">
                  {/* TODO(UC6): import d'une nouvelle version du PDF. */}
                  <button type="button" className="bouton bouton-secondaire" disabled title="À venir (UC6)">
                    <Icone nom="document" /> Nouvelle version
                  </button>
                  <Link
                    className="bouton bouton-secondaire"
                    to={`/cours/${c.idCours}/resultats`}
                    aria-label={`Résultats de ${c.titre}`}
                  >
                    <Icone nom="personnes" /> Résultats
                  </Link>
                  <Link className="bouton bouton-structure" to={`/cours/${c.idCours}`} aria-label={`Ouvrir ${c.titre}`}>
                    Ouvrir <Icone nom="ouvrir" />
                  </Link>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
