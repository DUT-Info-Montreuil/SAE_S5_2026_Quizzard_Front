// Libellés de l'édition d'une page de quiz dans E3 (éléments 5 à 18).
// Repris de la maquette (docs/maquettes/Capture d'écran 2026-11-26 102631.png) et de la « Charte Editeur ». Les autres
// sont marqués « provisoire ».
// TODO(UC4): libellés à valider avec l'auteur des UC4, UC5, UC13 et UC14.

import type { TypeEcranIntermediaire, TypeQuestion } from '../domain/questionEditee.ts'

export const LIBELLES_QUIZ = {
  // Barre du quiz (éléments 14 et 17)
  pageQuiz: 'Page quiz',
  entrePages: (avant: number, apres: number) => `entre la page ${avant} et la page ${apres}`,
  avantPage: (apres: number) => `avant la page ${apres}`, // provisoire
  apresPage: (avant: number) => `après la page ${avant}`, // provisoire
  mode: 'Mode',
  nonNote: 'Non noté',
  note: 'Noté',
  coursEnSeance: 'Cours en séance',
  monEcran: 'Mon écran',
  aussiTelephones: 'Aussi sur téléphones',

  // Aperçu (élément 4) et image (élément 18)
  entete: (titreQuiz: string, numero: number, total: number) => `${titreQuiz} · Question ${numero} sur ${total}`,
  enonceVide: 'Énoncé de la question', // provisoire
  duree: (secondes: number) => `${secondes} s`,
  image: 'Image de la question',
  formatsImage: 'PNG, JPEG ou WebP · 2 Mo maximum',
  remplacer: 'Remplacer',
  retirer: 'Retirer',
  bonneReponse: 'Bonne réponse',

  // Question (éléments 5 à 7)
  typeQuestion: 'Type de question',
  types: { QCM: 'QCM', POINTS_A_RELIER: 'Relier', REPONSE_LIBRE: 'Libre' } satisfies Record<TypeQuestion, string>,
  typesLongs: {
    QCM: 'QCM', POINTS_A_RELIER: 'Points à relier', REPONSE_LIBRE: 'Réponse libre',
  } satisfies Record<TypeQuestion, string>,
  enonce: 'Énoncé',
  reponses: 'Réponses',
  proposition: (lettre: string) => `Proposition ${lettre}`,
  marquerBonne: (lettre: string) => `${lettre} est une bonne réponse`,
  ajouterProposition: '+ Proposition', // provisoire
  retirerProposition: (lettre: string) => `Retirer la proposition ${lettre}`, // provisoire
  gauche: (n: number) => `Élément ${n} à gauche`, // provisoire
  droite: (n: number) => `Élément ${n} à droite`, // provisoire
  ajouterPaire: '+ Paire', // provisoire
  retirerPaire: (n: number) => `Retirer la paire ${n}`, // provisoire
  reponseAcceptee: (n: number) => `Réponse acceptée ${n}`, // provisoire
  ajouterReponse: '+ Réponse acceptée', // provisoire
  retirerReponse: (n: number) => `Retirer la réponse acceptée ${n}`, // provisoire

  // Barème (éléments 12 et 8)
  bareme: 'Barème',
  pointsMax: 'Points maximum',
  decroissance: 'Décroissance, moitié des points à la limite',
  pointsPartiels: 'Points partiels',
  dureeMax: 'Durée maximale',

  // Après la question (éléments 15 et 16)
  apresQuestion: 'Après la question',
  manuel: 'Manuel',
  auto: 'Auto',
  ecrans: {
    BONNE_REPONSE: 'Bonne réponse', REPARTITION: 'Répartition', CLASSEMENT: 'Classement',
  } satisfies Record<TypeEcranIntermediaire, string>,
  aLaCloture: 'à la clôture',
  delai: (secondes: number) => `+${secondes} s`,
  desactive: 'désactivé',
  afficherEcran: (ecran: string) => `Afficher l'écran « ${ecran} »`,

  // En-tête (élément 10)
  enregistrer: 'Enregistrer',
  enregistrement: 'Enregistrement…', // provisoire
  nonEnregistre: 'Modifications non enregistrées', // provisoire
}
