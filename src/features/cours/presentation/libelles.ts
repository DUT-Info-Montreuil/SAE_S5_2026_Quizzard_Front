// Libellés de l'éditeur E3 absents de la spec (plan UC3, D18).
// TODO(UC3): libellés provisoires, à valider avec l'auteur de l'UC3 (plan UC3, question U2). Regroupés ici pour être
// remplacés en un seul endroit. Les messages d'erreur, eux, viennent de la spec (domain/erreursEditeur.ts).

export const LIBELLES = {
  chargement: 'Chargement de l\'éditeur…',
  recharger: 'Recharger',
  identifiantRequete: 'Identifiant de la requête :',
  version: (numero: number) => `version ${numero}`,
  pagesDuCours: 'Pages du cours',
  page: (position: number) => `Page ${position}`,
  pageQuiz: 'Page de quiz',
  pageClassement: 'Page de classement',
  // Nom de l'élément 3 dans la spec (E3, tableau des éléments) : affiché en infobulle du bouton « + ».
  insererIci: 'Insérer un quiz ici',
  insererAvant: (position: number) => `Insérer un quiz avant la page ${position}`,
  insererApres: (position: number) => `Insérer un quiz après la page ${position}`,
  insertionEnCours: 'Insertion en cours…',
  choixQuizTitre: 'Choisir le quiz',
  choixQuizLegende: 'Quiz de la nouvelle page',
  nouveauQuiz: 'Nouveau quiz',
  inserer: 'Insérer',
  annuler: 'Annuler',
  apercu: 'Aperçu de la page',
  apercuIndisponible: 'Aperçu indisponible.',
  questionAParametrer: 'Question à paramétrer',
  horsPerimetre: (elements: string) => `Éléments ${elements} : hors périmètre UC3`,
  // Retrait et déplacement d'une page de quiz : textes fixés par l'équipe (26/11/2026), absents du cahier des charges.
  retirer: 'Retirer',
  deplacer: 'Déplacer',
  actionsPage: 'Actions sur la page de quiz',
  retraitTitre: 'Retirer cette page de quiz ?',
  retraitTexte: (titreQuiz: string) => `La question reste enregistrée dans le quiz « ${titreQuiz} ».`,
}
