import type { ResultatQuestion } from '../domain/question.ts'

interface CarteRangProps {
  resultat: Pick<ResultatQuestion, 'rang' | 'nombreParticipants' | 'evolution'>
}

/** Symbole et texte lu par les lecteurs d'écran : la couleur ne porte jamais seule le sens (charte §1). */
// TODO(UC9): type et sens de `evolution` inconnus (plan UC9, question B10). Valeur provisoire : nombre de places
// gagnées depuis la question précédente (positif = hausse, négatif = baisse, 0 = égalité).
function decrireEvolution(evolution: number) {
  const places = Math.abs(evolution)
  const pluriel = places > 1 ? 's' : ''
  if (evolution > 0) return { sens: 'hausse', symbole: '▲', nombre: places, texte: `${places} place${pluriel} gagnée${pluriel}` }
  if (evolution < 0) return { sens: 'baisse', symbole: '▼', nombre: places, texte: `${places} place${pluriel} perdue${pluriel}` }
  return { sens: 'egalite', symbole: '=', nombre: null, texte: 'Rang inchangé' }
}

/** E9-3 : rang de l'étudiant sur le nombre de participants, et son évolution. Jamais le classement des autres. */
export function CarteRang({ resultat }: CarteRangProps) {
  const { rang, nombreParticipants, evolution } = resultat
  const { sens, symbole, nombre, texte } = decrireEvolution(evolution)

  return (
    // Zone polie : le changement de rang est annoncé sans interrompre (docs/DESIGN.md, accessibilité).
    <section className="carte-rang" aria-live="polite">
      {/* TODO(UC9): libellé absent de la spec (plan UC9, question U3). Repris de la maquette, à valider. */}
      <h2 className="carte-rang-titre">Ton rang</h2>
      <p className="carte-rang-valeur">
        <span className="carte-rang-rang">{rang}</span>
        <span className="carte-rang-total"> / {nombreParticipants}</span>
        <span className="visuellement-cache"> participants</span>
      </p>
      <p className="carte-rang-evolution" data-sens={sens}>
        <span aria-hidden="true">{symbole}{nombre !== null && ` ${nombre}`}</span>
        <span className="visuellement-cache">{texte}</span>
      </p>
    </section>
  )
}
