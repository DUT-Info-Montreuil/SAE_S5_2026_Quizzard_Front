import type { ReactNode } from 'react'
import { LogoIut } from '../../../shared/ui/LogoIut.tsx'
import type { Cours } from '../domain/cours.ts'
import { LIBELLES } from './libelles.ts'

/**
 * En-tête de E3 : titre et version du cours (élément 1, lecture seule) et, à droite, les éléments 9 à 11 fournis par
 * l'assemblage (`app`) : « Réappliquer les quiz » (UC6), « Enregistrer », « Lancer » (UC7). Sans eux : emplacement vide.
 */
export function EnteteEditeur({ cours, actions }: { cours: Cours, actions?: ReactNode }) {
  return (
    <header className="entete-editeur">
      <LogoIut />
      <h1 className="entete-editeur-titre">{cours.titre}</h1>
      <span className="entete-editeur-version">{LIBELLES.version(cours.version.numero)}</span>
      {actions === undefined
        ? <div className="hors-perimetre entete-editeur-actions">{LIBELLES.horsPerimetre('9 à 11')}</div>
        : <div className="entete-editeur-actions">{actions}</div>}
    </header>
  )
}
