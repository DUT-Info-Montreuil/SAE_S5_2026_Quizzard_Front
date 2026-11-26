# TODO – front-end Quizzard

Reste à faire côté front-end, classé par priorité MoSCoW du cahier des charges. Le détail des tickets vit dans Jira ;
ce fichier donne la vue d'ensemble et se met à jour à chaque Sprint Review.

## UC8 « Rejoindre un quiz » (E7, quiz non noté)

En place (plan [`docs/plans/UC8-rejoindre-quiz.md`](docs/plans/UC8-rejoindre-quiz.md), blocs B1 à B4). Reste :

- B5 : compléter les tests prévus au plan.
- Questions au back : codes d'erreur et `suggestion` (K1, K2, K5), décompte des caractères (K3), pseudonyme envoyé
  nettoyé (K4), message d'un `400` (K6), CSRF sur `/api/public/**` (K7), limite d'entrées par appareil (K8).
- Questions à l'équipe et à l'enseignant : messages de panne réseau et de stockage indisponible (U1, U2, U5), texte
  de la mention E7-5 (U3), titre « Choisis ton pseudo pour rejoindre » (U4).
- E7-4, connexion avec le compte IUT pour un quiz noté (UC15).
## UC7 « Lancer un quiz en séance » (E3 élément 11, E5)

En place (plan [docs/plans/UC7-lancer-quiz-seance.md](docs/plans/UC7-lancer-quiz-seance.md)). Reste :

- Désactiver « Lancer la présentation » quand une question est incomplète, une fois les questions connues (UC4, Q2).
- Faire valider les libellés provisoires de E5 et du lancement (U1, U2) et la mise en page de E5 (aucune maquette).
- Écrans intermédiaires (UC14, `…/ecran`), classement projeté E6 (UC11), image de la question (UC4), autorisation
  « identité non vérifiée » après coup (UC15).

## E3 « Éditeur cours + quiz » : éléments 5 à 18 (maquette)

Interface en place dans la démo `/demo/editeur` (état local). Reste :

- Brancher sur le back : questions (UC4 : `POST /api/quiz/{idQuiz}/questions`, `PUT` / `DELETE /api/questions/{idQuestion}`,
  image `PUT` / `DELETE .../image`), barème et durée (UC5), réappliquer les quiz (UC6), déroulé et écrans
  intermédiaires (UC13, UC14), puis les afficher sur la route réelle `/cours/:idCours/editeur`.
- Réordonner les écrans intermédiaires (poignée de la maquette) ; ordre fixe pour l'instant.
- Numérotation de la bande des pages : position dans le cours (UC3) ou numéro de page du PDF (maquette) ?
- Faire valider les libellés « provisoire » de `quiz/presentation/libellesQuiz.ts`.
