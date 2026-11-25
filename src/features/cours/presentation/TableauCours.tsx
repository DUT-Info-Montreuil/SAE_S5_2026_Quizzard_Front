import { Link } from 'react-router'
import { formaterDate } from '../domain/cours.ts'
import type { Cours } from '../domain/cours.ts'

/** E2 : tableau des cours de l'enseignant. */
export function TableauCours({ cours }: { cours: Cours[] }) {
  return (
    <div className="carte tableau-cours">
      <table>
        <thead>
          <tr>
            <th scope="col">Cours</th>
            <th scope="col">Version</th>
            <th scope="col">Pages</th>
            <th scope="col">Quiz</th>
            <th scope="col">Dernière modification</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {cours.map((c) => (
            <tr key={c.idCours}>
              <th scope="row">{c.titre}</th>
              <td>v{c.numeroVersion}</td>
              <td>{c.nbPages}</td>
              <td>{c.nbQuiz}</td>
              <td>{formaterDate(c.dateModification)}</td>
              <td>
                <div className="boutons">
                  <Link className="lien" to={`/cours/${c.idCours}`} aria-label={`Ouvrir ${c.titre}`}>Ouvrir</Link>
                  {/* TODO(UC6): import d'une nouvelle version du PDF. */}
                  <button type="button" className="lien" disabled title="À venir (UC6)">Nouvelle version</button>
                  <Link className="lien" to={`/cours/${c.idCours}/resultats`} aria-label={`Résultats de ${c.titre}`}>
                    Résultats
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
