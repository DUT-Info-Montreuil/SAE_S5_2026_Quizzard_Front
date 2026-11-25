import './LogoIut.css'

/** Logo de l'IUT, en en-tête de toutes les pages publiques (charte §4). */
// TODO(UC9): fichier du logo officiel de l'IUT absent du dépôt. Valeur provisoire : reproduction en CSS d'après
// la maquette, à remplacer par le fichier embarqué dans le build (CLAUDE.md, règle 7).
export function LogoIut() {
  return (
    <div className="logo-iut" role="img" aria-label="IUT de Montreuil">
      <span className="logo-iut-sigle" aria-hidden="true">IUT</span>
      <span className="logo-iut-ville" aria-hidden="true">MONTREUIL</span>
    </div>
  )
}
