# Cas d'utilisation : Répondre à une question (UC9)

> Conversion en Markdown de `docs/uc/UC9 _ Répondre à une question.pdf`. Les textes, codes et messages sont repris
> mot pour mot. Les figures (images dans le PDF) sont remplacées par une description textuelle complète.
>
> **Côté front**, la règle 4 de `CLAUDE.md` prime sur l'envoi STOMP décrit ici : la réponse part en REST,
> `POST /api/public/sessions/{codeAcces}/reponses` (`docs/API.md`). Codes d'erreur et messages : ceux de ce document.

## Définition

En tant qu'étudiant participant à une séance,
Je souhaite répondre à la question affichée depuis mon téléphone ou mon ordinateur,
Afin de gagner des points et de voir mon résultat et mon rang.

**Objets métier :** SessionQuiz, Participant, Question et son Bareme, Reponse (ReponseQCM, ReponseRelier,
ReponseLibre) (voir la partie 3.3 du dossier, Figures 9 et 10).

Le cas utilise aussi trois structures techniques, visibles dans le diagramme de classes (Figure 4) : les données
reçues (RepondreQuestionDto), le résultat du cas d'usage (ReponseEnregistree) et l'accusé envoyé au navigateur
(ReponseEnregistreeMessage). L'identifiant du participant est lu dans la connexion (jeton), jamais dans le message.

**Écrans :** E8 « Question », E9 « Résultat et classement », histogramme de E5 côté enseignant.

**Hors périmètre :** entrée dans la séance (cas « Rejoindre un quiz » et « S'authentifier à un quiz noté »),
ouverture et clôture des questions (cas « Lancer un quiz en séance ») et correction des réponses libres (cas
« Corriger les réponses libres »).

## Cas d'erreur

| Cas | Exception levée (couche) | HTTP | Code | Message affiché |
|---|---|---|---|---|
| Participant inconnu ou remplacé | ParticipantInvalideException (domaine) | 401 | `JETON_INVALIDE` | « Ta session a expiré, rejoins le quiz à nouveau. » |
| Question close ou session terminée | QuestionCloseException (domaine) | 409 | `QUESTION_CLOSE` | « Cette session est terminée. » |
| Réponse après l'échéance | HorsDelaiException (domaine) | 409 | `HORS_DELAI` | « Temps écoulé : réponse non prise en compte. » |
| Réponse déjà enregistrée | DejaReponduException (domaine) | 409 | `DEJA_REPONDU` | « Tu as déjà répondu. » |
| Contenu incohérent | ReponseInvalideException (domaine) | 422 | `REPONSE_INVALIDE` | « Réponse incomplète, vérifie ta saisie. » |
| Erreur de base de données | Erreur d'accès aux données (Spring) | 500 | `ERREUR_SERVEUR` | « Réponse non enregistrée, réessaie. » Rien n'est enregistré. |

> Dans la dernière ligne, « Rien n'est enregistré. » est écrit hors des guillemets dans le PDF : c'est une précision
> sur le comportement, pas une partie du message affiché.

Un gestionnaire global, GestionnaireErreursTempsReel, traduit chaque exception en code et en statut HTTP équivalent
(même convention que les routes REST du projet), et l'envoie au seul étudiant concerné sur `/user/queue/erreurs`.

## Diagrammes

Le cas d'utilisation est décrit par quatre diagrammes : une vue détaillée du cas (ses variantes et ses extensions ; la
vue d'ensemble du dossier le montre en une seule ellipse), les étapes fonctionnelles, la séquence des appels et, en
complément, les classes du back-end utilisées.

### Vue détaillée du cas d'utilisation

*Figure 1 – Répondre à une question : vue détaillée du cas d'utilisation*

Diagramme de cas d'utilisation UML. Frontière du système : « Outil de quiz dynamique IUT ».

**Acteurs**

- **Étudiant** (à gauche) : associé au cas principal « UC9 - Répondre à une question ».
- **Horloge serveur** (à droite) : associée au cas « Clore sans réponse (temps écoulé) ».

**Cas principal :** « UC9 - Répondre à une question », avec deux **points d'extension** :

- connexion perdue ;
- échéance atteinte.

**Inclusions** (flèches pointillées «include» du cas principal vers le cas inclus) :

- « Consulter la question (E8) » ;
- « Enregistrer et calculer les points » ;
- « Consulter son résultat (E9) ».

**Extensions** (flèches pointillées «extend» du cas d'extension vers le cas principal) :

- « Reprendre après une coupure » étend UC9 (correspond au point d'extension « connexion perdue ») ;
- « Clore sans réponse (temps écoulé) » étend UC9 (correspond au point d'extension « échéance atteinte ») ; ce cas
  est déclenché par l'acteur Horloge serveur.

**Spécialisations** (flèches de généralisation, triangle creux vers UC9) : trois variantes du cas principal selon le
type de question :

- « Répondre à un QCM » ;
- « Relier des points » ;
- « Saisir une réponse libre ».

### Diagramme des étapes fonctionnelles du CU

*Figure 2 – Répondre à une question : étapes fonctionnelles*

Diagramme d'activité à trois couloirs : **Étudiant**, **Navigateur (application React)**, **Serveur (Spring Boot)**.
Code couleur : bleu = étape normale, jaune = décision, vert = chemin de succès, orange = erreur.

**Déroulé principal**

1. *Serveur* — Nœud initial, puis « SessionQuiz.ouvrirQuestion (cas UC7) : échéance fixée, question diffusée ».
2. *Serveur → Navigateur* (flèche « diffusion ») — *Navigateur* : « Afficher E8 et le décompte (calé sur l'heure du
   serveur) ».
3. *Navigateur → Étudiant* — *Étudiant* : « Choisir sa réponse ».
4. *Étudiant* — « Valider ».
5. *Navigateur* — Décision « Réponse complète et temps restant ? »
   - **[non]** : retour à « Choisir sa réponse » (étudiant).
   - **[oui]** : étape suivante.
6. *Navigateur* — « Désactiver « Valider », envoyer : SEND /app/sessions/{id}/reponses ».
7. *Navigateur → Serveur* (flèche « STOMP ») — *Serveur* : « JetonParticipantInterceptor : jeton → participant
   (Principal), limite d'envois ».
8. *Serveur* — Décision « Jeton valide ? »
   - **[non]** : « ParticipantInvalideException » (orange) → vers le gestionnaire d'erreurs (étape 18).
   - **[oui]** : suite.
9. *Serveur* — « ReponseController construit RepondreQuestionDto ».
10. *Serveur* — « RepondreQuestionUseCase.executer(dto) ».
11. *Serveur* — Décision « SessionQuiz : question ouverte ? »
    - **[non]** : « QuestionCloseException » → gestionnaire d'erreurs.
    - **[oui]** : suite.
12. *Serveur* — Décision « Avant l'échéance ? (horloge du serveur) »
    - **[non]** : « HorsDelaiException » → gestionnaire d'erreurs.
    - **[oui]** : suite.
13. *Serveur* — Décision « Réponse déjà enregistrée ? »
    - **[oui]** : « DejaReponduException » → gestionnaire d'erreurs.
    - **[non]** : suite.
14. *Serveur* — « Reponse.creer(question, dto, …) selon le type de question ».
15. *Serveur* — Décision « Reponse.valider : contenu cohérent ? »
    - **[non]** : « ReponseInvalideException » → gestionnaire d'erreurs.
    - **[oui]** : suite.
16. *Serveur* (vert) — « Question.evaluer → Bareme.calculerPoints (motifs si libre) », puis « Enregistrer la réponse
    (flush), ajouter les points au participant ».
17. *Serveur* — Décision « Écritures réussies ? »
    - **[non]** : « Rollback : rien n'est enregistré (500) » → gestionnaire d'erreurs.
    - **[oui]** : « Après commit : accusé de réception et répartition vers E5 ».
       - *Serveur → Navigateur* (flèche « accusé ») — *Navigateur* : « Afficher E9 « Réponse enregistrée » ».
       - *Serveur* : « Clôture de la question (cas UC7) : ResultatQuestionMessage envoyé ».
       - *Serveur → Navigateur* (flèche « résultat ») — *Navigateur* : « Afficher E9 : justesse, bonne réponse,
         points et rang » (atteint après « Réponse enregistrée »), puis **nœud final**.

**Branche d'erreur**

18. *Serveur* — Toutes les erreurs (ParticipantInvalideException, QuestionCloseException, HorsDelaiException,
    DejaReponduException, ReponseInvalideException, Rollback 500) convergent vers « GestionnaireErreursTempsReel :
    code et message sur /user/queue/erreurs ».
19. *Serveur → Navigateur* — *Navigateur* : décision « Erreur corrigible et temps restant ? »
    - **[oui]** : *Étudiant* : « Lire le message (E8) et corriger sa réponse », puis retour à « Choisir sa réponse ».
    - **[non]** : *Navigateur* : « Afficher le message d'erreur (E9) », puis **nœud final**.

### Diagramme de séquence

*Figure 3 – Répondre à une question : diagramme de séquence*

**Participants (lignes de vie), de gauche à droite :** Navigateur (React), ReponseController,
RepondreQuestionUseCase, SessionQuiz, Question / Bareme, Reponse, ReponseRepository, DiffuseurTempsReel.

**Messages**

1. Navigateur (React) → ReponseController : `SEND /app/sessions/{id}/reponses`.
2. Note sur Navigateur–ReponseController : « JetonParticipantInterceptor : jeton → participant ».
3. ReponseController → RepondreQuestionUseCase : `executer(dto)`.
4. RepondreQuestionUseCase → SessionQuiz : `verifierReponseAcceptee(idQuestion, dureeSec, maintenant)`.
5. **Fragment alt** :
   - **[Question close ou échéance dépassée]** (rouge) : SessionQuiz ⇢ Navigateur (retour pointillé) :
     « QuestionClose / HorsDelaiException (via GestionnaireErreursTempsReel) ».
   - **[Dans le délai]** (vert) : SessionQuiz ⇢ RepondreQuestionUseCase : `tempsMs`.
6. RepondreQuestionUseCase → ReponseRepository : `existePour(idParticipant, idQuestion)`.
7. **Fragment alt** :
   - **[Déjà répondu]** (rouge) : ReponseRepository ⇢ Navigateur : « DejaReponduException ».
   - **[Première réponse]** (vert) :
     - RepondreQuestionUseCase → Reponse : `creer(…) puis valider(question)` ;
     - RepondreQuestionUseCase → Question / Bareme : `evaluer(reponse, tempsMs)` ;
     - Question / Bareme ⇢ RepondreQuestionUseCase : « points (Bareme.calculerPoints) » ;
     - RepondreQuestionUseCase → ReponseRepository : `enregistrer(reponse) + ajouterPoints`.
8. **Fragment alt** :
   - **[Écritures réussies]** (vert) :
     - RepondreQuestionUseCase → DiffuseurTempsReel : « accuserReception + signalerNouvelleReponse (après commit) » ;
     - DiffuseurTempsReel ⇢ Navigateur : `/user/queue/reponses` « Réponse enregistrée ».
   - **[Erreur base de données]** (rouge) : RepondreQuestionUseCase ⇢ Navigateur : « rollback, ERREUR_SERVEUR ».

> Remarque : le diagramme fait partir l'appel à `DiffuseurTempsReel` de RepondreQuestionUseCase, alors que la fiche
> de `accuserReception` et le diagramme de classes (« utilise (après commit) ») le font partir de ReponseController.

### Autre diagramme : diagramme de classes

*Figure 4 – Répondre à une question : diagramme de classes*

Légende : gris = Infrastructure, bleu = Application, jaune = Domaine ; flèche pointillée = dépendance ; losange plein
= composition.

**Infrastructure**

- **ReponseController** «controller STOMP»
  - `- repondreQuestion : RepondreQuestionUseCase`
  - `- diffuseur : DiffuseurTempsReel`
  - `+ repondre(idSession, @Valid payload, principal) : void (@MessageMapping)`
  - Dépendances : « utilise » → RepondreQuestionUseCase ; « utilise » → ReponseMapper ; « utilise (après commit) » →
    DiffuseurTempsReel.
- **ReponseMapper**
  - `+ versMessage(r : ReponseEnregistree, requestId) : ReponseEnregistreeMessage` (statique, souligné)
  - Dépendance : « crée » → ReponseEnregistreeMessage.
- **ReponseEnregistreeMessage** «record»
  - `- requestId : String`
  - `- idQuestion : Long`
  - `- horodatageServeur : String`

**Application**

- **RepondreQuestionUseCase**
  - `- sessions : SessionQuizRepository`
  - `- participants : ParticipantRepository`
  - `- questions : QuestionRepository`
  - `- reponses : ReponseRepository`
  - `- diffuseur : DiffuseurTempsReel`
  - `- journal : JournalEvenements`
  - `- horloge : Clock`
  - `+ executer(dto : RepondreQuestionDto) : ReponseEnregistree (@Transactional)`
  - Dépendances : « utilise » → SessionQuiz ; « reçoit » → RepondreQuestionDto ; « crée » → ReponseEnregistree ;
    « crée » → Reponse ; « utilise » → les six interfaces ci-dessous.
- **RepondreQuestionDto** «record»
  - `- idSession : Long`
  - `- idParticipant : Long`
  - `- idQuestion : Long`
  - `- idPropositions : List<Long>`
  - `- liens : List<LienDto>`
  - `- texteLibre : String`
  - `- requestId : String`
- **ReponseEnregistree** «record»
  - `- idReponse : Long`
  - `- idQuestion : Long`
  - `- horodatageServeur : LocalDateTime`
- Interfaces «interface» :
  - **DiffuseurTempsReel** : `+ accuserReception(idParticipant, message) : void` ;
    `+ signalerNouvelleReponse(idSession, idQuestion) : void`
  - **SessionQuizRepository** : `+ trouverParId(idSession) : Optional<SessionQuiz>`
  - **ParticipantRepository** : `+ trouverParId(id) : Optional<Participant>` ; `+ ajouterPoints(id, points) : void`
  - **QuestionRepository** : `+ trouverParId(id) : Optional<Question>`
  - **ReponseRepository** : `+ existePour(idParticipant, idQuestion) : boolean` ;
    `+ enregistrer(reponse) : Reponse`
  - **JournalEvenements (shared)** : `+ regleRefusee(nom, champs) : void`

**Domaine**

- **SessionQuiz** «agrégat»
  - `- idSession : Long`
  - `- etat : EtatSession`
  - `- estNotee : boolean`
  - `- positionCourante : int`
  - `- echeanceQuestion : LocalDateTime`
  - `+ verifierReponseAcceptee(idQuestion, dureeSec, maintenant) : long`
  - Composition : SessionQuiz (1) ◆— (*) Participant.
- **Participant**
  - `- idParticipant : Long`
  - `- pseudonyme : String`
  - `- scoreTotal : int`
  - `- derniereActivite : LocalDateTime`
  - `+ appartientA(idSession) : boolean`
  - Composition : Participant (1) ◆— (*) Reponse.
- **Question** «abstract»
  - `- idQuestion : Long`
  - `- type : TypeQuestion`
  - `- dureeSec : int`
  - `- verrouillee : boolean`
  - `+ evaluer(reponse, tempsMs) : int`
  - Composition : Question ◆— (1) Bareme. Association « porte sur » : Question (1) — (*) Reponse.
- **Bareme** «value object»
  - `- pointsMax : int`
  - `- decroissanceTemps : boolean`
  - `- pointsPartiels : boolean`
  - `+ calculerPoints(tempsMs, dureeMs, fractionJuste) : int`
- **Reponse** «abstract»
  - `- idReponse : Long`
  - `- horodatageServeur : LocalDateTime`
  - `- tempsReponseMs : int`
  - `- pointsCalcules : int`
  - `- pointsFinaux : int`
  - `- statutCorrection : StatutCorrection`
  - `+ creer(question, dto, idParticipant, maintenant, tempsMs) : Reponse` (statique, souligné)
  - `+ valider(question) : void`
  - `+ attribuerPoints(points, statut) : void`
  - Sous-classes (généralisation) :
    - **ReponseQCM** : `- choix : List<Proposition>`
    - **ReponseRelier** : `- liens : List<Lien>`
    - **ReponseLibre** : `- texteLibre : String`
- **Exceptions métier (features/session/domain)** «exceptions»
  - ParticipantInvalideException → JETON_INVALIDE
  - QuestionCloseException → QUESTION_CLOSE
  - HorsDelaiException → HORS_DELAI
  - DejaReponduException → DEJA_REPONDU
  - ReponseInvalideException → REPONSE_INVALIDE

**Note du diagramme :** « Implémentations, couche infrastructure (non détaillées ici) : StompDiffuseurTempsReel
(SimpMessagingTemplate), PostgresSessionQuizRepository, PostgresParticipantRepository, PostgresQuestionRepository,
PostgresReponseRepository et PostgresJournalEvenements (shared), avec des entités JPA converties vers le domaine. »

## Spécifications techniques

### Contrat du message SEND /app/sessions/{idSession}/reponses

| Rubrique | Contenu |
|---|---|
| Destination | ReponseController.repondre (@MessageMapping), qui appelle RepondreQuestionUseCase |
| Accès | Participant de la session ; idParticipant lu dans le jeton de connexion, jamais dans le message |
| Requête | JSON : requestId, idQuestion, et selon le type idPropositions, liens ou texteLibre (1 000 caractères au plus) |
| Réponse | Accusé sur /user/queue/reponses (requestId, idQuestion, horodatageServeur), sans points ni justesse |
| Erreurs | Sur /user/queue/erreurs : codes du tableau « Cas d'erreur » |

### Calcul des points

points = arrondi(pointsMax × (1 - (t / T) / 2) × fractionJuste), avec t le temps de réponse, T la durée de la
question et fractionJuste la part juste de la réponse, entre 0 et 1. Sans décroissance : points = arrondi(pointsMax ×
fractionJuste). Exemple : pointsMax = 1000, T = 20 s, réponse juste en 5 s donne 875 points.

Calcul de fractionJuste selon le type : QCM à réponse unique, 1 ou 0 ; QCM à choix multiples et points à relier, part
des bonnes propositions ou des paires correctes si le barème autorise les points partiels, sinon 1 ou 0 ; réponse
libre, 1 si un motif correspond (statut ACCEPTEE_PAR_MOTIF), sinon 0 (statut A_EXAMINER). Pour une réponse libre,
ces points sont provisoires : la décision de l'enseignant (cas « Corriger les réponses libres ») fixe les points
finaux.

## Services fonctionnels

Chaque fiche décrit une méthode appelée par le cas d'utilisation « Répondre à une question » : la méthode du
controller, celle du cas d'usage, les méthodes du domaine, les méthodes des interfaces dont dépend le cas d'usage et
le convertisseur de l'accusé. Les signatures sont en Java ; les exceptions sont celles du tableau des cas d'erreur
(partie « Définition »). La ligne « API qui expose le service » indique la destination STOMP qui déclenche la
méthode.

### Interface de la méthode repondre (ReponseController)

| | |
|---|---|
| Nom de la méthode | repondre |
| Rôle | Reçoit le message de l'étudiant, vérifie sa forme (annotation Valid), construit RepondreQuestionDto avec le participant lu dans la connexion, appelle le cas d'usage puis renvoie l'accusé de réception. |
| Classe ou interface | ReponseController : controller STOMP de la couche infrastructure (@MessageMapping) ; appelle RepondreQuestionUseCase, ReponseMapper puis DiffuseurTempsReel |
| Données renvoyées | Aucune (void) : l'accusé part sur /user/queue/reponses |
| Paramètres d'entrée | Long idSession (variable de destination), RepondreQuestionMessage payload, Principal principal (idParticipant lu dans le jeton, jamais dans le message) |
| Exceptions levées | MethodArgumentNotValidException si le message est mal formé (REQUETE_INVALIDE, 400) ; les exceptions du cas d'usage sont traduites en code et statut HTTP par GestionnaireErreursTempsReel |
| API qui expose le service | SEND /app/sessions/{idSession}/reponses (ReponseController.repondre) : voir « Contrat du message » |

```java
@MessageMapping("/sessions/{idSession}/reponses")
public void repondre(
    @DestinationVariable Long idSession,
    @Valid @Payload RepondreQuestionMessage payload,
    Principal principal)
```

### Interface de la méthode executer (RepondreQuestionUseCase)

| | |
|---|---|
| Nom de la méthode | executer |
| Rôle | Mène la réponse : vérifie que la question est ouverte et le délai respecté, refuse une seconde réponse, crée et valide la réponse, calcule ses points, l'enregistre et ajoute les points au score, dans une seule transaction. |
| Classe ou interface | RepondreQuestionUseCase : classe du cas d'usage, couche application ; reçoit SessionQuizRepository, ParticipantRepository, QuestionRepository, ReponseRepository, DiffuseurTempsReel, JournalEvenements et Clock par son constructeur ; appelée par ReponseController |
| Données renvoyées | ReponseEnregistree : idReponse, idQuestion et horodatage serveur de la réponse enregistrée (les points restent cachés jusqu'à la clôture) |
| Paramètres d'entrée | RepondreQuestionDto dto |
| Exceptions levées | ParticipantInvalideException, QuestionCloseException, HorsDelaiException, DejaReponduException, ReponseInvalideException |
| API qui expose le service | SEND /app/sessions/{idSession}/reponses (ReponseController.repondre) : voir « Contrat du message » |

```java
@Transactional
public ReponseEnregistree executer(RepondreQuestionDto dto)
```

### Interface de la méthode verifierReponseAcceptee (SessionQuiz)

| | |
|---|---|
| Nom de la méthode | verifierReponseAcceptee |
| Rôle | Vérifie que la session est en cours, que la question visée est la question ouverte et que l'échéance n'est pas dépassée, puis calcule le temps de réponse. |
| Classe ou interface | SessionQuiz : entité du domaine (agrégat de la séance) |
| Données renvoyées | long : temps de réponse en millisecondes depuis l'ouverture de la question, borné entre 0 et la durée |
| Paramètres d'entrée | Long idQuestion, int dureeSec, LocalDateTime maintenant |
| Exceptions levées | QuestionCloseException si la session n'est pas EN_COURS ou si idQuestion n'est pas la question ouverte ; HorsDelaiException si maintenant dépasse echeanceQuestion |
| API qui expose le service | Aucune : méthode du domaine, appelée par RepondreQuestionUseCase.executer |

```java
public long verifierReponseAcceptee(
    Long idQuestion, int dureeSec,
    LocalDateTime maintenant)
```

### Interface de la méthode creer (Reponse)

| | |
|---|---|
| Nom de la méthode | creer |
| Rôle | Fabrique la réponse du bon type (QCM, points à relier ou libre) à partir du message reçu, horodatée par le serveur. |
| Classe ou interface | Reponse : classe abstraite du domaine, méthode statique de fabrication |
| Données renvoyées | Reponse : une ReponseQCM, ReponseRelier ou ReponseLibre selon le type de la question, non encore enregistrée |
| Paramètres d'entrée | Question question, RepondreQuestionDto dto, Long idParticipant, LocalDateTime maintenant, long tempsMs |
| Exceptions levées | ReponseInvalideException si le contenu attendu pour le type est absent |
| API qui expose le service | Aucune : méthode du domaine, appelée par RepondreQuestionUseCase.executer |

```java
public static Reponse creer(Question question,
    RepondreQuestionDto dto, Long idParticipant,
    LocalDateTime maintenant, long tempsMs)
```

### Interface de la méthode valider (Reponse)

| | |
|---|---|
| Nom de la méthode | valider |
| Rôle | Vérifie que le contenu de la réponse est cohérent avec la question (propositions et paires de cette question, texte de longueur correcte). |
| Classe ou interface | Reponse : classe abstraite du domaine, redéfinie par ReponseQCM, ReponseRelier et ReponseLibre |
| Données renvoyées | Aucune (void) |
| Paramètres d'entrée | Question question |
| Exceptions levées | ReponseInvalideException : proposition d'une autre question, élément relié deux fois, texte vide ou de plus de 1 000 caractères |
| API qui expose le service | Aucune : méthode du domaine, appelée par RepondreQuestionUseCase.executer |

```java
public abstract void valider(Question question)
```

### Interface de la méthode evaluer (Question)

| | |
|---|---|
| Nom de la méthode | evaluer |
| Rôle | Calcule la part juste de la réponse (fractionJuste) puis ses points. Pour une réponse libre, le résultat est provisoire : 1 si un motif correspond (statut ACCEPTEE_PAR_MOTIF), sinon 0 (statut A_EXAMINER) en attendant le cas « Corriger les réponses libres ». |
| Classe ou interface | Question : classe abstraite du domaine, redéfinie par QuestionQCM, QuestionPointsARelier et QuestionReponseLibre ; chaque type calcule sa fraction juste puis appelle Bareme.calculerPoints |
| Données renvoyées | int : les points calculés de la réponse (pointsCalcules) |
| Paramètres d'entrée | Reponse reponse, long tempsMs |
| Exceptions levées | Aucune |
| API qui expose le service | Aucune : méthode du domaine, appelée par RepondreQuestionUseCase.executer |

```java
public abstract int evaluer(Reponse reponse, long tempsMs)
```

### Interface de la méthode calculerPoints (Bareme)

| | |
|---|---|
| Nom de la méthode | calculerPoints |
| Rôle | Applique le barème : points maximum, décroissance avec le temps et points partiels. |
| Classe ou interface | Bareme : objet de valeur du domaine (points maximum, décroissance avec le temps, points partiels) |
| Données renvoyées | int : arrondi(pointsMax × (1 - (t / T) / 2) × fractionJuste), ou arrondi(pointsMax × fractionJuste) sans décroissance |
| Paramètres d'entrée | long tempsMs, long dureeMs, double fractionJuste |
| Exceptions levées | IllegalArgumentException si fractionJuste n'est pas entre 0 et 1 : erreur de programmation |
| API qui expose le service | Aucune : méthode du domaine, appelée par Question.evaluer |

```java
public int calculerPoints(
    long tempsMs, long dureeMs, double fractionJuste)
```

### Interface de la méthode existePour (ReponseRepository)

| | |
|---|---|
| Nom de la méthode | existePour |
| Rôle | Cherche si le participant a déjà répondu à cette question, pour refuser une seconde réponse avant tout calcul. |
| Classe ou interface | ReponseRepository : interface de la couche application, implémentée par PostgresReponseRepository |
| Données renvoyées | boolean : vrai si une réponse existe déjà pour ce participant et cette question |
| Paramètres d'entrée | Long idParticipant, Long idQuestion |
| Exceptions levées | Aucune |
| API qui expose le service | Aucune : méthode interne, appelée par RepondreQuestionUseCase.executer (SEND /app/sessions/{idSession}/reponses) |

```java
boolean existePour(Long idParticipant, Long idQuestion)
```

### Interface de la méthode enregistrer (ReponseRepository)

| | |
|---|---|
| Nom de la méthode | enregistrer |
| Rôle | Enregistre la réponse et son contenu (propositions cochées ou paires reliées) en forçant l'écriture, pour qu'une erreur soit détectée avant la fin du cas d'usage. |
| Classe ou interface | ReponseRepository : interface de la couche application, implémentée par PostgresReponseRepository (entités JPA ReponseEntity, ReponseChoixEntity et ReponseLienEntity, converties vers le domaine) |
| Données renvoyées | Reponse : la réponse avec son identifiant |
| Paramètres d'entrée | Reponse reponse |
| Exceptions levées | DejaReponduException si la contrainte UNIQUE (idParticipant, idQuestion) est violée (deux envois simultanés) ; une autre erreur de base remonte en exception Spring non contrôlée, la transaction est annulée et l'erreur est traduite en ERREUR_SERVEUR (500) |
| API qui expose le service | Aucune : méthode interne, appelée par RepondreQuestionUseCase.executer (SEND /app/sessions/{idSession}/reponses) |

```java
Reponse enregistrer(Reponse reponse)
```

### Interface de la méthode ajouterPoints (ParticipantRepository)

| | |
|---|---|
| Nom de la méthode | ajouterPoints |
| Rôle | Ajoute les points de la réponse au score total du participant et met à jour sa date de dernière activité. |
| Classe ou interface | ParticipantRepository : interface de la couche application, implémentée par PostgresParticipantRepository (une seule requête UPDATE scoreTotal = scoreTotal + :points, derniereActivite = :maintenant) |
| Données renvoyées | Aucune (void) |
| Paramètres d'entrée | Long idParticipant, int points |
| Exceptions levées | Aucune exception métier |
| API qui expose le service | Aucune : méthode interne, appelée par RepondreQuestionUseCase.executer (SEND /app/sessions/{idSession}/reponses) |

```java
void ajouterPoints(Long idParticipant, int points)
```

### Interface de la méthode regleRefusee (JournalEvenements)

| | |
|---|---|
| Nom de la méthode | regleRefusee |
| Rôle | Trace une réponse refusée (hors délai ou en double), dans les logs seulement. |
| Classe ou interface | JournalEvenements : interface partagée (shared/application/port), implémentée par PostgresJournalEvenements ; écrit dans les logs au niveau WARN, sans ligne dans JOURNAL_EVENEMENT. Appelée avec « reponse_hors_delai » ou « reponse_deja_enregistree » et les champs idSession et idQuestion, sans donnée personnelle. |
| Données renvoyées | Aucune (void) |
| Paramètres d'entrée | String nom, Map<String, Object> champs |
| Exceptions levées | Aucune |
| API qui expose le service | Aucune : méthode interne, appelée par RepondreQuestionUseCase.executer (SEND /app/sessions/{idSession}/reponses) |

```java
void regleRefusee(String nom, Map<String, Object> champs)
```

### Interface de la méthode versMessage (ReponseMapper)

| | |
|---|---|
| Nom de la méthode | versMessage |
| Rôle | Convertit la réponse enregistrée en accusé de réception pour le navigateur, avec l'identifiant de requête envoyé par le client. |
| Classe ou interface | ReponseMapper : convertisseur de la couche infrastructure, appelé par ReponseController |
| Données renvoyées | ReponseEnregistreeMessage (requestId, idQuestion, horodatageServeur) |
| Paramètres d'entrée | ReponseEnregistree r, String requestId |
| Exceptions levées | Aucune |
| API qui expose le service | Aucune : méthode interne, appelée par ReponseController.repondre (SEND /app/sessions/{idSession}/reponses) |

```java
static ReponseEnregistreeMessage versMessage(
    ReponseEnregistree r, String requestId)
```

### Interface de la méthode accuserReception (DiffuseurTempsReel)

| | |
|---|---|
| Nom de la méthode | accuserReception |
| Rôle | Envoie l'accusé de réception au seul étudiant concerné, après la validation de la transaction. |
| Classe ou interface | DiffuseurTempsReel : interface de la couche application, implémentée par StompDiffuseurTempsReel (SimpMessagingTemplate) |
| Données renvoyées | Aucune (void) |
| Paramètres d'entrée | Long idParticipant, ReponseEnregistreeMessage message |
| Exceptions levées | Aucune : un participant déconnecté retrouve l'état à sa reconnexion |
| API qui expose le service | /user/queue/reponses : accusé envoyé à l'étudiant concerné ; appelée par ReponseController.repondre (SEND /app/sessions/{idSession}/reponses) |

```java
void accuserReception(
    Long idParticipant, ReponseEnregistreeMessage message)
```
