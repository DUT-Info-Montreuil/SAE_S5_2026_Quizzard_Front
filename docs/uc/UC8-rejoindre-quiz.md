# Cas d'utilisation : Rejoindre un quiz (UC8)

> Conversion en Markdown de la partie UC8 du dossier `docs/uc/Sae Kahoot (3).pdf` (partie 4.3 « Cas d'utilisation
> UC8 : Rejoindre un quiz », partie 5.1.3 « Services API », partie 5.2.3 « Services fonctionnels », éléments E7-1 à
> E7-5 de l'écran E7 et ligne « Droit à l'information » du §4.4). Les textes, codes et messages sont repris mot pour
> mot. Les figures (images dans le PDF) sont remplacées par une description textuelle complète.

## Définition

En tant qu'étudiant,
Je souhaite rejoindre le quiz lancé par l'enseignant, en scannant le QR code ou en ouvrant le lien, avec un simple
pseudonyme,
Afin de participer depuis mon téléphone ou mon ordinateur, même si le quiz a déjà commencé (cas « Répondre à une
question »).

**Objets métier :** SessionQuiz et Participant (voir la partie 3.3 du dossier, Figure 10).

Le cas utilise aussi des structures techniques, visibles dans le diagramme de classes (Figure 19) : les objets de
valeur Pseudonyme et JetonParticipant, les données reçues (RejoindreSessionDto), les résultats des cas d'usage
(ParticipantRejoint, SessionPublique) et les réponses envoyées au navigateur (ParticipantRejointResponse,
SessionPubliqueResponse). Le code d'accès est lu dans l'adresse ; aucun compte ni aucune session n'est demandé.

**Écran :** E7 « Rejoindre », éléments 1 « Titre », 2 « Pseudonyme », 3 « Entrer dans le quiz » et 5 « Mention
d'information » (disponible dans le cahier des charges), puis E8 « Question ». Côté enseignant, le compteur de
connectés de E5 se met à jour.

**Hors périmètre :** connexion avec le compte IUT pour un quiz noté (cas « S'authentifier à un quiz noté », élément 4
de E7), lancement de la séance et QR code (cas « Lancer un quiz en séance »), réponse aux questions (cas « Répondre à
une question »), reprise après une coupure réseau et limite du nombre d'entrées par appareil (seuil à fixer).

L'étudiant rejoint une séance lancée par l'enseignant, avant la première question (état PREPAREE) ou pendant le quiz
(état EN_COURS) ; une séance close (CLOTUREE) refuse toute entrée. Pour un quiz non noté, aucun compte n'est
demandé : l'étudiant choisit un pseudonyme de 2 à 20 caractères, unique dans la séance, et un autre pseudonyme lui
est proposé en cas de doublon (règles à valider avec le client, « Points à clarifier », point 19). Un quiz noté
refuse l'entrée sans compte et renvoie vers la connexion avec le compte IUT. Le serveur remet au participant un jeton
secret, qui lui sert ensuite à répondre et à se reconnecter ; seule l'empreinte du jeton est stockée. Un étudiant qui
arrive en retard rejoint la question en cours, sans points pour les questions manquées. Ni le pseudonyme ni le jeton
n'apparaissent dans les logs ou les messages d'erreur.

## Cas d'erreur

| Cas | Exception levée (couche) | HTTP | Message affiché |
|---|---|---|---|
| Code d'accès inconnu | SessionIntrouvableException (domaine), levée par le cas d'usage | 404 | « Ce quiz n'existe pas : vérifie le lien ou scanne à nouveau le QR code. » |
| Séance clôturée | SessionCloseException (domaine), levée par SessionQuiz | 409 | « Ce quiz est terminé. » |
| Quiz noté, entrée sans compte | ConnexionIutRequiseException (domaine), levée par SessionQuiz | 409 | « Ce quiz est noté : connecte-toi avec ton compte IUT. » |
| Pseudonyme absent, vide ou trop long | Validation du controller (@NotBlank, @Size), puis PseudonymeInvalideException (domaine) en dernier rempart | 422 | « Ton pseudonyme doit faire de 2 à 20 caractères. » |
| Pseudonyme déjà pris dans la séance | PseudonymeDejaPrisException (domaine), levée par le cas d'usage avec un pseudonyme proposé | 409 | « Ce pseudonyme est déjà pris. Essaie celui qui t'est proposé. » |
| Même pseudonyme envoyé au même instant par deux étudiants | PseudonymeDejaPrisException (domaine), levée par PostgresParticipantRepository quand la contrainte d'unicité est violée (sans proposition) | 409 | « Ce pseudonyme est déjà pris. » |
| Erreur d'écriture en base | Erreur d'accès aux données (Spring) | 500 | « Une erreur est survenue. Réessayez dans un instant. » La transaction est annulée : aucun participant n'est créé. |

> Le tableau du PDF n'a pas de colonne « Code » (contrairement à celui de l'UC9). Dans la dernière ligne, « La
> transaction est annulée : aucun participant n'est créé. » est écrit hors des guillemets : c'est une précision sur le
> comportement, pas une partie du message affiché.

## Diagrammes

Le cas d'utilisation est décrit par trois diagrammes : les étapes fonctionnelles, la séquence des appels et, en
complément, les classes du back-end utilisées.

### Diagramme des étapes fonctionnelles du CU

Le diagramme des étapes fonctionnelles répartit les étapes entre l'étudiant, le navigateur et le serveur. Il couvre
les deux appels du cas : la lecture du quiz à l'ouverture du lien, puis l'entrée dans la séance. Les contrôles du
navigateur évitent un envoi inutile, ceux du serveur font foi. Côté serveur, chaque contrôle en échec lève une
exception nommée, que le gestionnaire global des erreurs traduit en code HTTP. Les losanges jaunes sont des contrôles
de l'application ; le bouton cliqué par l'étudiant est en bleu foncé ; côté serveur, chaque étape indique la méthode
appelée.

*Figure 17 – Rejoindre un quiz : étapes fonctionnelles*

Diagramme d'activité à trois couloirs : **Étudiant**, **Navigateur (React)**, **Serveur (Spring Boot)**.
Code couleur : bleu clair = étape, jaune = décision (contrôle), bleu foncé = bouton cliqué par l'étudiant,
orange = erreur (suivie d'un nœud final), vert = fin réussie.

**Première partie : lecture du quiz (GET)**

1. *Étudiant* — Nœud initial, puis « Scanner le QR code ou ouvrir le lien ».
2. *Navigateur* — « Demander le quiz : GET /api/public/sessions/{code} ».
3. *Serveur* — « SessionPubliqueController.consulter(code) ».
4. *Serveur* — « ConsulterSessionPubliqueUseCase.executer(code) ».
5. *Serveur* — « SessionQuizRepository.trouverParCodeAcces(code) ».
6. *Serveur* — Décision « Code inconnu ? »
   - **[oui]** : « 404 SessionIntrouvableException » (orange), puis fin.
   - **[non]** : suite.
7. *Serveur* — « SessionQuiz.verifierOuverte() ».
8. *Serveur* — Décision « Séance close ? »
   - **[oui]** : « 409 SessionCloseException » (orange), puis fin.
   - **[non]** : suite.
9. *Serveur* — « InformationsQuiz.titres(idQuiz) ».
10. *Serveur* — « SessionPubliqueMapper.versReponse(…) 200 OK ».
11. *Serveur → Navigateur* — *Navigateur* : décision « Quiz noté ? »
    - **[oui]** : « Afficher la connexion IUT (UC15, E7-4) », puis fin.
    - **[non]** : « Afficher E7 : titres, champ pseudonyme, mention (E7-1, E7-5) ».

**Deuxième partie : entrée dans la séance (POST)**

12. *Navigateur → Étudiant* — *Étudiant* : « Saisir un pseudonyme (E7-2) ».
13. *Étudiant* — « Cliquer sur « Entrer dans le quiz » (E7-3) » (bouton, bleu foncé).
14. *Navigateur* — Décision « Pseudonyme vide ou plus de 20 caractères ? »
    - **[oui]** : « Afficher l'erreur », puis retour à « Saisir un pseudonyme (E7-2) » (étudiant).
    - **[non]** : suite.
15. *Navigateur* — « Envoyer le pseudonyme : POST …/sessions/{code}/participants ».
16. *Serveur* — Décision « Pseudonyme invalide ? (@Valid) »
    - **[oui]** : « 422 MethodArgumentNotValidException » (orange), puis fin.
    - **[non]** : suite.
17. *Serveur* — « SessionPubliqueController.rejoindre(…) ».
18. *Serveur* — « RejoindreSessionUseCase.executer(dto) ».
19. *Serveur* — « SessionQuizRepository.trouverParCodeAcces(code) ».
20. *Serveur* — Décision « Code inconnu ? »
    - **[oui]** : « 404 SessionIntrouvableException » (orange), puis fin.
    - **[non]** : suite.
21. *Serveur* — « SessionQuiz.verifierEntreeSansCompte() ».
22. *Serveur* — Décision « Séance close ou quiz noté ? »
    - **[oui]** : « 409 SessionClose- ou ConnexionIutRequiseException » (orange), puis fin.
    - **[non]** : suite.
23. *Serveur* — « Pseudonyme.de(texte) ».
24. *Serveur* — Décision « Pseudonyme invalide ? »
    - **[oui]** : « 422 PseudonymeInvalideException » (orange), puis fin.
    - **[non]** : suite.
25. *Serveur* — « ParticipantRepository.existePseudonyme(…) ».
26. *Serveur* — Décision « Pseudonyme pris ? »
    - **[oui]** : « 409 PseudonymeDejaPrisException (proposerAlternative ; JournalEvenements.regleRefusee) »
      (orange) → *Navigateur* : « Afficher le pseudonyme proposé » → *Étudiant* : « Prendre la suggestion ou saisir
      un autre pseudonyme », puis retour à « Saisir un pseudonyme (E7-2) ».
    - **[non]** : suite.
27. *Serveur* — « GenerateurJeton.generer() ».
28. *Serveur* — « Participant.rejoindre(…) ».
29. *Serveur* — « ParticipantRepository.enregistrer(participant) ».
30. *Serveur* — « JournalEvenements.evenement(…) ».
31. *Serveur* — Décision « Enregistrement réussi ? »
    - **[non]** : « 409 (doublon simultané) ou 500 (rollback : rien n'est créé) » (orange), puis fin.
    - **[oui]** : suite.
32. *Serveur* — « Après commit : DiffuseurTempsReel.signalerConnectes(code, nombre) ».
33. *Serveur* — « SessionPubliqueMapper.versReponse(…) 201 Created ».
34. *Serveur → Navigateur* — *Navigateur* : « Garder le jeton, se connecter en STOMP, lire GET /etat » (vert).
35. *Navigateur* — Décision « Quiz déjà commencé ? »
    - **[oui]** : « E8 : question en cours (bandeau d'arrivée) » (vert), puis fin.
    - **[non]** : « E8 : attente de la première question » (vert), puis fin.

### Diagramme de séquence

Le diagramme de séquence montre l'ordre des appels entre les classes du back-end (détaillées dans le diagramme de
classes), de l'étudiant jusqu'à la base de données. Dans les blocs ALT, la partie verte est le scénario nominal et la
partie rouge le cas d'erreur.

*Figure 18 – Rejoindre un quiz : diagramme de séquence (flèche pleine : appel ; pointillée : retour)*

**Participants (de gauche à droite)** : Étudiant (acteur), Navigateur (React), Spring (MVC),
SessionPubliqueController, ConsulterSessionPubliqueUseCase, RejoindreSessionUseCase, SessionQuiz / Participant /
Pseudonyme, SessionQuizRepository, InformationsQuiz, ParticipantRepository, GenerateurJeton, JournalEvenements,
DiffuseurTempsReel.

**Lecture du quiz**

1. Étudiant → Navigateur : « scanne le QR code ou ouvre le lien ».
2. Navigateur → Spring : « GET /api/public/sessions/{code} ».
3. Spring → SessionPubliqueController : « consulter(code) ».
4. SessionPubliqueController → ConsulterSessionPubliqueUseCase : « executer(code) ».
5. ConsulterSessionPubliqueUseCase → SessionQuizRepository : « trouverParCodeAcces(code) » ; retour
   « Optional<SessionQuiz> ».
6. ConsulterSessionPubliqueUseCase → SessionQuiz : « verifierOuverte() ».
7. **alt**
   - *[Code inconnu ou séance close]* (rouge) : ConsulterSessionPubliqueUseCase ⇢ Navigateur : « 404 / 409 » ;
     Navigateur ⇢ Étudiant : « message d'erreur ».
   - *[Séance ouverte]* (vert) : ConsulterSessionPubliqueUseCase → InformationsQuiz : « titres(idQuiz) » ; retour
     « TitresQuiz » ; ConsulterSessionPubliqueUseCase ⇢ SessionPubliqueController : « SessionPublique » ;
     SessionPubliqueController → lui-même : « SessionPubliqueMapper.versReponse(…) » ; SessionPubliqueController ⇢
     Navigateur : « 200 OK + SessionPubliqueResponse ».
8. **alt**
   - *[Quiz noté]* (rouge) : Navigateur ⇢ Étudiant : « connexion avec le compte IUT (UC15) ».
   - *[Quiz non noté]* (vert) : Navigateur ⇢ Étudiant : « écran E7 (titres, pseudonyme) ».

**Entrée dans la séance**

9. Étudiant → Navigateur : « saisit un pseudonyme et clique sur « Entrer dans le quiz » ».
10. **alt**
    - *[Pseudonyme vide ou de plus de 20 caractères]* (rouge) : Navigateur ⇢ Étudiant : « message d'erreur ».
    - *[Pseudonyme accepté]* (vert) : Navigateur → Spring : « POST /api/public/sessions/{code}/participants
      (pseudonyme) ».
11. **alt**
    - *[Pseudonyme invalide (@Valid)]* (rouge) : Spring → SessionPubliqueController : « rejoindre(code, requete) » ;
      SessionPubliqueController ⇢ Navigateur : « 422 ».
    - *[Requête valide]* (vert) : Spring → SessionPubliqueController : « rejoindre(code, requete) ».
12. SessionPubliqueController → lui-même : « construire RejoindreSessionDto ».
13. SessionPubliqueController → RejoindreSessionUseCase : « executer(dto) ».
14. RejoindreSessionUseCase → SessionQuizRepository : « trouverParCodeAcces(code) » ; retour
    « Optional<SessionQuiz> ».
15. RejoindreSessionUseCase → SessionQuiz : « verifierEntreeSansCompte() ».
16. **alt**
    - *[Code inconnu, séance close ou quiz noté]* (rouge) : RejoindreSessionUseCase ⇢ Navigateur : « 404 / 409 ».
    - *[Entrée ouverte]* (vert) : RejoindreSessionUseCase → Pseudonyme : « Pseudonyme.de(texte) ».
17. **alt**
    - *[Pseudonyme invalide]* (rouge) : Pseudonyme ⇢ RejoindreSessionUseCase : « PseudonymeInvalideException » ;
      RejoindreSessionUseCase ⇢ Navigateur : « 422 ».
    - *[Pseudonyme valide]* (vert) : Pseudonyme ⇢ RejoindreSessionUseCase : « pseudonyme ».
18. RejoindreSessionUseCase → ParticipantRepository : « existePseudonyme(idSession, pseudonyme) » ; retour
    « boolean ».
19. **alt**
    - *[Pseudonyme déjà pris]* (rouge) : RejoindreSessionUseCase → ParticipantRepository :
      « pseudonymesDeLaSession(idSession) » ; retour « Set<String> » ; RejoindreSessionUseCase → Pseudonyme :
      « proposerAlternative(pris) » ; RejoindreSessionUseCase → JournalEvenements :
      « regleRefusee("entree_refusee_pseudonyme_pris", champs) » ; RejoindreSessionUseCase ⇢ Navigateur :
      « 409 PseudonymeDejaPrisException + suggestion » ; Navigateur ⇢ Étudiant : « pseudonyme proposé ».
    - *[Pseudonyme libre]* (vert) : suite.
20. RejoindreSessionUseCase → GenerateurJeton : « generer() » ; retour « JetonParticipant (valeur, empreinte) ».
21. RejoindreSessionUseCase → Participant : « Participant.rejoindre(idSession, pseudonyme, empreinte, maintenant) » ;
    retour « participant ».
22. **alt**
    - *[Enregistrement réussi]* (vert) : RejoindreSessionUseCase → ParticipantRepository : « enregistrer(participant)
      avec flush » ; retour « participant (avec identifiant) » ; RejoindreSessionUseCase → JournalEvenements :
      « evenement("participant_entre", champs) » ; RejoindreSessionUseCase → ParticipantRepository :
      « compter(idSession) » ; retour « nombre » ; RejoindreSessionUseCase → DiffuseurTempsReel :
      « signalerConnectes(code, nombre), après commit ».
    - *[Doublon simultané ou erreur de base]* (rouge) : note « Rollback : rien n'est créé » ;
      RejoindreSessionUseCase ⇢ Navigateur : « 409 / 500 ».
23. RejoindreSessionUseCase ⇢ SessionPubliqueController : « ParticipantRejoint ».
24. SessionPubliqueController → lui-même : « SessionPubliqueMapper.versReponse(…) ».
25. SessionPubliqueController ⇢ Navigateur : « 201 Created + ParticipantRejointResponse ».
26. Navigateur ⇢ Étudiant : « écran E8 (attente ou question en cours) ».

**Légende** : vert = Scénario nominal ; rouge = Cas d'erreur. Note en bas : « Erreurs : GestionnaireErreurs traduit
l'exception en code HTTP et en réponse au format commun (error, request_id, champs). »

**Transaction et temps réel.** L'entrée est tout ou rien : le participant est enregistré dans une seule transaction,
et l'écriture est forcée avant la fin du cas d'usage, pour qu'une erreur de base y soit détectée. Le nombre de
connectés n'est envoyé à l'écran E5 qu'une fois la transaction validée, pour ne jamais annoncer un participant refusé.
Si deux étudiants envoient le même pseudonyme au même instant, la contrainte d'unicité en base refuse le second, et le
dépôt traduit ce refus en PseudonymeDejaPrisException. L'entrée réussie (participant_entre) et les entrées refusées
(entree_refusee_…) sont tracées dans les logs seulement, sans donnée personnelle : ce ne sont pas des actions
sensibles.

## Pseudonyme et jeton

Le pseudonyme est nettoyé avant tout contrôle : espaces de début et de fin retirés, espaces multiples réduits à un
seul, normalisation Unicode NFC. Il doit ensuite faire de 2 à 20 caractères, sans caractère de contrôle. L'unicité se
compare à l'identique, comme la contrainte en base : « Alice » et « alice » sont deux pseudonymes (à valider). Le
pseudonyme proposé ajoute 2, 3, 4… à la fin, en raccourcissant pour rester à 20 caractères : « Alice » donne
« Alice2 ». Le jeton fait 32 octets tirés par SecureRandom, encodés en Base64url (43 caractères) ; la base ne garde
que son empreinte SHA-256 (64 caractères hexadécimaux), dans participant.jeton_reconnexion.

Le contrat détaillé des routes GET /api/public/sessions/{codeAcces} et POST
/api/public/sessions/{codeAcces}/participants (paramètres, codes retour et erreurs) est donné dans la partie
« Services API », et celui de chaque méthode appelée dans la partie « Services fonctionnels ».

### Autre diagramme : diagramme de classes

Le diagramme de classes montre les classes du back-end utilisées pour rejoindre un quiz, avec leurs attributs, leurs
méthodes et leurs liens. Le back-end suit une clean architecture en trois couches, repérées par la couleur de
l'en-tête : domaine, application et infrastructure. Le code est rangé par fonctionnalité : features/seance/ contient
les couches domain, application et infrastructure, et shared/ regroupe ce qui sert à plusieurs fonctionnalités
(journal des événements, catégories d'erreurs, gestionnaire global des erreurs). Les dépendances vont vers le
domaine : les cas d'usage ne connaissent que le domaine et des interfaces, implémentées en infrastructure. La
persistance passe par des entités JPA converties vers le domaine, qui ne dépend d'aucun framework. Les titres du cours
et du quiz sont lus par l'interface InformationsQuiz, propre à la fonctionnalité seance, pour ne pas dépendre de
l'infrastructure des fonctionnalités quiz et cours. Le cas d'usage reçoit une horloge pour dater l'entrée, ce qui rend
les tests reproductibles. Le front applique le même découpage (features/seance/ : api, domain, application,
presentation).

*Figure 19 – Rejoindre un quiz : diagramme de classes*

**Légende** : en-tête gris = Infrastructure ; bleu = Application ; jaune = Domaine. Flèche pointillée à pointe
ouverte = dépendance ; pointillée à triangle creux = implémentation ; trait plein à losange plein = composition.

**Infrastructure (gris)**

- **SessionPubliqueController** «controller REST»
  - attributs : `- consulterSession : ConsulterSessionPubliqueUseCase`, `- rejoindreSession : RejoindreSessionUseCase`
  - méthodes : `+ consulter(codeAcces) : SessionPubliqueResponse`, `+ rejoindre(codeAcces, @Valid requete)
    : ResponseEntity<ParticipantRejointResponse>`
  - liens : « utilise » RejoindreSessionUseCase, ConsulterSessionPubliqueUseCase et SessionPubliqueMapper ; « reçoit »
    RejoindreSessionRequest.
- **RejoindreSessionRequest** «record» : `- pseudonyme : String`, `@NotBlank, @Size(min = 2, max = 20)`.
- **SessionPubliqueMapper** : `+ versReponse(p : ParticipantRejoint) : ParticipantRejointResponse` et
  `+ versReponse(s : SessionPublique) : SessionPubliqueResponse` (statiques, soulignées) ; « crée »
  ParticipantRejointResponse et SessionPubliqueResponse.
- **ParticipantRejointResponse** «record» : `- idParticipant : Long`, `- jeton : String`, `- pseudonyme : String`.
- **SessionPubliqueResponse** «record» : `- titreCours : String`, `- titreQuiz : String`, `- estNotee : boolean`,
  `- etat : String`.
- **GestionnaireErreurs (shared)** «RestControllerAdvice» : « exception métier → statut HTTP (404, 409, 422) ;
  ReponseErreur : error, request_id, champs, suggestion (facultatif, à ajouter) ».
- **PostgresSessionQuizRepository** (implémente SessionQuizRepository) : « entité JPA SessionQuizEntity convertie vers
  le domaine ».
- **PostgresParticipantRepository** (implémente ParticipantRepository) : « ParticipantEntity ; saveAndFlush ; UNIQUE
  violée → PseudonymeDejaPris ».
- **SecureRandomGenerateurJeton** (implémente GenerateurJeton) : « 32 octets SecureRandom en Base64url ; empreinte
  SHA-256 en hexadécimal ».
- **PostgresInformationsQuiz** (implémente InformationsQuiz) : « lecture des titres du quiz et du cours ».
- **StompDiffuseurTempsReel** (implémente DiffuseurTempsReel) : « SimpMessagingTemplate, après commit ;
  /topic/sessions/{code}/connectes ».
- **PostgresJournalEvenements** (implémente JournalEvenements) : « INFO participant_entre ; WARN entree_refusee_… ».

**Application (bleu)**

- **RejoindreSessionUseCase**
  - attributs : `- sessions : SessionQuizRepository`, `- participants : ParticipantRepository`,
    `- generateurJeton : GenerateurJeton`, `- diffuseur : DiffuseurTempsReel`, `- journal : JournalEvenements`,
    `- horloge : Clock`
  - méthode : `+ executer(dto : RejoindreSessionDto) : ParticipantRejoint (@Transactional)`
  - liens : « reçoit » RejoindreSessionDto ; « crée » ParticipantRejoint et Participant ; « utilise » SessionQuiz et
    les interfaces SessionQuizRepository, ParticipantRepository, GenerateurJeton,
    DiffuseurTempsReel, JournalEvenements.
- **RejoindreSessionDto** «record» : `- codeAcces : String`, `- pseudonyme : String`.
- **ParticipantRejoint** «record» : `- idParticipant : Long`, `- jeton : String`, `- pseudonyme : String`.
- **ConsulterSessionPubliqueUseCase**
  - attributs : `- sessions : SessionQuizRepository`, `- informationsQuiz : InformationsQuiz`
  - méthode : `+ executer(codeAcces : String) : SessionPublique`
  - lien : « crée » SessionPublique.
- **SessionPublique** «record» : `- titreCours : String`, `- titreQuiz : String`, `- estNotee : boolean`,
  `- etat : EtatSession`.
- **SessionQuizRepository** «interface» : `+ trouverParCodeAcces(codeAcces) : Optional<SessionQuiz>`.
- **ParticipantRepository** «interface» : `+ existePseudonyme(idSession, pseudonyme) : boolean`,
  `+ pseudonymesDeLaSession(idSession) : Set<String>`, `+ enregistrer(participant) : Participant`,
  `+ compter(idSession) : int`.
- **GenerateurJeton** «interface» : `+ generer() : JetonParticipant`.
- **InformationsQuiz** «interface» : `+ titres(idQuiz) : TitresQuiz`.
- **DiffuseurTempsReel** «interface» : `+ signalerConnectes(codeAcces, nombre) : void`.
- **JournalEvenements (shared)** «interface» : `+ evenement(nom, champs) : void`, `+ regleRefusee(nom, champs) : void`.

**Domaine (jaune)**

- **SessionQuiz** «agrégat»
  - attributs : `- idSession : Long`, `- codeAcces : String`, `- etat : EtatSession`, `- estNotee : boolean`,
    `- positionCourante : int`
  - méthodes : `+ verifierOuverte() : void`, `+ verifierEntreeSansCompte() : void`
  - liens : association vers EtatSession ; composition (losange plein côté SessionQuiz, multiplicité 1) avec
    Participant (multiplicité *).
- **EtatSession** «enumeration» : PREPAREE, EN_COURS, CLOTUREE.
- **Participant**
  - attributs : `- idParticipant : Long`, `- pseudonyme : Pseudonyme`, `- empreinteJeton : String`,
    `- scoreTotal : int`, `- identiteVerifiee : boolean`, `- dateEntree : LocalDateTime`, `- idSession : Long`
  - méthode (statique, soulignée) : `+ rejoindre(idSession, pseudonyme, empreinteJeton, maintenant) : Participant`
  - lien : « porte » Pseudonyme.
- **Pseudonyme** «value object» : `- valeur : String` ; `+ de(texte : String) : Pseudonyme` (statique, soulignée),
  `+ proposerAlternative(pris : Set<String>) : Pseudonyme`.
- **JetonParticipant** «value object» : `- valeur : String`, `- empreinte : String`.
- **Exceptions métier (features/seance/domain)** «exceptions» :
  - SessionIntrouvableException ▷ ExceptionIntrouvable (404)
  - SessionCloseException ▷ ExceptionConflit (409)
  - ConnexionIutRequiseException ▷ ExceptionConflit (409)
  - PseudonymeInvalideException ▷ ExceptionDonneesInvalides (422)
  - PseudonymeDejaPrisException ▷ ExceptionConflit (409)

## Services API

Le cas « Rejoindre un quiz » utilise deux routes publiques. Leur liste est tenue à jour dans docs/API.md du dépôt
back-end.

### Contrat de la route GET /api/public/sessions/{codeAcces}

| | |
|---|---|
| Route | GET /api/public/sessions/{codeAcces} ; SessionPubliqueController.consulter, qui appelle ConsulterSessionPubliqueUseCase |
| Accès | Public : aucun compte ni aucune session (routes /api/public/**) |
| Requête | codeAcces dans le chemin (32 caractères au plus) ; pas de corps |
| Réponse | 200 OK, corps SessionPubliqueResponse en JSON (titreCours, titreQuiz, estNotee, etat) |
| Erreurs | 404 code inconnu, 409 séance close. Corps au format commun (error, request_id) ; détail dans le tableau « Cas d'erreur » du cas « Rejoindre un quiz ». |
| Appelée par | Front : features/seance/api, par le client HTTP commun (shared/http), à l'ouverture du lien ou du QR code |

### Contrat de la route POST /api/public/sessions/{codeAcces}/participants

| | |
|---|---|
| Route | POST /api/public/sessions/{codeAcces}/participants ; SessionPubliqueController.rejoindre, qui appelle RejoindreSessionUseCase |
| Accès | Public : aucun compte ni aucune session ; refusé pour un quiz noté (cas « S'authentifier à un quiz noté ») |
| Requête | application/json : pseudonyme (texte de 2 à 20 caractères, obligatoire) ; codeAcces dans le chemin |
| Réponse | 201 Created, corps ParticipantRejointResponse en JSON (idParticipant, jeton, pseudonyme), en-tête Cache-Control: no-store, car le corps contient le jeton. Une fois la transaction validée, le nombre de connectés est poussé sur /topic/sessions/{codeAcces}/connectes (écran E5). |
| Erreurs | 400 corps illisible (requête construite hors de l'application), 404 code inconnu, 409 séance close, quiz noté ou pseudonyme déjà pris, 422 pseudonyme invalide, 500 échec d'écriture. Corps au format commun (error, request_id, champs) ; le 409 « pseudonyme déjà pris » ajoute le champ suggestion (à ajouter au format commun). Détail dans le tableau « Cas d'erreur » du cas « Rejoindre un quiz ». |
| Appelée par | Front : features/seance/api, par le client HTTP commun (shared/http). Le front garde le jeton pour ce code d'accès et l'envoie ensuite dans l'en-tête X-Jeton-Participant et dans la trame STOMP CONNECT. |

## Services fonctionnels

Chaque fiche décrit une méthode appelée par le cas d'utilisation « Rejoindre un quiz » : les méthodes du controller et
des cas d'usage, les méthodes du domaine et les méthodes des interfaces dont dépendent les cas d'usage. Les fiches
suivent l'ordre des appels : d'abord l'entrée dans la séance (POST), puis la lecture du quiz à l'ouverture du lien
(GET), et enfin le convertisseur commun aux deux routes. Les signatures sont en Java ; les exceptions sont celles du
tableau des cas d'erreur (partie « Définition » du cas). La ligne « API qui expose le service » indique la route REST
ou la destination STOMP concernée.

### Interface de la méthode rejoindre (SessionPubliqueController)

| | |
|---|---|
| Nom de la méthode | rejoindre |
| Rôle | Reçoit la demande d'entrée, vérifie la forme du pseudonyme (annotation Valid), construit RejoindreSessionDto avec le code d'accès de l'adresse, appelle le cas d'usage et renvoie le participant créé. |
| Classe ou interface | SessionPubliqueController : controller REST de la couche infrastructure ; appelle RejoindreSessionUseCase puis SessionPubliqueMapper |
| Données renvoyées | ResponseEntity<ParticipantRejointResponse> : 201 Created, en-tête Cache-Control: no-store |
| Paramètres d'entrée | String codeAcces (chemin), RejoindreSessionRequest requete (corps JSON) |
| Exceptions levées | MethodArgumentNotValidException si le pseudonyme est invalide ; les exceptions du cas d'usage sont traduites en code HTTP par GestionnaireErreurs |
| API qui expose le service | POST /api/public/sessions/{codeAcces}/participants (SessionPubliqueController.rejoindre) : voir « Services API » |
| Signature | `ResponseEntity<ParticipantRejointResponse> rejoindre(String codeAcces, RejoindreSessionRequest requete)` |

### Interface de la méthode executer (RejoindreSessionUseCase)

| | |
|---|---|
| Nom de la méthode | executer |
| Rôle | Mène l'entrée dans la séance : vérifie que la séance accepte une entrée sans compte, contrôle le pseudonyme et son unicité, crée le participant avec son jeton, l'enregistre dans une seule transaction et prévient l'écran de l'enseignant. |
| Classe ou interface | RejoindreSessionUseCase : classe du cas d'usage, couche application ; reçoit SessionQuizRepository, ParticipantRepository, GenerateurJeton, DiffuseurTempsReel, JournalEvenements et Clock par son constructeur ; appelée par SessionPubliqueController |
| Données renvoyées | ParticipantRejoint : idParticipant, jeton en clair (remis une seule fois) et pseudonyme retenu |
| Paramètres d'entrée | RejoindreSessionDto dto (codeAcces, pseudonyme) |
| Exceptions levées | SessionIntrouvableException, SessionCloseException, ConnexionIutRequiseException, PseudonymeInvalideException, PseudonymeDejaPrisException |
| API qui expose le service | POST /api/public/sessions/{codeAcces}/participants (SessionPubliqueController.rejoindre) : voir « Services API » |
| Signature | `@Transactional public ParticipantRejoint executer(RejoindreSessionDto dto)` |

### Interface de la méthode trouverParCodeAcces (SessionQuizRepository)

| | |
|---|---|
| Nom de la méthode | trouverParCodeAcces |
| Rôle | Cherche la séance qui porte ce code d'accès. |
| Classe ou interface | SessionQuizRepository : interface de la couche application, implémentée par PostgresSessionQuizRepository (entité JPA SessionQuizEntity, convertie vers le domaine) |
| Données renvoyées | Optional<SessionQuiz> : vide si aucune séance ne porte ce code |
| Paramètres d'entrée | String codeAcces |
| Exceptions levées | Aucune |
| API qui expose le service | Aucune : méthode interne, appelée par RejoindreSessionUseCase.executer (POST) et ConsulterSessionPubliqueUseCase.executer (GET) |
| Signature | `Optional<SessionQuiz> trouverParCodeAcces(String codeAcces)` |

### Interface de la méthode verifierEntreeSansCompte (SessionQuiz)

| | |
|---|---|
| Nom de la méthode | verifierEntreeSansCompte |
| Rôle | Vérifie que la séance accepte une entrée sans compte : séance non close et quiz non noté. |
| Classe ou interface | SessionQuiz : agrégat du domaine (séance) |
| Données renvoyées | Aucune (void) |
| Paramètres d'entrée | Aucun |
| Exceptions levées | SessionCloseException si la séance est close ; ConnexionIutRequiseException si le quiz est noté |
| API qui expose le service | Aucune : méthode du domaine, appelée par RejoindreSessionUseCase.executer |
| Signature | `public void verifierEntreeSansCompte()` |

### Interface de la méthode de (Pseudonyme)

| | |
|---|---|
| Nom de la méthode | de |
| Rôle | Nettoie le texte saisi (espaces, normalisation Unicode) et vérifie qu'il forme un pseudonyme valide. |
| Classe ou interface | Pseudonyme : objet de valeur du domaine (record), méthode statique de fabrication |
| Données renvoyées | Pseudonyme : le texte nettoyé, voir « Pseudonyme et jeton » |
| Paramètres d'entrée | String texte |
| Exceptions levées | PseudonymeInvalideException si le texte est absent, contient un caractère de contrôle ou ne fait pas 2 à 20 caractères après nettoyage |
| API qui expose le service | Aucune : méthode du domaine, appelée par RejoindreSessionUseCase.executer |
| Signature | `public static Pseudonyme de(String texte)` |

### Interface de la méthode existePseudonyme (ParticipantRepository)

| | |
|---|---|
| Nom de la méthode | existePseudonyme |
| Rôle | Indique si un participant de la séance porte déjà ce pseudonyme. |
| Classe ou interface | ParticipantRepository : interface de la couche application, implémentée par PostgresParticipantRepository |
| Données renvoyées | boolean : vrai si le pseudonyme est déjà pris dans la séance |
| Paramètres d'entrée | Long idSession, Pseudonyme pseudonyme |
| Exceptions levées | Aucune |
| API qui expose le service | Aucune : méthode interne, appelée par RejoindreSessionUseCase.executer (POST) |
| Signature | `boolean existePseudonyme(Long idSession, Pseudonyme pseudonyme)` |

### Interface de la méthode pseudonymesDeLaSession (ParticipantRepository)

| | |
|---|---|
| Nom de la méthode | pseudonymesDeLaSession |
| Rôle | Renvoie les pseudonymes déjà utilisés dans la séance, pour proposer un pseudonyme libre. |
| Classe ou interface | ParticipantRepository : interface de la couche application, implémentée par PostgresParticipantRepository |
| Données renvoyées | Set<String> : les pseudonymes de la séance (300 au plus, hypothèse du cahier des charges) |
| Paramètres d'entrée | Long idSession |
| Exceptions levées | Aucune |
| API qui expose le service | Aucune : méthode interne, appelée par RejoindreSessionUseCase.executer, seulement quand le pseudonyme est pris |
| Signature | `Set<String> pseudonymesDeLaSession(Long idSession)` |

### Interface de la méthode proposerAlternative (Pseudonyme)

| | |
|---|---|
| Nom de la méthode | proposerAlternative |
| Rôle | Forme le premier pseudonyme libre en ajoutant 2, 3, 4… à la fin, en raccourcissant pour rester à 20 caractères. |
| Classe ou interface | Pseudonyme : objet de valeur du domaine |
| Données renvoyées | Pseudonyme : le pseudonyme proposé |
| Paramètres d'entrée | Set<String> pseudonymesPris |
| Exceptions levées | Aucune |
| API qui expose le service | Aucune : méthode du domaine, appelée par RejoindreSessionUseCase.executer quand le pseudonyme est pris |
| Signature | `public Pseudonyme proposerAlternative(Set<String> pseudonymesPris)` |

### Interface de la méthode regleRefusee (JournalEvenements)

| | |
|---|---|
| Nom de la méthode | regleRefusee |
| Rôle | Trace une entrée refusée, dans les logs seulement. |
| Classe ou interface | JournalEvenements : interface partagée (shared/application/port), implémentée par PostgresJournalEvenements ; écrit dans les logs au niveau WARN, sans ligne dans JOURNAL_EVENEMENT. Appelée avec « entree_refusee_session_close », « entree_refusee_quiz_note » ou « entree_refusee_pseudonyme_pris » et le champ idSession, sans donnée personnelle. |
| Données renvoyées | Aucune (void) |
| Paramètres d'entrée | String nom, Map<String, Object> champs |
| Exceptions levées | Aucune |
| API qui expose le service | Aucune : méthode interne, appelée par RejoindreSessionUseCase.executer (POST) |
| Signature | `void regleRefusee(String nom, Map<String, Object> champs)` |

### Interface de la méthode generer (GenerateurJeton)

| | |
|---|---|
| Nom de la méthode | generer |
| Rôle | Tire un jeton secret et calcule son empreinte, seule valeur stockée en base. |
| Classe ou interface | GenerateurJeton : interface de la couche application, implémentée par SecureRandomGenerateurJeton |
| Données renvoyées | JetonParticipant : valeur (32 octets aléatoires en Base64url, 43 caractères) et empreinte (SHA-256 en hexadécimal, 64 caractères) |
| Paramètres d'entrée | Aucun |
| Exceptions levées | Aucune |
| API qui expose le service | Aucune : méthode interne, appelée par RejoindreSessionUseCase.executer (POST) |
| Signature | `JetonParticipant generer()` |

### Interface de la méthode rejoindre (Participant)

| | |
|---|---|
| Nom de la méthode | rejoindre |
| Rôle | Fabrique le participant qui entre dans la séance, avec un score à 0. |
| Classe ou interface | Participant : entité du domaine, méthode statique de fabrication |
| Données renvoyées | Participant : le participant, non encore enregistré (identiteVerifiee à faux, aucune identité en quiz non noté ; dateEntree et derniereActivite à maintenant) |
| Paramètres d'entrée | Long idSession, Pseudonyme pseudonyme, String empreinteJeton, LocalDateTime maintenant |
| Exceptions levées | IllegalArgumentException si l'empreinte n'a pas 64 caractères hexadécimaux : erreur de programmation, car elle vient du générateur |
| API qui expose le service | Aucune : méthode du domaine, appelée par RejoindreSessionUseCase.executer |
| Signature | `public static Participant rejoindre(Long idSession, Pseudonyme pseudonyme, String empreinteJeton, LocalDateTime maintenant)` |

### Interface de la méthode enregistrer (ParticipantRepository)

| | |
|---|---|
| Nom de la méthode | enregistrer |
| Rôle | Enregistre le participant en base, en forçant l'écriture pour qu'une erreur soit détectée avant la fin du cas d'usage. |
| Classe ou interface | ParticipantRepository : interface de la couche application, implémentée par PostgresParticipantRepository (entité JPA ParticipantEntity, convertie vers le domaine) |
| Données renvoyées | Participant : le participant avec son identifiant |
| Paramètres d'entrée | Participant participant |
| Exceptions levées | PseudonymeDejaPrisException si la contrainte d'unicité (séance, pseudonyme) est violée ; une autre erreur de base remonte en exception Spring non contrôlée, la transaction est annulée et l'erreur est traduite en 500 |
| API qui expose le service | Aucune : méthode interne, appelée par RejoindreSessionUseCase.executer (POST) |
| Signature | `Participant enregistrer(Participant participant)` |

### Interface de la méthode evenement (JournalEvenements)

| | |
|---|---|
| Nom de la méthode | evenement |
| Rôle | Trace l'entrée réussie dans les logs. |
| Classe ou interface | JournalEvenements : interface partagée (shared/application/port), implémentée par PostgresJournalEvenements ; écrit dans les logs au niveau INFO, sans ligne dans JOURNAL_EVENEMENT (ce n'est pas une action sensible). Appelée avec « participant_entre » et les champs idSession et idParticipant, sans pseudonyme ni jeton. |
| Données renvoyées | Aucune (void) |
| Paramètres d'entrée | String nom, Map<String, Object> champs |
| Exceptions levées | Aucune |
| API qui expose le service | Aucune : méthode interne, appelée par RejoindreSessionUseCase.executer (POST) |
| Signature | `void evenement(String nom, Map<String, Object> champs)` |

### Interface de la méthode compter (ParticipantRepository)

| | |
|---|---|
| Nom de la méthode | compter |
| Rôle | Compte les participants de la séance, pour mettre à jour l'écran de l'enseignant. |
| Classe ou interface | ParticipantRepository : interface de la couche application, implémentée par PostgresParticipantRepository (une requête COUNT) |
| Données renvoyées | int : le nombre de participants de la séance |
| Paramètres d'entrée | Long idSession |
| Exceptions levées | Aucune |
| API qui expose le service | Aucune : méthode interne, appelée par RejoindreSessionUseCase.executer (POST) |
| Signature | `int compter(Long idSession)` |

### Interface de la méthode signalerConnectes (DiffuseurTempsReel)

| | |
|---|---|
| Nom de la méthode | signalerConnectes |
| Rôle | Pousse le nombre de connectés vers l'écran E5 de l'enseignant, une fois la transaction validée. |
| Classe ou interface | DiffuseurTempsReel : interface de la couche application, implémentée par StompDiffuseurTempsReel (SimpMessagingTemplate, envoi après le commit) |
| Données renvoyées | Aucune (void) |
| Paramètres d'entrée | String codeAcces, int nombre |
| Exceptions levées | Aucune : un écran E5 rechargé relit le nombre par GET /api/sessions/{idSession} |
| API qui expose le service | Destination STOMP /topic/sessions/{codeAcces}/connectes : {nombre}, vers l'écran E5 |
| Signature | `void signalerConnectes(String codeAcces, int nombre)` |

### Interface de la méthode consulter (SessionPubliqueController)

| | |
|---|---|
| Nom de la méthode | consulter |
| Rôle | Reçoit la demande d'ouverture du lien, appelle le cas d'usage et renvoie les informations du quiz à afficher sur E7. |
| Classe ou interface | SessionPubliqueController : controller REST de la couche infrastructure ; appelle ConsulterSessionPubliqueUseCase puis SessionPubliqueMapper |
| Données renvoyées | ResponseEntity<SessionPubliqueResponse> : 200 OK |
| Paramètres d'entrée | String codeAcces (chemin) |
| Exceptions levées | Aucune directement : les exceptions du cas d'usage sont traduites en code HTTP par GestionnaireErreurs |
| API qui expose le service | GET /api/public/sessions/{codeAcces} (SessionPubliqueController.consulter) : voir « Services API » |
| Signature | `ResponseEntity<SessionPubliqueResponse> consulter(String codeAcces)` |

### Interface de la méthode executer (ConsulterSessionPubliqueUseCase)

| | |
|---|---|
| Nom de la méthode | executer |
| Rôle | Renvoie les informations publiques de la séance : titres du cours et du quiz, mode noté et état. Ne crée rien. |
| Classe ou interface | ConsulterSessionPubliqueUseCase : classe du cas d'usage, couche application ; reçoit SessionQuizRepository et InformationsQuiz par son constructeur ; appelée par SessionPubliqueController |
| Données renvoyées | SessionPublique : titreCours, titreQuiz, estNotee et etat |
| Paramètres d'entrée | String codeAcces |
| Exceptions levées | SessionIntrouvableException, SessionCloseException |
| API qui expose le service | GET /api/public/sessions/{codeAcces} (SessionPubliqueController.consulter) : voir « Services API » |
| Signature | `@Transactional(readOnly = true) public SessionPublique executer(String codeAcces)` |

### Interface de la méthode verifierOuverte (SessionQuiz)

| | |
|---|---|
| Nom de la méthode | verifierOuverte |
| Rôle | Vérifie que la séance n'est pas close. |
| Classe ou interface | SessionQuiz : agrégat du domaine (séance) |
| Données renvoyées | Aucune (void) |
| Paramètres d'entrée | Aucun |
| Exceptions levées | SessionCloseException si la séance est close (état CLOTUREE) |
| API qui expose le service | Aucune : méthode du domaine, appelée par ConsulterSessionPubliqueUseCase.executer et par verifierEntreeSansCompte |
| Signature | `public void verifierOuverte()` |

### Interface de la méthode titres (InformationsQuiz)

| | |
|---|---|
| Nom de la méthode | titres |
| Rôle | Lit les titres du quiz et du cours de la séance, pour l'écran E7. |
| Classe ou interface | InformationsQuiz : interface de la couche application de la fonctionnalité seance, implémentée par PostgresInformationsQuiz (lecture seule, sans dépendre de l'infrastructure des fonctionnalités quiz et cours) |
| Données renvoyées | TitresQuiz : titreCours et titreQuiz |
| Paramètres d'entrée | Long idQuiz |
| Exceptions levées | Aucune |
| API qui expose le service | Aucune : méthode interne, appelée par ConsulterSessionPubliqueUseCase.executer (GET) |
| Signature | `TitresQuiz titres(Long idQuiz)` |

### Interface de la méthode versReponse (SessionPubliqueMapper)

| | |
|---|---|
| Nom de la méthode | versReponse |
| Rôle | Convertit le résultat du cas d'usage en réponse JSON pour le navigateur. |
| Classe ou interface | SessionPubliqueMapper : convertisseur de la couche infrastructure, appelé par SessionPubliqueController |
| Données renvoyées | ParticipantRejointResponse (idParticipant, jeton, pseudonyme) ou SessionPubliqueResponse (titreCours, titreQuiz, estNotee, etat) |
| Paramètres d'entrée | ParticipantRejoint participant, ou SessionPublique session |
| Exceptions levées | Aucune |
| API qui expose le service | Aucune : méthode interne, appelée par SessionPubliqueController.rejoindre (POST) et SessionPubliqueController.consulter (GET) |
| Signature | `static ParticipantRejointResponse versReponse(ParticipantRejoint participant)` `static SessionPubliqueResponse versReponse(SessionPublique session)` |

## Écran E7 « Rejoindre » (cahier des charges, §5.2.7)

| N° | Élément | Type et contenu | Règles et comportement |
|---|---|---|---|
| E7-1 | Titre | Nom du cours et du quiz | Reçu avec le lien |
| E7-2 | Pseudonyme | Champ texte | Quiz non noté. Obligatoire, 2 à 20 caractères, unique dans la session (hypothèse à valider, « Points à clarifier », point 19) |
| E7-3 | Entrer dans le quiz | Bouton | Refusé si la session est close ; sinon ouvre E8 (sur la question en cours si le quiz a déjà commencé) |
| E7-4 | Connexion LDAP | Champs identifiant et mot de passe, bouton « Se connecter » | Affichés à la place du pseudonyme pour un quiz noté (UC15) ; un pseudonyme d'affichage est proposé |
| E7-5 | Mention d'information | Texte | Finalité, base légale, durée de conservation, contact (§4.4) |

> E7-4 est hors périmètre de l'UC8 (cas « S'authentifier à un quiz noté », UC15) ; il est repris ici pour que le
> tableau soit complet.

## RGPD : droit à l'information (cahier des charges, §4.4)

| Droit | Mesure envisagée |
|---|---|
| Droit à l'information | Mention d'information affichée à la connexion enseignant (E1), à l'entrée du quiz étudiant (E7) et à la connexion LDAP des étudiants (quiz notés) : finalité, base légale, durée de conservation, contact. |

> Le texte exact de la mention (E7-5) n'est pas donné dans le dossier : seuls ses quatre contenus le sont. La base
> légale proposée (« mission d'intérêt public de l'IUT ») et les durées de conservation sont « à valider » avec le
> délégué à la protection des données.

## Annexe : UC8 dans le cahier des charges (§3.2.2)

**UC8 – Rejoindre un quiz.** Acteur : Étudiant · Écrans : E7, E8

- **Informations nécessaires :** Lien ou QR code de la session ; pseudonyme (quiz non noté) ou compte LDAP (quiz
  noté, UC15).
- **Traitements et calculs :** Figure 13 – UC8 – Rejoindre un quiz : traitements et calculs (non décrite ici : le
  détail est dans les Figures 17 à 19).
- **Résultats attendus :** L'étudiant attend la première question (E7 puis E8) ; le compteur de connectés se met à
  jour en E5.
- **Règles de contrôle interne :** Aucun compte pour un quiz non noté. Le pseudonyme est unique dans la session (un
  autre est proposé en cas de doublon). Le nombre de connexions par appareil est limité.
- **Volumes impliqués :** Jusqu'à 300 connexions simultanées par session (hypothèse), concentrées en début de quiz.
- **Interface avec d'autres systèmes :** Aucune.

Exigence associée : « Rejoindre un quiz sans compte, y compris en cours de route » (MUST). Relation entre cas :
UC15 étend UC8 (l'authentification LDAP n'a lieu que pour un quiz noté).
