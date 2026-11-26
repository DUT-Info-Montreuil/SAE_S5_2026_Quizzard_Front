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
