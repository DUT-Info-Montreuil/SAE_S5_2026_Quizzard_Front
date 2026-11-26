# Cas d'utilisation : Lancer un quiz en séance (UC7)

> Conversion en Markdown de la fiche « Quizzard – Cas d'utilisation UC7 Lancer un quiz en séance ». Les textes, codes
> et messages sont repris mot pour mot. Les trois figures (étapes fonctionnelles, séquence, classes) décrivent le
> back et ne sont pas reprises. Les fiches « Services fonctionnels » (méthodes Java du back) sont résumées en fin de
> document.
>
> **Côté front**, la référence des routes et des destinations est le `docs/API.md` du back (branche
> `feature/uc7-lancer-un-quiz-en-seance`, §3.4), qui précise cette fiche : `codeAcces` dans la réponse, route
> `GET /api/sessions/ouverte`, codes d'erreur (`code`) et formes des messages temps réel.

## Définition

En tant qu'enseignant,
Je souhaite lancer un quiz de mon cours pendant ma présentation en salle,
Afin de faire répondre mes étudiants en direct depuis leur téléphone ou leur ordinateur et de voir leurs réponses
s'afficher au fur et à mesure.

**Objets métier** : Cours, Quiz, Question

Le cas utilise aussi quatre structures techniques, visibles dans le diagramme de classes : les données reçues
(LancerQuizDto), le jeton d'accès à la session (JetonSession), l'image du QR code (QrCode) et la réponse envoyée au
navigateur (SessionResponse). L'identifiant de l'enseignant est lu dans la session de connexion, jamais dans la
requête.

**Écrans** : E3 « Éditeur cours + quiz », élément 11 « Lancer la présentation » (point de départ), puis E5 « Quiz en
cours », projeté en salle (cahier des charges).

**Pré-condition** : l'enseignant est connecté, le quiz lui appartient et est « prêt », c'est-à-dire qu'aucune de ses
questions n'est incomplète.

**Hors périmètre** : connexion des étudiants, enregistrement et notation des réponses , calcul et affichage du
classement, configuration du déroulé et du barème).

**Principe.** Le lancement crée une session, génère un jeton unique, le lien d'accès et le QR code, puis ouvre le
canal temps réel (WebSocket) sur lequel les étudiants se connecteront. Une fois la session créée, E5 affiche le QR
code et le lien sur la présentation : le quiz est alors ouvert aux étudiants, qui peuvent rejoindre à tout moment.
Ensuite, l'enseignant déroule le quiz question par question : démarrage de la question, décompte côté serveur, arrêt
automatique des réponses à la fin du temps, écrans intermédiaires configurés, puis passage à la question suivante,
manuel ou automatique. Après la dernière question, la session est terminée et son historique est conservé en lecture
seule.

## Cas d'erreur

| Cas | Exception levée (couche) | HTTP | Message affiché |
|---|---|---|---|
| Session de connexion absente ou expirée | Filtre Spring Security (infrastructure) | 401 | Retour à l'écran de connexion. |
| Rôle autre qu'enseignant | Filtre Spring Security (infrastructure) | 403 | « Action non autorisée. » |
| Quiz inexistant | QuizIntrouvableException (domaine) | 404 | « Ce quiz n'existe pas ou a été supprimé. » |
| Quiz appartenant à un autre enseignant | AccesQuizRefuseException (domaine) | 403 | « Action non autorisée. » |
| Quiz sans question ou avec une question incomplète | QuizIncompletException (domaine), levée par Quiz.verifierPretALancer | 422 | « Le quiz contient une question incomplète (page … ). Complétez-la avant de lancer. » |
| Session déjà ouverte pour cet enseignant | SessionDejaOuverteException (domaine), levée par le cas d'usage | 409 | « Une session est déjà ouverte pour le cours « … ». La reprendre ou la terminer ? » |
| Quiz noté et annuaire LDAP indisponible, sans autorisation | AnnuaireIndisponibleException (application) | 409 | « L'annuaire de l'IUT est indisponible. Autoriser l'entrée en identité non vérifiée ? » |
| Erreur de génération du QR code ou du jeton | GenerationAccesException (application) | 500 | « Le lancement a échoué, réessayez. » |
| Erreur d'écriture en base ou d'ouverture du canal temps réel | Erreur d'accès aux données (Spring) ou CanalTempsReelException (infrastructure) | 500 | « Le lancement a échoué, réessayez. » La transaction est annulée : aucune session n'est créée. |

## Diagrammes

Une erreur à l'une des étapes 4 à 13 interrompt le lancement : la route renvoie le code HTTP du tableau « Cas
d'erreur » et E3 affiche le message correspondant sans quitter l'éditeur.

**Transaction et cohérence.** Le lancement est tout ou rien : soit la session, son jeton et son canal temps réel sont
créés, soit rien. L'enregistrement en base est forcé (flush) avant la génération du QR code et l'ouverture du canal,
pour qu'une erreur de base soit détectée dans le cas d'usage et annule la transaction. Le canal temps réel n'est
annoncé aux étudiants qu'une fois la transaction validée. L'action sensible « quiz_lance » n'est conservée dans le
journal que si le lancement réussit ; un lancement refusé (quiz incomplet, session déjà ouverte) est seulement tracé
dans les logs.

**Temps réel.** Le déroulement du quiz passe par un canal WebSocket propre à la session. Le serveur est la seule
référence pour le temps : le décompte et l'horodatage des réponses sont faits côté serveur, et une réponse reçue après
l'échéance est refusée.

| Événement | Sens | Contenu | Remarque |
|---|---|---|---|
| participant_connecte | Serveur → écran projeté | Nombre de connectés | Met à jour le compteur de E5 |
| question_demarree | Serveur → tous | Numéro, énoncé, propositions, image, durée, heure de fin serveur | Les bonnes réponses ne sont pas incluses |
| reponse_recue | Serveur → écran projeté | Répartition agrégée des réponses | Mise à jour en moins de 1 seconde |
| question_close | Serveur → tous | Bonne réponse, répartition, points de l'étudiant | Envoyée à 0 seconde ou à la clôture manuelle |
| ecran_intermediaire | Serveur → écran projeté | Écran à afficher selon la configuration | Bonne réponse, répartition ou classement |
| session_terminee | Serveur → tous | Message de fin | Le lien et le QR code sont invalidés |

Les événements envoyés aux appareils des étudiants (question_demarree) ne contiennent jamais la bonne réponse : elle
n'est transmise qu'avec question_close.

## Services API

### Contrat de la route `POST /api/quiz/{idQuiz}/sessions`

| Élément | Description |
|---|---|
| Route | POST /api/quiz/{idQuiz}/sessions ; SessionController.lancer, qui appelle LancerQuizUseCase |
| Accès | Enseignant connecté (session) et propriétaire du quiz ; idEnseignant est lu dans la session, jamais dans la requête |
| Requête | Paramètre de chemin idQuiz (entier, obligatoire). Corps JSON facultatif : autoriserIdentiteNonVerifiee (booléen, faux par défaut ; utile seulement pour un quiz noté si l'annuaire est indisponible) |
| Réponse | 201 Created, en-tête Location /api/sessions/{idSession}, corps SessionResponse en JSON (idSession, idQuiz, titre, statut, modeNote, nbQuestions, lienAcces, qrCode, dateLancement) ; qrCode est une image PNG encodée en base64 générée par l'application |
| Erreurs | 401 session absente, 403 rôle ou propriétaire refusé, 404 quiz inexistant, 409 session déjà ouverte ou annuaire indisponible sans autorisation, 422 quiz incomplet, 500 échec de lancement. Corps au format commun (error, request_id, champs) ; détail dans le tableau « Cas d'erreur » |
| Appelée par | Front : features/session/api, par le client HTTP commun (shared/http) |

### Routes de déroulement de la session

| Route | Rôle | Cas |
|---|---|---|
| POST /api/sessions/{idSession}/questions/suivante | Démarre la question suivante (la première après le lancement) et lance le décompte côté serveur | UC7 |
| POST /api/sessions/{idSession}/questions/courante/cloture | Clôt la question en cours avant la fin du temps (la clôture automatique est faite par le serveur) | UC7 |
| POST /api/sessions/{idSession}/cloture | Termine la session, invalide le lien et le QR code | UC7 |
| GET /api/sessions/{idSession} | Renvoie l'état courant (statut, question en cours, temps restant, connectés), pour reprendre après une coupure réseau | UC7 |

## Services fonctionnels (résumé, back)

Méthodes appelées par le cas d'usage, toutes côté back : `SessionController.lancer`, `LancerQuizUseCase.executer`
(transactionnel), `QuizRepository.trouverParId`, `Quiz.verifierPretALancer`,
`SessionRepository.trouverOuverteParEnseignant`, `AnnuaireLdap.estDisponible`, `GenerateurJeton.generer`,
`Session.ouvrir`, `SessionRepository.enregistrer`, `GenerateurQrCode.generer`, `DiffuseurTempsReel.ouvrirCanal`,
`JournalEvenements.actionSensible` (« quiz_lance »), `JournalEvenements.regleRefusee`
(« lancement_refuse_quiz_incomplet », « lancement_refuse_session_ouverte ») et `SessionMapper.versReponse`.

## Points à valider avec le client

| N° | Point | Proposition de l'équipe |
|---|---|---|
| 1 | Nombre de sessions ouvertes simultanément pour un même enseignant | Une seule session ouverte par enseignant (hypothèse retenue ici) |
| 2 | Durée de validité d'une session sans activité | Fermeture automatique après une période d'inactivité à fixer (par exemple 2 heures) |
| 3 | Forme du lien d'accès | https://hôte/rejoindre/{jeton}, jeton aléatoire non devinable |
| 4 | Volumétrie maximale par session | 300 participants simultanés (valeur proposée, à valider) |
| 5 | Comportement si l'annuaire LDAP est indisponible au lancement d'un quiz noté | Autorisation de l'enseignant pour l'entrée en « identité non vérifiée », participants signalés dans les résultats et l'export |
