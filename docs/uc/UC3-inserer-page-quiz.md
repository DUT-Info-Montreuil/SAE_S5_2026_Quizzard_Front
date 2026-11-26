# Cas d'utilisation : Insérer une page de quiz dans le cours (UC3)

> Conversion en Markdown de la partie UC3 du dossier `docs/uc/Sae Kahoot (3).pdf` : partie 4.2 (auteur : Sergio
> Teixeira Goncalves), contrat de la partie 5.1.2 et fiches de la partie 5.2.2, plus les éléments 1 à 4 et 11 de
> l'écran E3 (partie 5.2.3 du cahier des charges). Les textes, codes et messages sont repris mot pour mot. Les figures
> 14 à 17 (images dans le PDF) sont remplacées par une description textuelle complète.
>
> La dernière section (« Routes de lecture ») ne vient pas du dossier : elle reprend le `docs/API.md` du back et reste
> à confirmer.

## Définition

En tant qu'enseignant,
Je souhaite insérer une page de quiz entre deux pages de mon cours,
Afin d'y placer une question à laquelle les étudiants répondront pendant la séance.

**Objets métier :** Cours, VersionCours, Quiz, Question (et son Bareme), PageInseree (PageQuiz),
InsererPageQuizDto, PageQuizInseree.

**Écran :** E3 « Éditeur cours + quiz » : élément 3 « Insérer un quiz ici », élément 2 « Pages du cours » et
élément 4 « Aperçu de la page ».

**Hors périmètre :** paramétrage de la question (UC4, UC5, UC13), déroulé du quiz (UC14), réapplication des quiz à
une nouvelle version du PDF (UC6), insertion d'une page de classement (UC11), déplacement et suppression d'une page
de quiz (avec confirmation).

Une page de quiz porte une seule question. Elle est placée dans la version courante du cours par un emplacement (page
du PDF après laquelle elle s'insère et rang parmi les pages déjà insérées au même endroit) et un repère de texte, pour
que l'emplacement reste lié au contenu du cours et non au fichier. L'enseignant choisit le quiz qui reçoit la
question : un quiz existant du cours, ou un nouveau quiz créé à cette occasion. La question est créée vide, prête à
être paramétrée (UC4, UC5, UC13) ; tant qu'elle est incomplète, le quiz ne peut pas être lancé.

## Cas d'erreur

| Cas | Exception (couche) | HTTP | Code | Message affiché |
|---|---|---|---|---|
| Session absente ou expirée | Filtre Spring Security (infrastructure) | 401 | — | Retour à l'écran de connexion. |
| Rôle autre qu'enseignant | Filtre Spring Security (infrastructure) | 403 | — | « Action non autorisée. » |
| Corps incomplet ou mal formé (version, page ou rang absents ou négatifs, repère trop long) | MethodArgumentNotValidException (Spring) | 400 | `REQUETE_INVALIDE` | « Requête invalide, rechargez l'éditeur. » |
| Cours inexistant ou d'un autre enseignant | CoursIntrouvableException (domaine) | 404 | `COURS_INTROUVABLE` | « Cours introuvable. » |
| Cours archivé | CoursArchiveException (domaine) | 409 | `COURS_ARCHIVE` | « Ce cours est archivé : il n'est plus modifiable. » |
| Version qui n'est plus la dernière | VersionPerimeeException (domaine) | 409 | `VERSION_PERIMEE` | « Une nouvelle version du cours a été importée : rechargez l'éditeur. » |
| Emplacement hors du cours | EmplacementInvalideException (domaine) | 422 | `EMPLACEMENT_INVALIDE` | « Emplacement invalide : rechargez l'éditeur. » |
| Quiz inexistant, archivé ou d'un autre cours | QuizIntrouvableException (domaine) | 404 | `QUIZ_INTROUVABLE` | « Quiz introuvable. » |
| Quiz en cours de séance | QuizEnSeanceException (domaine) | 409 | `QUIZ_EN_SEANCE` | « Ce quiz est en cours de séance : réessayez après sa clôture. » |
| Erreur de base de données | Erreur d'accès aux données (Spring) | 500 | `ERREUR_SERVEUR` | « L'insertion a échoué, réessayez. » Rien n'est créé. |

> Dans le PDF, la colonne « Code » réunit le statut HTTP et le code (par exemple « 409 COURS_ARCHIVE ») ; elle est
> séparée ici en deux colonnes. Les lignes 401 et 403 n'ont pas de code. Pour 401, « Retour à l'écran de connexion. »
> est écrit sans guillemets : c'est un comportement, pas un message affiché. Dans la dernière ligne, « Rien n'est
> créé. » est aussi hors des guillemets : c'est une précision sur le comportement, pas une partie du message.

Un gestionnaire global, GestionnaireErreurs (shared), traduit chaque exception en code HTTP et en corps au format
commun (error, request_id, champs). Les réponses 409 se distinguent par le champ error. Un cours d'un autre
enseignant reçoit la même réponse 404 qu'un cours inexistant, pour ne pas révéler son existence.

## Diagrammes

Le cas d'utilisation est décrit par quatre diagrammes : le diagramme de cas d'utilisation, les étapes fonctionnelles,
la séquence des appels et, en complément, les classes du back-end utilisées.

### Diagramme de cas d'utilisation

*Figure 14 – Insérer une page de quiz dans le cours : cas d'utilisation.*

Diagramme de cas d'utilisation UML. Frontière du système : « Outil de quiz dynamique IUT ».

**Acteur**

- **Enseignant** (à gauche, hors de la frontière) : associé par un trait plein au cas principal.

**Cas principal**

- « UC3 – Insérer une page de quiz dans le cours », avec un compartiment « points d'extension : » qui en liste
  deux :
  - « aucun quiz existant choisi » ;
  - « version du cours périmée ».

**Inclusions** (flèches pointillées « «include» », du cas principal vers le cas inclus)

- « Choisir l'emplacement entre deux pages (E3) » ;
- « Créer la question à paramétrer » ;
- « Renuméroter les pages du cours (E3) ».

**Extensions** (flèches pointillées « «extend» », du cas d'extension vers le cas principal)

- « Créer un nouveau quiz (« Quiz n ») » (point d'extension « aucun quiz existant choisi ») ;
- « Recharger l'éditeur (dernière version) » (point d'extension « version du cours périmée »).

**Note** (encadré jaune, en bas à gauche) : « Ensuite, hors de ce cas : paramétrer la question (UC4, UC5, UC13,
UC14) ».

### Diagramme des étapes fonctionnelles du CU

Les contrôles du navigateur évitent un envoi inutile ; ceux du serveur font foi. Chaque contrôle en échec lève une
exception nommée.

*Figure 15 – Insérer une page de quiz dans le cours : étapes fonctionnelles.*

Diagramme d'activité à trois couloirs : **Enseignant**, **Navigateur (application React)**, **Serveur (Spring
Boot)**. Code couleur : bleu = étape normale, jaune = décision, vert = chemin de succès, orange = erreur ; l'encadré
du gestionnaire d'erreurs est jaune pâle.

**Déroulé principal**

1. *Enseignant* — Nœud initial, puis « Cliquer « Insérer un quiz ici » entre deux pages (E3, élément 3) ».
2. *Enseignant* — « Choisir le quiz : un quiz du cours ou « Nouveau quiz » ».
3. *Enseignant → Navigateur* — *Navigateur* : « Calculer numeroPage, ordre et repère de texte (PDF.js) ».
4. *Navigateur* — « Désactiver le bouton, envoyer : POST /api/cours/{idCours}/pages-quiz ».
5. *Navigateur → Serveur* (flèche « HTTP ») — *Serveur* : « Filtre Spring Security : session et rôle ».
6. *Serveur* — Décision « Connecté et enseignant ? »
   - **[non]** : « Refus 401 / 403 (Spring Security) » (orange) → vers le gestionnaire d'erreurs (étape 20).
   - **[oui]** : suite.
7. *Serveur* — Décision « @Valid : corps complet ? »
   - **[non]** : « MethodArgumentNotValidException » → gestionnaire d'erreurs.
   - **[oui]** : suite.
8. *Serveur* — « PageQuizController construit le DTO InsererPageQuizUseCase.executer(dto) ».
9. *Serveur* — « CoursRepository.trouverPourModification (verrou sur la ligne du cours) ».
10. *Serveur* — Décision « Cours trouvé ? (de cet enseignant) »
    - **[non]** : « CoursIntrouvableException » → gestionnaire d'erreurs.
    - **[oui]** : suite.
11. *Serveur* — Décision « Cours non archivé ? »
    - **[non]** : « CoursArchiveException » → gestionnaire d'erreurs.
    - **[oui]** : suite.
12. *Serveur* — Décision « Cours.verifierVersion : dernière version ? »
    - **[non]** : « VersionPerimeeException » → gestionnaire d'erreurs.
    - **[oui]** : suite.
13. *Serveur* — Décision « VersionCours : emplacement dans le cours ? »
    - **[non]** : « EmplacementInvalideException » → gestionnaire d'erreurs.
    - **[oui]** : suite.
14. *Serveur* — « idQuiz fourni : QuizRepository.trouverDansCours sinon Quiz.nouveau(idCours, « Quiz n ») ».
15. *Serveur* — Décision « Quiz trouvé et non archivé ? »
    - **[non]** : « QuizIntrouvableException » → gestionnaire d'erreurs.
    - **[oui]** : suite.
16. *Serveur* — Décision « Quiz hors séance ? »
    - **[non]** : « QuizEnSeanceException » → gestionnaire d'erreurs.
    - **[oui]** : suite.
17. *Serveur* (vert) — « quiz.ajouterQuestionVierge() QCM, énoncé vide, barème par défaut », puis « Décaler les pages
    suivantes, PageQuiz.creer, enregistrer quiz et page (flush) ».
18. *Serveur* — Décision « Écritures réussies ? »
    - **[non]** : « Rollback : rien n'est créé (500) » → gestionnaire d'erreurs.
    - **[oui]** : « 201 Created + PageQuizResponse (liste des pages à jour) ».
19. *Serveur → Navigateur* (flèche « réponse ») — *Navigateur* (vert) : « Afficher la page de quiz dans la liste et
    l'aperçu, renuméroter (E3) », puis *Enseignant* (vert) : « Paramétrer la question (UC4, UC5, UC13) », puis
    **nœud final**.

**Branche d'erreur**

20. *Serveur* — Toutes les erreurs (Refus 401 / 403, MethodArgumentNotValidException, CoursIntrouvableException,
    CoursArchiveException, VersionPerimeeException, EmplacementInvalideException, QuizIntrouvableException,
    QuizEnSeanceException, Rollback 500) convergent vers « GestionnaireErreurs (shared) : code HTTP et corps commun
    (error, request_id) ».
21. *Serveur → Navigateur* (flèche « erreur ») — *Navigateur* : décision « 409 version périmée ou 422 emplacement ? »
    - **[oui]** : *Enseignant* (orange) : « Recharger l'éditeur sur la dernière version », puis **nœud final**.
    - **[non]** : *Navigateur* (orange) : « Afficher le message, réactiver le bouton (401 : écran de connexion) »,
      puis **nœud final**.

### Diagramme de séquence

En vert le scénario nominal, en rouge le cas d'erreur ; flèche pleine : appel, pointillée : retour.

*Figure 16 – Insérer une page de quiz dans le cours : diagramme de séquence.*

**Participants (lignes de vie), de gauche à droite :** Navigateur (React), PageQuizController,
InsererPageQuizUseCase, CoursRepository, Cours / VersionCours, QuizRepository, Quiz / Question, PageQuiz,
PageInsereeRepository.

**Messages**

1. Navigateur (React) → PageQuizController : `POST /api/cours/{idCours}/pages-quiz`.
2. Note sur Navigateur–InsererPageQuizUseCase : « Spring Security + @Valid : session, rôle enseignant, corps ».
3. PageQuizController → InsererPageQuizUseCase : `executer(dto)`.
4. InsererPageQuizUseCase → CoursRepository : `trouverPourModification(idCours, idEnseignant)`.
5. CoursRepository ⇢ InsererPageQuizUseCase : « Optional<Cours> (ligne verrouillée) ».
6. InsererPageQuizUseCase → Cours / VersionCours : `verifierModifiable() puis verifierVersion(idVersion)`.
7. InsererPageQuizUseCase → PageInsereeRepository : `compterA(idVersion, numeroPage)`.
8. PageInsereeRepository ⇢ InsererPageQuizUseCase : `nbPagesAuMemeEndroit`.
9. InsererPageQuizUseCase → Cours / VersionCours : `version.verifierEmplacement(numeroPage, ordre, nb)`.
10. **Fragment alt** :
    - **[Cours absent, archivé, version périmée ou emplacement invalide]** (rouge) : Cours / VersionCours ⇢
      Navigateur : « CoursIntrouvable / CoursArchive / VersionPerimee / EmplacementInvalide (via
      GestionnaireErreurs) ».
    - **[Cours modifiable]** (vert) : Cours / VersionCours ⇢ InsererPageQuizUseCase : « ok ».
11. **Fragment alt** :
    - **[idQuiz fourni]** : InsererPageQuizUseCase → QuizRepository : `trouverDansCours(idQuiz, idCours) puis
      estEnSeance(idQuiz)` ; en rouge, QuizRepository ⇢ Navigateur : « QuizIntrouvable / QuizEnSeanceException (via
      GestionnaireErreurs) ».
    - **[idQuiz absent : nouveau quiz]** (vert) : InsererPageQuizUseCase → QuizRepository : `compterParCours(idCours)`,
      puis InsererPageQuizUseCase → Quiz / Question : `Quiz.nouveau(idCours, « Quiz n+1 »)`.
12. Bloc vert (hors fragment), tous partant d'InsererPageQuizUseCase :
    - → Quiz / Question : `ajouterQuestionVierge() : Question` ;
    - → PageInsereeRepository : `decalerOrdres(idVersion, numeroPage, ordre)` ;
    - → QuizRepository : `enregistrer(quiz) : Quiz (idQuestion attribué)` ;
    - → PageQuiz : `PageQuiz.creer(idVersion, numeroPage, ordre, repereTexte, idQuestion)` ;
    - → PageInsereeRepository : `enregistrer(page) (flush) puis listerParVersion(idVersion)`.
13. **Fragment alt** :
    - **[Écritures réussies]** (vert) : InsererPageQuizUseCase ⇢ PageQuizController : `PageQuizInseree` ;
      PageQuizController ⇢ Navigateur : « 201 Created + PageQuizResponse ».
    - **[Erreur de base de données]** (rouge) : InsererPageQuizUseCase ⇢ Navigateur : « rollback, 500 « L'insertion
      a échoué, réessayez. » ».

**Transaction et concurrence.** L'insertion est tout ou rien : le quiz éventuellement créé, la question, le décalage
des rangs et la page sont enregistrés dans une seule transaction. Le cours est verrouillé (SELECT … FOR UPDATE)
pendant la transaction : deux insertions simultanées dans le même cours (deux onglets ouverts) s'exécutent l'une
après l'autre et ne peuvent pas obtenir le même rang. La contrainte UNIQUE (idVersion, numeroPage, ordre) de
PAGE_INSEREE est déclarée DEFERRABLE INITIALLY DEFERRED : PostgreSQL vérifie une contrainte non différée ligne par
ligne, et UPDATE ordre = ordre + 1 échouerait sur un doublon temporaire.

**Calcul de l'emplacement et de la numérotation.** Un emplacement est le couple (numeroPage, ordre) : numeroPage est
la page du PDF après laquelle la page s'insère (0 : avant la première, nbPages : après la dernière) ; ordre est son
rang parmi les pages déjà insérées au même endroit (0 : juste après la page du PDF). Il est valide si 0 ≤ numeroPage
≤ nbPages et 0 ≤ ordre ≤ n, avec n le nombre de pages déjà insérées à cet endroit. Les pages de rang supérieur ou
égal au même endroit sont décalées de 1.

La numérotation affichée dans E3 est calculée par le front, jamais stockée : une page p du PDF est en position p +
(nombre de pages insérées avec numeroPage < p) ; une page insérée (n, o) est en position n + (nombre de pages
insérées avec numeroPage < n) + o + 1. Exemple : PDF de 12 pages avec une page de quiz déjà en (2, 0) ; une insertion
en (4, 0) donne la position 4 + 1 + 0 + 1 = 6, et la page 5 du PDF passe en position 7.

Le repère de texte est extrait par le navigateur avec PDF.js : les 300 derniers caractères de la page numeroPage (les
300 premiers de la page 1 si numeroPage vaut 0), espaces normalisés ; il est absent si la page n'a pas de texte (page
scannée). Il sert à recalculer l'emplacement quand une nouvelle version du PDF est importée (UC6).

**Valeurs par défaut.** À l’insertion, le nouveau quiz et la nouvelle question reçoivent les valeurs suivantes.

Nouveau quiz : titre « Quiz n » (n = nombre de quiz du cours + 1), non noté, durée par défaut 20 s (valeur proposée,
dans les bornes de l'élément 8 de E3), passage manuel à la question suivante, affichage du cours PROJETE_SEUL.

Nouvelle question : type QCM, énoncé vide, durée du quiz (dureeSec nul), 1 000 points maximum, décroissance avec le
temps, sans points partiels, non verrouillée. Elle est incomplète : « Lancer la présentation » reste désactivé
jusqu'à son paramétrage (UC4).

Le contrat détaillé de la route POST /api/cours/{idCours}/pages-quiz (requête, réponse et erreurs) est donné dans la
partie « Services API » ; les fiches des méthodes sont dans la partie « Services fonctionnels ».

### Autre diagramme : diagramme de classes

Le back-end suit la clean architecture du projet (domaine, application, infrastructure), rangée dans features/cours/,
à côté de l'import. Le front applique le même découpage (features/cours/ : api, domain, application, presentation).

*Figure 17 – Insérer une page de quiz dans le cours : diagramme de classes.*

Diagramme de classes UML. Légende : gris = Infrastructure, bleu = Application, jaune = Domaine ; flèche pointillée à
pointe ouverte = dépendance ; flèche pointillée à triangle = implémentation ; flèche pleine à triangle = héritage ;
trait à losange plein = composition. Un nom de méthode souligné est statique.

**Couche infrastructure (gris)**

- **PageQuizController** «controller REST»
  - attribut : `- insererPageQuiz : InsererPageQuizUseCase`
  - méthode : `+ inserer(idCours, @Valid InsererPageQuizRequest, session) : ResponseEntity<PageQuizResponse>
    (@PostMapping /api/cours/{idCours}/pages-quiz)`
- **InsererPageQuizRequest** «record»
  - `- idVersion : Long (@NotNull)`
  - `- numeroPage : Integer (@NotNull, @Min 0)`
  - `- ordre : Integer (@NotNull, @Min 0)`
  - `- idQuiz : Long (facultatif)`
  - `- repereTexte : String (@Size max 300)`
- **PageQuizMapper**
  - méthode statique : `+ versReponse(r : PageQuizInseree) : PageQuizResponse`
- **PageQuizResponse** «record»
  - `- idPage, idQuiz, idQuestion : Long`
  - `- titreQuiz : String`
  - `- quizCree : boolean`
  - `- numeroPage, ordre : int`
  - `- pages : List<PageResumeResponse>`
- **GestionnaireErreurs (shared)** «RestControllerAdvice» : « exception métier → code HTTP, corps commun (error,
  request_id, champs) ».
- **PostgresCoursRepository** : « SELECT ... FOR UPDATE (PESSIMISTIC_WRITE), filtré sur idEnseignant ; entités JPA →
  domaine ».
- **PostgresQuizRepository** : « QuizEntity + QuestionEntity (cascade) ; estEnSeance : SESSION_QUIZ.etat = EN_COURS ».
- **PostgresPageInsereeRepository** : « UPDATE ordre = ordre + 1 en une requête ; UNIQUE (idVersion, numeroPage,
  ordre) DEFERRABLE INITIALLY DEFERRED ».

**Couche application (bleu)**

- **InsererPageQuizUseCase**
  - attributs : `- cours : CoursRepository`, `- quiz : QuizRepository`, `- pages : PageInsereeRepository`
  - méthode : `+ executer(dto : InsererPageQuizDto) : PageQuizInseree (@Transactional)`
- **InsererPageQuizDto** «record»
  - `- idCours, idEnseignant, idVersion : Long`
  - `- numeroPage, ordre : int`
  - `- idQuiz : Long (null : nouveau quiz)`
  - `- repereTexte : String`
- **PageQuizInseree** «record»
  - `- page : PageQuiz`
  - `- quiz : Quiz`
  - `- quizCree : boolean`
  - `- pages : List<PageInseree>`
- **CoursRepository** «interface»
  - `+ trouverPourModification(idCours, idEnseignant) : Optional<Cours>`
- **QuizRepository** «interface»
  - `+ trouverDansCours(idQuiz, idCours) : Optional<Quiz>`
  - `+ estEnSeance(idQuiz) : boolean`
  - `+ compterParCours(idCours) : int`
  - `+ enregistrer(quiz) : Quiz`
- **PageInsereeRepository** «interface»
  - `+ compterA(idVersion, numeroPage) : int`
  - `+ decalerOrdres(idVersion, numeroPage, aPartirDe) : void`
  - `+ enregistrer(page) : PageQuiz`
  - `+ listerParVersion(idVersion) : List<PageInseree>`

**Couche domaine (jaune)**

- **Cours** «agrégat»
  - attributs : `- idCours, idEnseignant : Long`, `- archive : boolean`, `- versions : List<VersionCours>`
  - méthodes : `+ verifierModifiable() : void`, `+ verifierVersion(idVersion) : VersionCours`
- **VersionCours**
  - attributs : `- idVersion : Long`, `- numero, nbPages : int`
  - méthode : `+ verifierEmplacement(numeroPage, ordre, nbAuMemeEndroit) : void`
- **Quiz** «agrégat»
  - attributs : `- idQuiz, idCours : Long`, `- titre : String`, `- estNote : boolean`, `- dureeParDefautSec : int`,
    `- archive : boolean`, `- questions : List<Question>`
  - méthodes : `+ nouveau(idCours, numero) : Quiz`, `+ ajouterQuestionVierge() : Question`
- **Question**
  - attributs : `- idQuestion : Long`, `- type : TypeQuestion`, `- enonce : String`, `- dureeSec : Integer`,
    `- verrouillee : boolean`
  - méthodes : `+ vierge() : Question` (statique), `+ estComplete() : boolean`
- **Bareme** «value object»
  - attributs : `- pointsMax : int (1000)`, `- decroissanceTemps : boolean`, `- pointsPartiels : boolean`
  - méthode statique : `+ parDefaut() : Bareme`
- **PageInseree** «abstract» (nom en italique)
  - attributs : `- idPage, idVersion : Long`, `- numeroPage, ordre : int`, `- repereTexte : String`,
    `- valide : boolean`
- **PageQuiz**
  - attribut : `- idQuestion : Long`
  - méthode statique : `+ creer(idVersion, numeroPage, ordre, repereTexte, idQuestion) : PageQuiz`
- **Exceptions métier** «exceptions» :
  - CoursIntrouvableException → 404
  - CoursArchiveException → 409
  - VersionPerimeeException → 409
  - EmplacementInvalideException → 422
  - QuizIntrouvableException → 404
  - QuizEnSeanceException → 409

**Relations**

- PageQuizController → InsererPageQuizUseCase : dépendance « utilise ».
- PageQuizController → InsererPageQuizRequest : dépendance « reçoit ».
- PageQuizController → PageQuizMapper : dépendance « utilise ».
- PageQuizMapper → PageQuizResponse : dépendance « crée ».
- InsererPageQuizUseCase → InsererPageQuizDto : dépendance « reçoit ».
- InsererPageQuizUseCase → PageQuizInseree : dépendance « crée ».
- InsererPageQuizUseCase → Cours : dépendance « utilise ».
- InsererPageQuizUseCase → CoursRepository, QuizRepository et PageInsereeRepository : dépendance « utilise ».
- Cours ◆— VersionCours : composition, multiplicité 1..* côté VersionCours.
- Cours ◆— Quiz : composition, multiplicité * côté Quiz.
- Quiz ◆— Question : composition, multiplicité 1..* côté Question.
- Question ◆— Bareme : composition, multiplicité 1 côté Bareme.
- VersionCours (1) — PageInseree (*) : association « placée dans ».
- PageQuiz ▷ PageInseree : héritage.
- PageQuiz (0..1) — Question (1) : association « porte ».
- PostgresCoursRepository ⇢▷ CoursRepository, PostgresQuizRepository ⇢▷ QuizRepository (libellé « implémente »),
  PostgresPageInsereeRepository ⇢▷ PageInsereeRepository : implémentation.

## Spécifications techniques

### Contrat de la route POST /api/cours/{idCours}/pages-quiz

| Rubrique | Contenu |
|---|---|
| Route | PageQuizController.inserer (@PostMapping), qui appelle InsererPageQuizUseCase |
| Accès | Enseignant propriétaire du cours ; idEnseignant lu dans la session, jamais dans la requête |
| Requête | JSON : idVersion, numeroPage et ordre (obligatoires, entiers positifs ou nuls), idQuiz (facultatif : absent pour créer un nouveau quiz), repereTexte (facultatif, 300 caractères au plus) |
| Réponse | 201 Created, en-tête Location /api/cours/{idCours}/pages/{idPage}, corps PageQuizResponse (idPage, idQuiz, titreQuiz, quizCree, idQuestion, numeroPage, ordre, et pages : liste à jour des pages insérées de la version avec idPage, numeroPage, ordre et type) |
| Erreurs | Corps au format commun (error, request_id, champs) : codes du tableau « Cas d'erreur » |
| Appelée par | Front : features/cours/api, par le client HTTP commun (shared/http) |

## Services fonctionnels

Chaque fiche décrit une méthode appelée par le cas d'utilisation « Insérer une page de quiz dans le cours » : la
méthode du cas d'usage, les méthodes du domaine et les méthodes des interfaces dont dépend le cas d'usage. Les
signatures sont en Java ; les exceptions sont celles du tableau des cas d'erreur (partie « Définition »). La ligne
« API qui expose le service » indique la route REST qui déclenche la méthode.

### Interface de la méthode executer (InsererPageQuizUseCase)

| | |
|---|---|
| Nom de la méthode | executer |
| Classe ou interface | InsererPageQuizUseCase : classe du cas d'usage, couche application ; reçoit CoursRepository, QuizRepository et PageInsereeRepository par son constructeur ; appelée par PageQuizController |
| Données renvoyées | PageQuizInseree : la page créée, son quiz (créé ou non) et la liste à jour des pages insérées de la version |
| Paramètres d'entrée | InsererPageQuizDto dto |
| Exceptions levées | CoursIntrouvableException, CoursArchiveException, VersionPerimeeException, EmplacementInvalideException, QuizIntrouvableException, QuizEnSeanceException |
| API qui expose le service | POST /api/cours/{idCours}/pages-quiz (PageQuizController.inserer) : voir le contrat de la route |

```java
@Transactional
public PageQuizInseree executer(InsererPageQuizDto dto)
```

### Interface de la méthode verifierEmplacement (VersionCours)

| | |
|---|---|
| Nom de la méthode | verifierEmplacement |
| Classe ou interface | VersionCours : entité de l'agrégat Cours (domaine) |
| Données renvoyées | Aucune (void) |
| Paramètres d'entrée | int numeroPage, int ordre, int nbAuMemeEndroit |
| Exceptions levées | EmplacementInvalideException si numeroPage est hors de 0..nbPages ou si ordre est hors de 0..nbAuMemeEndroit |
| API qui expose le service | Aucune : méthode du domaine, appelée par InsererPageQuizUseCase.executer |

```java
public void verifierEmplacement(int numeroPage, int ordre,
             int nbAuMemeEndroit)
```

### Interface de la méthode nouveau (Quiz)

| | |
|---|---|
| Nom de la méthode | nouveau |
| Classe ou interface | Quiz : agrégat du domaine, méthode statique de fabrication |
| Données renvoyées | Quiz : le nouveau quiz, sans question et avec les réglages par défaut, non encore enregistré |
| Paramètres d'entrée | Long idCours, int numero |
| Exceptions levées | IllegalArgumentException si numero < 1 : erreur de programmation, car la valeur vient du dépôt |
| API qui expose le service | Aucune : méthode du domaine, appelée par InsererPageQuizUseCase.executer |

```java
public static Quiz nouveau(Long idCours, int numero)
```

### Interface de la méthode ajouterQuestionVierge (Quiz)

| | |
|---|---|
| Nom de la méthode | ajouterQuestionVierge |
| Classe ou interface | Quiz : agrégat du domaine ; ajoute en fin de quiz une question créée par Question.vierge() |
| Données renvoyées | Question : la question ajoutée, sans identifiant jusqu'à l'enregistrement du quiz |
| Paramètres d'entrée | Aucun |
| Exceptions levées | IllegalStateException si le quiz est archivé : erreur de programmation, car le dépôt ne renvoie que des quiz non archivés |
| API qui expose le service | Aucune : méthode du domaine, appelée par InsererPageQuizUseCase.executer |

```java
public Question ajouterQuestionVierge()
```

### Interface de la méthode creer (PageQuiz)

| | |
|---|---|
| Nom de la méthode | creer |
| Classe ou interface | PageQuiz : entité du domaine, sous-classe de PageInseree, méthode statique de fabrication ; nettoie le repère de texte (espaces normalisés, vide remplacé par null, 300 caractères au plus) et fixe valide à vrai |
| Données renvoyées | PageQuiz : la nouvelle page, non encore enregistrée |
| Paramètres d'entrée | Long idVersion, int numeroPage, int ordre, String repereTexte, Long idQuestion |
| Exceptions levées | IllegalArgumentException si idVersion ou idQuestion est nul : erreur de programmation |
| API qui expose le service | Aucune : méthode du domaine, appelée par InsererPageQuizUseCase.executer |

```java
public static PageQuiz creer(Long idVersion, int numeroPage,
             int ordre, String repereTexte, Long idQuestion)
```

### Interface de la méthode trouverPourModification (CoursRepository)

| | |
|---|---|
| Nom de la méthode | trouverPourModification |
| Classe ou interface | CoursRepository : interface de la couche application, implémentée par PostgresCoursRepository (verrou PESSIMISTIC_WRITE sur la ligne COURS, entités JPA converties vers le domaine) |
| Données renvoyées | Optional<Cours> : le cours avec ses versions, vide si le cours n'existe pas ou appartient à un autre enseignant |
| Paramètres d'entrée | Long idCours, Long idEnseignant |
| Exceptions levées | Aucune |
| API qui expose le service | Aucune : méthode interne, appelée par InsererPageQuizUseCase.executer (POST /api/cours/{idCours}/pages-quiz) |

```java
Optional<Cours> trouverPourModification(Long idCours, Long
idEnseignant)
```

### Interface de la méthode estEnSeance (QuizRepository)

| | |
|---|---|
| Nom de la méthode | estEnSeance |
| Classe ou interface | QuizRepository : interface de la couche application, implémentée par PostgresQuizRepository (lecture de SESSION_QUIZ) |
| Données renvoyées | boolean : vrai si une session du quiz est à l'état EN_COURS |
| Paramètres d'entrée | Long idQuiz |
| Exceptions levées | Aucune |
| API qui expose le service | Aucune : méthode interne, appelée par InsererPageQuizUseCase.executer (POST /api/cours/{idCours}/pages-quiz) |

```java
boolean estEnSeance(Long idQuiz)
```

### Interface de la méthode decalerOrdres (PageInsereeRepository)

| | |
|---|---|
| Nom de la méthode | decalerOrdres |
| Classe ou interface | PageInsereeRepository : interface de la couche application, implémentée par PostgresPageInsereeRepository (une seule requête UPDATE ordre = ordre + 1 sur les pages de la version au même numeroPage et de rang supérieur ou égal) |
| Données renvoyées | Aucune (void) |
| Paramètres d'entrée | Long idVersion, int numeroPage, int aPartirDe |
| Exceptions levées | Aucune exception métier ; une erreur de base remonte en exception Spring non contrôlée, la transaction est annulée et l'erreur est traduite en ERREUR_SERVEUR |
| API qui expose le service | Aucune : méthode interne, appelée par InsererPageQuizUseCase.executer (POST /api/cours/{idCours}/pages-quiz) |

```java
void decalerOrdres(Long idVersion, int numeroPage, int aPartirDe)
```

### Interface de la méthode enregistrer (PageInsereeRepository)

| | |
|---|---|
| Nom de la méthode | enregistrer |
| Classe ou interface | PageInsereeRepository : interface de la couche application, implémentée par PostgresPageInsereeRepository (entité JPA PageInsereeEntity, écriture forcée par flush) |
| Données renvoyées | PageQuiz : la page avec son identifiant |
| Paramètres d'entrée | PageQuiz page |
| Exceptions levées | Aucune exception métier ; une violation de contrainte ou une autre erreur de base remonte en exception Spring non contrôlée, la transaction est annulée et l'erreur est traduite en ERREUR_SERVEUR |
| API qui expose le service | Aucune : méthode interne, appelée par InsererPageQuizUseCase.executer (POST /api/cours/{idCours}/pages-quiz) |

```java
PageQuiz enregistrer(PageQuiz page)
```

## Écran E3 « Éditeur cours + quiz » (cahier des charges, partie 5.2.3)

Éléments utilisés par ce cas (extrait du tableau qui accompagne la maquette de la Figure 30 du cahier des charges) :

| N° | Élément | Type et contenu | Règles et comportement |
|---|---|---|---|
| 1 | Titre et version | Texte | Lecture seule |
| 2 | Pages du cours | Miniatures des pages du cours et des pages de quiz | Les pages de quiz sont distinguées par la couleur et par une icône ; cliquer sélectionne la page et l'affiche en 4 |
| 3 | Insérer un quiz ici | Bouton entre deux pages | Crée une page de quiz (une question) à cet emplacement (UC3) |
| 4 | Aperçu de la page | Rendu de la page sélectionnée | Lecture seule |
| 11 | Lancer la présentation | Bouton | Ouvre E5 ; désactivé si une question est incomplète (UC7) |

## Routes de lecture (source : API.md du back, absentes du dossier)

> **À confirmer.** Ces routes ne figurent pas dans le dossier de conception : E3 en a besoin pour afficher le cours,
> ses pages insérées et la liste des quiz avant l'insertion. Elles sont reprises du tableau §3 du `docs/API.md` du
> back (branches `develop` et `feature/uc3-inserer-page-quiz`, même texte sur les deux) ; la forme de leurs réponses
> n'y est pas détaillée.

| Méthode | Route | Accès | Prio | Description (texte du back) | Statut |
|---|---|---|---|---|---|
| `GET` | `/api/cours/{idCours}` | Ens. | M | Détail d'un cours et de ses versions | à confirmer |
| `GET` | `/api/cours/{idCours}/versions/{idVersion}/fichier` | Ens. ou Étu. de la séance | M | Le PDF (`application/pdf`), jamais servi en accès direct | à confirmer |
| `GET` | `/api/cours/{idCours}/versions/{idVersion}/pages` | Ens. | M | Pages insérées de la version, dans l'ordre | à confirmer |
| `GET` | `/api/cours/{idCours}/quiz` | Ens. | M | Quiz du cours | à confirmer |
