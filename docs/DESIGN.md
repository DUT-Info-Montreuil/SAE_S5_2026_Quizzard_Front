# Conception du front-end : charte, écrans et conventions

Ce document décrit l'interface de Quizzard : charte graphique, règles pour l'écran projeté et le smartphone,
accessibilité, écrans E1 à E11 et conventions de code du front. L'organisation technique est dans
[ARCHITECTURE.md](ARCHITECTURE.md), les échanges avec le back dans [API.md](API.md).

Les éléments marqués **(à valider)** attendent une réponse du client (A. Bossard), de M. Groff ou du délégué à la
protection des données de l'IUT. La référence reste le cahier des charges (§5 « Description des IHM ») et ses
maquettes.

---

## 1. Charte graphique

Le client n'impose pas de charte : seul le **logo officiel de l'IUT** est demandé (cahier des charges §2.7 point 17).
Tout le reste est une **proposition de l'équipe** (cahier des charges §5.3), illustrée par les maquettes.

### 1.1 Couleurs

| Rôle | Couleur | Usage |
|---|---|---|
| Rouge IUT | `#F5403D` | Logo, pages de quiz (miniatures et repères dans E3, présentation) |
| Rouge action | `#DD2E2B` | Bouton d'action principale, texte blanc |
| Violet | `#6C4DF0` | Structure, actions secondaires |
| Vert d'eau | `#0E9F8E` | Validations, bonne réponse |
| Ambre | `#FFB020` | Alertes, classements |
| Fond | `#F4F2FB` | Fond lavande très clair |
| Texte | `#231F3A` | Texte bleu nuit |
| Cartes | Blanc | Cartes blanches à fine bordure |

Couleurs des réponses A à D :

| Réponse | Couleur |
|---|---|
| A | Rose `#E8478C` |
| B | Violet `#6C4DF0` |
| C | Vert d'eau `#0E9F8E` |
| D | Orange `#E58A00` |

La lettre de la réponse est **toujours** affichée : la couleur ne porte jamais seule le sens.

Les couleurs sont définies une seule fois, en variables CSS (`:root`) dans la feuille de style globale, et utilisées
partout par leur nom (`var(--couleur-action)`), jamais en dur. Le nommage exact des variables est à fixer au premier
ticket d'interface.

### 1.2 Contrastes à surveiller

Rapports de contraste calculés selon la formule WCAG 2.1 (seuils : 4,5:1 pour le texte courant, 3:1 pour le grand
texte, soit 24 px, ou 18,66 px en gras) :

| Couple texte / fond | Rapport | Conséquence |
|---|---|---|
| `#231F3A` sur `#F4F2FB` | 14,3:1 | Correct partout |
| Blanc sur `#DD2E2B` | 4,7:1 | Correct pour le bouton principal |
| Blanc sur `#6C4DF0` | 5,3:1 | Correct |
| Blanc sur `#F5403D` | 3,7:1 | Grand texte seulement |
| Blanc sur `#E8478C` | 3,7:1 | Grand texte seulement |
| Blanc sur `#0E9F8E` | 3,3:1 | Grand texte seulement |
| Blanc sur `#E58A00` | 2,6:1 | Insuffisant : texte bleu nuit (6,0:1) sur l'orange |
| Blanc sur `#FFB020` | 1,8:1 | Insuffisant : texte bleu nuit (8,6:1) sur l'ambre |

Les boutons de réponse colorés doivent donc utiliser un texte assez grand, ou un texte bleu nuit, ou une teinte plus
foncée ; le choix final se vérifie avec un outil de contraste avant la validation de la charte.

### 1.3 Police

- **Rubik** (licence libre SIL OFL), **fournie avec l'application** : fichiers de police dans le dépôt, déclarés par
  `@font-face` et intégrés au build par Vite. Jamais chargée depuis un service externe (Google Fonts ou autre).
- Repli sur la police sans empattement du système (`system-ui, sans-serif`).
- Graisses et formats à embarquer : le strict nécessaire (par exemple `woff2`, deux ou trois graisses), pour rester
  sobre. Les fichiers ne sont pas encore dans le dépôt ; la licence OFL est jointe aux fichiers.
- État actuel : `src/index.css` vient du modèle Vite (`system-ui`) et sera remplacé.

### 1.4 Logo

- Logo officiel de l'IUT en en-tête de **toutes les pages publiques** de l'application.
- Fichier officiel à obtenir (format vectoriel de préférence) et à ajouter au dépôt ; il n'y est pas encore.
- Texte alternatif : « IUT de Montreuil ».

### 1.5 Formes

- Coins arrondis, cartes blanches à fine bordure.
- Boutons à arête basse qui s'enfoncent à l'appui.
- Une seule action principale par écran sur smartphone.

## 2. Supports

### 2.1 Écran projeté (E5, E6)

- Texte d'au moins **24 px**, **28 px et plus** pour les réponses ; lisible depuis le fond de la salle.
- Contraste d'au moins 4,5:1 pour le texte courant.
- Mise en page plein écran, sans barre de défilement pendant une question ; le classement défile au-delà de
  8 participants (E6-4).
- Aucune identité d'étudiant : pseudonyme et score uniquement.

### 2.2 Smartphone (E7, E8, E9)

- Touches de réponse d'au moins **44 px** de haut (environ 62 px dans les maquettes).
- Une seule action principale par écran.
- Rejoindre un quiz en **trois actions au plus** : scanner, saisir un pseudonyme, entrer (quiz noté : scanner, se
  connecter avec son compte IUT, entrer).
- Page chargée en moins de 3 s en Wi-Fi : écran léger, pas de ressource inutile.
- Vérifié en portrait sur les navigateurs récents d'iOS et d'Android.

### 2.3 Ordinateur de l'enseignant (E1 à E4, E10, E11)

- Navigateurs récents (Chrome, Firefox, Edge, Safari).
- L'éditeur (E3) est pensé pour un écran d'ordinateur ; son usage sur smartphone n'est pas demandé.

## 3. Accessibilité

- Information **jamais portée par la couleur seule** : lettre sur chaque réponse, symbole (hausse, baisse, égalité)
  à côté des couleurs vert et rouge des évolutions du classement, icône en plus de la couleur pour les pages de quiz
  dans E3.
- Contrastes suffisants (§1.2).
- Navigation complète au clavier, focus visible ; ordre de tabulation logique.
- Éléments de formulaire avec une étiquette (`<label>`) ; erreurs de validation (`422`, `champs`) affichées à côté du
  champ concerné et annoncées aux lecteurs d'écran.
- Décompte et changements de rang : annonces discrètes pour les lecteurs d'écran (zone `aria-live` polie), sans
  annoncer chaque seconde.
- Langue de la page déclarée en français (`<html lang="fr">` ; `index.html` a encore `lang="en"`).
- Images avec texte alternatif ; images décoratives ignorées (`alt=""`).

## 4. Animations

- **Podium** (E6-2) : montée et descente des participants lors des changements de rang, en **moins d'une seconde**.
- Évolution des rangs (E6-3, E9-3) : symbole et nombre de places gagnées ou perdues.
- **Animations réduites** pour les utilisateurs qui le demandent (`prefers-reduced-motion`) : changement de rang sans
  déplacement animé, ou fondu court.
- Animations en CSS (transitions, `transform`, `opacity`) de préférence, pour rester fluides avec 300 participants
  et sans bibliothèque supplémentaire.
- Bouton qui s'enfonce à l'appui : retour visuel immédiat sur smartphone.

## 5. Écrans

Onze écrans : six pour l'enseignant, deux projetés en salle, trois pour l'étudiant. Les chemins sont une proposition
(voir [ARCHITECTURE.md](ARCHITECTURE.md) §4) ; les numéros d'éléments renvoient aux tableaux du cahier des charges
(§5.2). Les routes du back utilisées sont détaillées dans [API.md](API.md).

### E1 – Connexion (enseignant, ordinateur) · UC1

- Identifiant et mot de passe obligatoires ; bouton « Se connecter » actif quand les deux champs sont remplis.
- Échec : message d'erreur générique en rouge, sans préciser le champ erroné.
- Succès : E2. Mention d'information RGPD sur l'écran.
- Tant que le LDAP n'est pas intégré, les identifiants sont ceux des comptes locaux provisoires du back.

### E2 – Mes cours (enseignant, ordinateur) · UC2, UC6

- En-tête : nom de l'utilisateur (lecture seule), lien « Se déconnecter » (retour à E1).
- Tableau des cours de l'enseignant : cours, version, nombre de quiz, dernière modification.
- « Importer un PDF » : PDF uniquement ; crée le cours en v1 ; titre proposé à partir du nom du fichier ; taille
  maximale **(à valider)** avec le client (le back propose 50 Mo).
- Par cours : « Ouvrir » (E3 sur la dernière version), « Nouvelle version » (UC6), « Résultats » (E10).
- « Mes classements » : E4.
- Erreurs d'import affichées clairement : fichier non PDF, trop lourd, déjà importé.

### E3 – Éditeur cours + quiz (enseignant, ordinateur) · UC3, UC4, UC5, UC6, UC13, UC14

- Titre et version (lecture seule).
- Colonne des pages : miniatures des pages du PDF et des pages de quiz, distinguées par la couleur **et** une icône ;
  bouton « Insérer un quiz ici » entre deux pages ; un clic affiche la page dans l'aperçu.
- Aperçu de la page sélectionnée (rendu PDF.js, lecture seule).
- Question : type (QCM, Points à relier, Réponse libre), énoncé, réponses (QCM : 2 propositions et 1 bonne réponse au
  moins ; relier : 2 paires au moins ; réponse libre : au moins un motif, mode simple ou expression régulière, avec
  test sur un exemple).
- Durée maximale en secondes (bornes **(à valider)**, par exemple 10 s à 10 min).
- Barème : points maximum (1000 par défaut), « décroissance avec le temps », « points partiels ».
- Déroulé du quiz : noté ou non noté ; passage manuel (par défaut) ou automatique avec délai ; écrans intermédiaires
  par question (bonne réponse, répartition, classement) ; mode d'affichage du cours en séance **(à valider)**.
- « Réappliquer les quiz » visible après l'import d'une nouvelle version : aperçu des positions proposées, ajustement,
  validation (UC6).
- « Enregistrer » avec alerte en cas de modifications non enregistrées ; « Lancer la présentation » désactivé si une
  question est incomplète (avec l'alerte correspondante).
- Suppression d'un quiz : confirmation demandée.

### E4 – Classements (enseignant, ordinateur) · UC10, UC11

- Liste de mes classements : nom, nombre de quiz, nombre de cours ; sélection = détail.
- « Nouveau classement » ; nom obligatoire et unique pour l'enseignant.
- Quiz reliés : cases à cocher regroupées par cours, plusieurs cours possibles ; les scores sont additionnés.
- « Enregistrer » recalcule le classement ; « Intégrer au cours » : choix du cours et de l'emplacement, insère une page
  de classement animée.

### E5 – Quiz en cours (écran projeté) · UC7, UC9, UC14

- Énoncé en grand, dès l'ouverture de la question ; propositions avec leur lettre.
- QR code (image générée par le back) et lien d'accès ; invalides après la clôture.
- Temps restant synchronisé sur l'horloge du serveur ; clôture à 0.
- Compteur de connectés, mis à jour à chaque entrée.
- Histogramme des réponses reçues, mis à jour en moins de 1 s.
- Boutons « Clore » (arrête les réponses) et « Suivant » (question ou page suivante).
- Après la clôture : bonne réponse révélée, nombre d'étudiants par réponse, puis écrans intermédiaires selon la
  configuration ; passage automatique si l'option est active.

### E6 – Classement (écran projeté) · UC11, UC12

- Titre : quiz ou ensemble de quiz classés ; indique si le classement est simple ou cumulé.
- Podium animé des trois premiers : pseudonyme, score.
- Évolution : symbole et nombre de places gagnées ou perdues.
- Suite du classement : rang, pseudonyme, score ; défilement au-delà de 8 participants.
- « Page suivante du cours » : reprend la présentation.

### E7 – Rejoindre (étudiant, smartphone ou ordinateur) · UC8, UC15

- Titre : nom du cours et du quiz, reçus avec le lien.
- Quiz non noté : pseudonyme obligatoire, 2 à 20 caractères, unique dans la séance **(à valider)** ; en cas de
  doublon, le pseudonyme proposé par le back est affiché.
- Quiz noté : identifiant et mot de passe de l'IUT à la place du pseudonyme ; un pseudonyme d'affichage est proposé ;
  message d'erreur générique en cas d'échec.
- « Entrer dans le quiz » : refusé si la séance est close ; sinon E8, sur la question en cours si le quiz a commencé.
- Mention d'information RGPD : finalité, base légale, durée de conservation, contact **(textes à valider)**.

### E8 – Question (étudiant) · UC8, UC9

- Barre et décompte du temps restant, synchronisés sur le serveur ; « Valider » désactivé à 0.
- Énoncé en lecture seule.
- Zone de réponse selon le type : QCM, boutons avec lettre et couleur ; points à relier, deux colonnes ; réponse
  libre, zone de texte (1000 caractères au plus).
- « Valider » : une seule validation par question, non modifiable ensuite.
- Bandeau d'arrivée en cours de route pour un retardataire.

### E9 – Résultat et classement (étudiant) · UC9, UC12

- Confirmation après la validation ou à l'expiration du temps.
- Points de la question et score total.
- Rang sur le nombre de participants, avec l'évolution ; l'étudiant ne voit que son propre rang.
- Message d'attente ; retour automatique sur E8 à la question suivante.

### E10 – Résultats de la séance (enseignant, ordinateur) · UC17, UC18

- Séances du cours : date, quiz, nombre de participants ; sélection = détail.
- Résultats par question : taux de réussite, répartition des réponses, temps moyen.
- Résultats par participant : rang, pseudonyme ou identité (quiz noté), score, détail des réponses ; participants à
  identité non vérifiée signalés.
- « Réponses libres à corriger » avec le nombre de réponses à examiner : ouvre E11.
- « Exporter en CSV » : télécharge les résultats de la séance choisie.
- Un quiz noté qui a encore des réponses à examiner est signalé comme non utilisable pour l'évaluation.

### E11 – Correction des réponses libres (enseignant, ordinateur) · UC16

- Énoncé et motifs acceptés (lecture seule).
- Groupes de réponses identiques : réponse, nombre d'étudiants, statut (acceptée par les motifs, à examiner).
- « Valider » / « Refuser » par groupe ; la décision manuelle prime sur les motifs.
- « Ajouter un motif » : appliqué aux réponses de la séance.
- Effet sur les scores : participants et scores modifiés, mis à jour à chaque décision.
- « Enregistrer et recalculer » : recalcule scores et classements.

### États communs

Chaque écran prévoit un état chargement, un état erreur (message `error` du back, `request_id` pour un incident) et
un état vide (« Aucun cours pour l'instant », etc.).

## 6. Conventions de code

### Langue et nommage

- **Code métier en français** : composants, hooks, types, variables (`ListeCours`, `useSeanceEnDirect`,
  `tempsRestantMs`). Les termes techniques imposés restent en anglais (`props`, `ref`, `Provider`, `reducer`).
- Textes de l'interface en français, avec les accents.
- Composants et types : `PascalCase` ; fonctions et variables : `camelCase` ; constantes : `MAJUSCULES_AVEC_TIRETS_BAS`.
- Un composant par fichier, nommé comme le composant (`CarteCours.tsx`) ; hooks dans des fichiers `useXxx.ts`.
- Types des DTO du back : mêmes noms de champs que le JSON (`idCours`, `dureeParDefautSec`).

### Composants et couches

- Composants fonctionnels et hooks uniquement.
- Un composant de `presentation` reçoit ses données par ses props ou par un hook de `application` ; il n'appelle
  jamais `fetch` ni le client STOMP.
- La logique pure (calculs, validations, transformations) va dans `domain`, sans React, pour être testée seule.
- Composants réutilisables de la charte dans `shared/ui` ; un composant propre à une feature reste dans sa feature.
- TypeScript strict dans l'esprit : pas de `any` sans commentaire qui le justifie ; règles ESLint du dépôt respectées.

### Styles

- Variables CSS de la charte (§1) pour les couleurs, tailles et espacements.
- Méthode d'organisation des styles **à choisir** par l'équipe (par exemple les CSS Modules, pris en charge par Vite
  sans dépendance supplémentaire) ; une fois choisie, elle est notée ici.
- Aucune feuille de style, police ou icône chargée depuis l'extérieur.

### Erreurs et messages

- Les messages d'erreur du back (`error`) sont déjà en français et sans donnée personnelle : les afficher tels quels.
- Pour un `422`, afficher chaque message de `champs` sous le champ concerné.
- Pas de donnée personnelle dans `console.log` ; pas de `console.log` oublié dans le code fusionné.

### Tests

Outil **à choisir**. Attendu ensuite : tests unitaires de `domain`, tests de composants des écrans (états chargement,
erreur, vide, nominal), noms de tests en français qui décrivent le comportement.
