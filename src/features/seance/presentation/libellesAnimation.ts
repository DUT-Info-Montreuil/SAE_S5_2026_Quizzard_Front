// Libellés du lancement (E3, élément 11) et de l'écran projeté E5 (UC7).
// Repris de la spec quand elle les donne : « Lancer la présentation » (UC7, E3 élément 11), « Clore » et « Suivant »
// (docs/DESIGN.md, E5). Les autres sont absents de la spec et du cahier des charges.
// TODO(UC7): libellés provisoires, à valider (plan UC7, question U1). Regroupés ici pour être remplacés en un seul
// endroit. Les messages d'erreur, eux, viennent de la spec (domain/erreursLancement.ts).

export const LIBELLES_ANIMATION = {
  // E3, élément 11
  lancer: 'Lancer la présentation',
  // Texte visible du bouton dans la maquette E3 ; le nom accessible garde le nom de l'élément 11.
  lancerCourt: 'Lancer',
  lancementEnCours: 'Lancement…',
  quizALancer: 'Quiz à lancer',
  aucunQuiz: 'Insérez une page de quiz pour pouvoir lancer la présentation.',
  quizIncomplet: 'Une question est incomplète. Complétez-la avant de lancer.',
  reprendre: 'La reprendre',
  terminerEtLancer: 'La terminer et lancer ce quiz',
  autoriser: 'Autoriser',
  annuler: 'Annuler',

  // E5
  chargement: 'Chargement de la séance…',
  connexionPerdue: 'Connexion perdue, reconnexion en cours…',
  connectes: 'Connectés',
  rejoindre: 'Rejoindre le quiz',
  qrCode: 'QR code pour rejoindre le quiz',
  quizNote: 'Quiz noté : connexion avec le compte de l\'IUT.',
  enAttente: 'Les étudiants peuvent rejoindre le quiz. Démarrez quand tout le monde est là.',
  questionEnCours: 'Question en cours',
  bonneReponse: 'Bonne réponse',
  reponsesRecues: 'Réponses reçues',
  reponsesPour: (lettre: string, nombre: number) => `Réponses ${lettre} : ${nombre}`,
  questionClose: 'Réponses closes.',
  demarrer: 'Démarrer',
  suivant: 'Suivant',
  terminer: 'Terminer',
  clore: 'Clore',
  cloreQuiz: 'Clore le quiz',
  confirmerFin: 'Terminer la séance ? Le lien et le QR code ne seront plus valides.',
  confirmerFinBouton: 'Terminer la séance',
  seanceTerminee: 'La séance est terminée. Le lien et le QR code ne sont plus valides.',
  retourEditeur: 'Retour à l\'éditeur',
  reference: 'Référence :',
}
