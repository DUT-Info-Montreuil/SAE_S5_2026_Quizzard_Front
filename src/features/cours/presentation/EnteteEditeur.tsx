import { LogoIut } from '../../../shared/ui/LogoIut.tsx'
import type { Cours } from '../domain/cours.ts'
import { LIBELLES } from './libelles.ts'

/** En-tête de E3 : titre et version du cours (élément 1, lecture seule) ; emplacement vide des éléments 9 à 11. */
export function EnteteEditeur({ cours }: { cours: Cours }) {
  return (
    <header className="entete-editeur">
      <LogoIut />
      <h1 className="entete-editeur-titre">{cours.titre}</h1>
      <span className="entete-editeur-version">{LIBELLES.version(cours.version.numero)}</span>
      <div className="hors-perimetre entete-editeur-actions">{LIBELLES.horsPerimetre('9 à 11')}</div>
    </header>
  )
}
