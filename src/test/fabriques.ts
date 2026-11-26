// Données de test de l'UC9, communes à plusieurs fichiers de test.
import type { QuestionARelier, QuestionLibre, QuestionQcm } from '../features/seance/domain/question.ts'

export function questionQcm(remplacements: Partial<QuestionQcm> = {}): QuestionQcm {
  return {
    idQuestion: 1,
    position: 1,
    type: 'QCM',
    enonce: 'Quelle structure garantit un accès en O(1) en moyenne ?',
    propositions: [
      { idProposition: 11, libelle: 'Liste chaînée' },
      { idProposition: 12, libelle: 'Table de hachage' },
      { idProposition: 13, libelle: 'Arbre binaire' },
      { idProposition: 14, libelle: 'Tableau trié' },
    ],
    dureeSec: 20,
    echeance: '2026-11-23T10:00:20Z',
    ...remplacements,
  }
}

export function questionARelier(remplacements: Partial<QuestionARelier> = {}): QuestionARelier {
  return {
    idQuestion: 2,
    position: 2,
    type: 'POINTS_A_RELIER',
    enonce: 'Relie chaque langage à son paradigme.',
    elementsGauche: [{ id: 1, libelle: 'Haskell' }, { id: 2, libelle: 'Java' }],
    elementsDroite: [{ id: 101, libelle: 'Fonctionnel' }, { id: 102, libelle: 'Objet' }],
    dureeSec: 30,
    echeance: '2026-11-23T10:00:30Z',
    ...remplacements,
  }
}

export function questionLibre(remplacements: Partial<QuestionLibre> = {}): QuestionLibre {
  return {
    idQuestion: 3,
    position: 3,
    type: 'REPONSE_LIBRE',
    enonce: 'Que signifie le sigle HTTP ?',
    dureeSec: 40,
    echeance: '2026-11-23T10:00:40Z',
    ...remplacements,
  }
}
