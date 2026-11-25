# Plan d'implémentation – UC3 « Insérer une page de quiz dans le cours » (front)

Périmètre : **front React uniquement**, écran E3 « Éditeur cours + quiz », éléments 1 (titre et version), 2 (pages du
cours), 3 (« Insérer un quiz ici ») et 4 (aperçu de la page). Le back est hors périmètre. Spécification :
[`docs/uc/UC3-inserer-page-quiz.md`](../uc/UC3-inserer-page-quiz.md). Branche : `feature/uc3-front`.

Hors périmètre : éléments 5 à 18 de E3 (type, énoncé, réponses, durée, réappliquer, enregistrer, lancer, barème,
motifs, déroulé, image) : **emplacement prévu seulement** ; paramétrage de la question (UC4, UC5, UC13), déroulé
(UC14), réapplication (UC6), page de classement (UC11), déplacement et suppression d'une page, écran de connexion E1
(UC1).

## 1. État de départ

- Front (socle de l'UC9) : `shared/http` (`requete`, `ErreurHttp` avec `code`), `shared/config` (`urlApi`,
  `estEnDeveloppement`), `shared/lib`, `shared/styles` (`tokens.css`, Rubik), `shared/ui/LogoIut`, `react-router` 7
  (`app/main.tsx`), Vitest + RTL. Rien dans `features/cours`. PDF.js non installé. Pas de CSRF
  (`TODO(UC9)` dans `clientHttp.ts`), pas de variante binaire (`shortcut:` dans `clientHttp.ts`).
- Back (vérifié le 25/11/2026, branches `develop` `af5bc91`, `feature/uc2-importer-un-cours` `e3f8657`,
  `feature/uc3-inserer-page-quiz` `d896516`) :
  - `POST /api/cours/{idCours}/pages-quiz` est **codé** (branche UC3) : requête, réponse et codes conformes au dossier.
  - **Aucune route de lecture n'existe** sur aucune branche (`GET /api/cours/{idCours}`, `.../pages`, `.../quiz`,
    `.../fichier`), ni `GET /api/auth/csrf`.
  - CSRF actif hors `SECURITE_OUVERTE`, ignoré sur `/api/public/**` ; dépôt de jeton non configuré pour un front
    (prévu avec la feature `compte`). En développement, `SECURITE_OUVERTE=true` coupe le CSRF.
  - CORS expose `X-Request-Id` et `Date` (pas `Location`, inutile ici).
- Maquette E3 (Figure 30 du dossier, page 36 de `docs/uc/Sae Kahoot (3).pdf`) : **absente de `docs/maquettes/`**
  (question U5).

## 2. Décisions prises

| # | Décision |
|---|---|
| D1 | Route d'insertion : celle du **dossier**, `POST /api/cours/{idCours}/pages-quiz` (pas `POST .../versions/{idVersion}/pages`, réservée à la page de classement, UC11). |
| D2 | Routes de lecture : celles du `docs/API.md` du back, **à confirmer** ; formes de réponse provisoires (§3), converties et vérifiées dans `cours/api`, seul endroit à changer quand le back les fixera. |
| D3 | Code dans `features/cours` (`api`, `domain`, `application`, `presentation`), assemblage dans `app`. PDF.js partagé (E3 puis présentation projetée) : `shared/pdf`. |
| D4 | **CSRF** (choix du 25/11/2026) : `shared/http` demande le jeton par `GET /api/auth/csrf` au premier `POST`/`PUT`/`PATCH`/`DELETE` hors `/api/public/**`, le garde en mémoire et l'envoie dans `X-XSRF-TOKEN`. Lecture du champ `token` (provisoire, A3), isolée dans une seule fonction. Si la route échoue (absente, `SECURITE_OUVERTE`), envoi sans en-tête. Sur un `403` d'une requête enseignant qui modifie : nouveau jeton puis **un seul** rejeu (`docs/API.md` du front §2) ; un `403` refusé avant le contrôleur n'a rien créé. Aucun changement pour `/api/public/**` (UC8, UC9). |
| D5 | **401** (choix du 25/11/2026) : géré **par écran**, comme `onRejoindre` de l'UC9. Le hook signale l'action `CONNEXION` ; `app/RouteEditeur.tsx` redirige vers `/connexion?retour=/cours/{idCours}/editeur`, page provisoire isolée `app/ConnexionProvisoire.tsx` (`TODO(UC1)`), à remplacer par E1. |
| D6 | **PDF** (choix du 25/11/2026) : téléchargé par `shared/http` (variante binaire, `ArrayBuffer`, mêmes erreurs typées), puis donné à PDF.js (`data`). Un seul document par écran, fermé au démontage et au rechargement. |
| D7 | **PDF.js** (`pdfjs-dist`, version du `package-lock.json` à l'installation) : worker importé par `?url` de Vite (copié dans `dist/assets`, aucun CDN), `isEvalSupported: false`. Chargé uniquement par la route de l'éditeur (`lazy`) : absent du bundle étudiant (`docs/ARCHITECTURE.md` §4). |
| D8 | **Miniatures** rendues quand elles deviennent visibles (`IntersectionObserver` natif), rendu annulé si elles sortent du DOM ; **aperçu** rendu à la demande, à la largeur de sa zone. Nombre de pages : `numPages` du document PDF. |
| D9 | **Numérotation, emplacements, repère** : fonctions pures de `cours/domain` (§5). Le front ne recalcule jamais les décalages : après un `201`, la liste des pages insérées est **remplacée** par `pages` de la réponse. |
| D10 | **Repère de texte** : texte de la page `numeroPage` (page 1 si `numeroPage` vaut 0) par `getTextContent()`, espaces normalisés, 300 derniers caractères (300 premiers pour 0), absent si vide. Coupe sans casser une paire de substitution UTF-16 (limite du back en unités UTF-16). Si l'extraction échoue : insertion **sans** repère. |
| D11 | **Choix du quiz** (proposition du 25/11/2026, à valider avec l'auteur de l'UC3, U1) : clic sur « Insérer un quiz ici » → `<dialog>` natif avec boutons radio (quiz du cours, puis « Nouveau quiz ») et deux boutons « Insérer » / « Annuler ». Présélection : quiz de la dernière insertion faite dans l'éditeur, sinon premier quiz, sinon « Nouveau quiz ». « Nouveau quiz » envoie la requête **sans** `idQuiz`. |
| D12 | **Une seule insertion à la fois** : de la confirmation à la réponse (extraction du repère comprise), tous les boutons « Insérer un quiz ici » et « Insérer » sont désactivés ; verrou synchrone (`useRef`) en plus de l'état, contre le double clic avant le rendu suivant. |
| D13 | **Message** : choisi par `code` (texte de l'UC3, jamais le `error` du back pour un code connu ; exemple : le back répond « Certaines valeurs sont invalides. » pour `REQUETE_INVALIDE`). Sans `code` connu : par statut (§4). |
| D14 | **« Recharger »** : bouton affiché avec chaque message qui dit « rechargez l'éditeur » ; relit cours, dernière version, pages, quiz et PDF (état CHARGEMENT). |
| D15 | Après un `201` : sélection de la nouvelle page, aperçu « Question à paramétrer » avec `titreQuiz` ; si `quizCree`, `{idQuiz, titreQuiz}` est ajouté à la liste des quiz de l'éditeur (pas de relecture). |
| D16 | Page de quiz distinguée par la couleur (`--couleur-iut`, « Rouge IUT : logo et pages de quiz ») **et** une icône SVG embarquée (`DESIGN.md` §3). Page de classement (type `CLASSEMENT`, UC11) : affichée et numérotée, icône à part, sans action. |
| D17 | Développement sans back : démo `/demo/editeur` (développement seulement, comme `/demo/question`) avec une fausse API de lecture et d'insertion et un petit PDF de démonstration embarqué. |
| D18 | Libellés absents de la spec (titre du dialogue, « Insérer », « Annuler », « Question à paramétrer », « Page de quiz », « Page de classement », textes de chargement) : **provisoires**, regroupés dans un seul fichier de la présentation, à valider (U2). |

## 3. Contrats des routes

| Route | Statut | Requête | Réponse utilisée par le front |
|---|---|---|---|
| `GET /api/auth/csrf` | À confirmer, absente du back (A3) | — | `{token}` (provisoire) |
| `GET /api/cours/{idCours}` | À confirmer, absente du back | — | `{idCours, titre, archive, versions: [{idVersion, numero, nbPages}]}` (provisoire) ; dernière version = `numero` le plus grand |
| `GET /api/cours/{idCours}/versions/{idVersion}/pages` | À confirmer, absente du back | — | `[{idPage, numeroPage, ordre, type}]` (provisoire : même forme que `pages` du `201`) |
| `GET /api/cours/{idCours}/quiz` | À confirmer, absente du back | — | `[{idQuiz, titre}]` (provisoire, autres champs ignorés) |
| `GET /api/cours/{idCours}/versions/{idVersion}/fichier` | À confirmer, absente du back | — | `application/pdf` (`ArrayBuffer`) |
| `POST /api/cours/{idCours}/pages-quiz` | **Dossier, codée** (branche UC3 du back) | `{idVersion, numeroPage, ordre, idQuiz?, repereTexte?}` ; `idQuiz` absent = nouveau quiz ; `repereTexte` absent si vide ou non extrait ; cookie de session + `X-XSRF-TOKEN` | `201 {idPage, idQuiz, titreQuiz, quizCree, idQuestion, numeroPage, ordre, pages: [{idPage, numeroPage, ordre, type}]}` ; `Location` non lu |

Erreurs : `{error, request_id, champs?, code?}` (`ErreurHttp`).

## 4. Tableau des erreurs de l'insertion

Messages repris mot pour mot de l'UC3. « Réactiver » : les boutons d'insertion redeviennent actifs. « Bloquer » : ils
restent désactivés jusqu'au rechargement (branche « oui » du diagramme d'activité, étape 21).

| Code | Statut | Message exact | Affichage | Action |
|---|---|---|---|---|
| — | 401 | Aucun (« Retour à l'écran de connexion. ») | — | Redirection vers `/connexion?retour=…` (D5) |
| — | 403 | « Action non autorisée. » | Bandeau de l'éditeur | Après le rejeu CSRF unique (D4) ; réactiver |
| `REQUETE_INVALIDE` | 400 | « Requête invalide, rechargez l'éditeur. » | Bandeau + « Recharger » | Réactiver |
| `COURS_INTROUVABLE` | 404 | « Cours introuvable. » | Bandeau | Réactiver |
| `COURS_ARCHIVE` | 409 | « Ce cours est archivé : il n'est plus modifiable. » | Bandeau | Réactiver |
| `VERSION_PERIMEE` | 409 | « Une nouvelle version du cours a été importée : rechargez l'éditeur. » | Bandeau + « Recharger » | Bloquer |
| `EMPLACEMENT_INVALIDE` | 422 | « Emplacement invalide : rechargez l'éditeur. » | Bandeau + « Recharger » | Bloquer |
| `QUIZ_INTROUVABLE` | 404 | « Quiz introuvable. » | Bandeau | Réactiver |
| `QUIZ_EN_SEANCE` | 409 | « Ce quiz est en cours de séance : réessayez après sa clôture. » | Bandeau | Réactiver |
| `ERREUR_SERVEUR` | 500 | « L'insertion a échoué, réessayez. » | Bandeau | Réactiver (rien n'est créé) |

Replis sans `code` connu (corps absent ou hors format, ou back pas encore aligné) :

| Cas | Traitement |
|---|---|
| `400` sans code (JSON illisible) | Ligne `REQUETE_INVALIDE` |
| `5xx` sans code (le back actuel n'envoie pas `ERREUR_SERVEUR`, question Q2) | Ligne `ERREUR_SERVEUR` |
| `404`, `409`, `422` sans code connu (exemple : contrainte de base → `409` sans code, question Q3) | `error` du back s'il existe, sinon ligne `ERREUR_SERVEUR` ; réactiver (précédent UC9, D3) |
| Pas de réponse HTTP (réseau) | Texte absent de la spec (U3). Provisoire : ligne `ERREUR_SERVEUR` + « Recharger » (la page a pu être créée) ; réactiver |

Le bandeau est une zone `role="alert"` ; il s'efface à la tentative d'insertion suivante ou au rechargement.

Erreurs de **chargement** (routes de lecture, absentes de la spec) : `401` → redirection ; `404` → « Cours
introuvable. » ; autre → `error` du back et `request_id`, sinon texte provisoire (U4) ; toujours avec « Recharger ».

## 5. Domaine `cours`

- **Types** : `PageInseree {idPage, numeroPage, ordre, type}`, `Emplacement {numeroPage, ordre}`, `QuizResume {idQuiz,
  titre}`, `VersionCours {idVersion, numero}`, `Cours {idCours, titre, archive, version}`.
- **Numérotation** (dossier) : page `p` du PDF en position `p + #{insérées, numeroPage < p}` ; page insérée `(n, o)` en
  position `n + #{insérées, numeroPage < n} + o + 1`. Exemple de la spec en test : PDF de 12 pages, page en (2, 0),
  insertion en (4, 0) → position 6, page 5 du PDF → position 7.
- **Liste affichée** : insérées à 0 (par `ordre`), page 1, insérées à 1, …, page `nbPages`, insérées à `nbPages`.
  Chaque élément porte sa position.
- **Emplacement des boutons** : un bouton au début `(0, 0)`, puis un après chaque élément : après la page `p` du PDF
  `(p, 0)`, après la page insérée `(n, o)` → `(n, o + 1)`. Chaque emplacement valide (`0 ≤ n ≤ nbPages`,
  `0 ≤ o ≤ nombre à n`) apparaît une seule fois.
- **Repère** : `nettoyerRepere(texte, numeroPage) → string | undefined` (D10).
- **Table des erreurs** : `(statut, code) → {message, recharger, bloquer, connexion}` (§4).
- **Reducer de l'éditeur** (§6).

## 6. États de l'éditeur

```text
CHARGEMENT ──cours, pages, quiz et PDF lus──▶ PRET (sélection : page 1 du PDF)
CHARGEMENT ──401──▶ redirection E1
CHARGEMENT ──autre échec──▶ ERREUR_CHARGEMENT (message + « Recharger »)
ERREUR_CHARGEMENT | PRET ──« Recharger »──▶ CHARGEMENT

PRET, insertion :
AUCUNE ──clic sur une miniature──▶ AUCUNE (sélection changée, aperçu rendu)
AUCUNE ──« Insérer un quiz ici » (emplacement), insertion non bloquée──▶ CHOIX_QUIZ
CHOIX_QUIZ ──« Annuler » ou Échap──▶ AUCUNE
CHOIX_QUIZ ──« Insérer » (idQuiz ou nouveau quiz)──▶ ENVOI (boutons désactivés, message effacé)
ENVOI : extraction du repère (échec → sans repère), puis POST
ENVOI ──201──▶ AUCUNE : pages = réponse.pages, quiz ajouté si quizCree, sélection = nouvelle page (« Question à paramétrer »)
ENVOI ──401──▶ redirection E1
ENVOI ──VERSION_PERIMEE | EMPLACEMENT_INVALIDE──▶ AUCUNE + message + « Recharger », insertion bloquée
ENVOI ──autre erreur──▶ AUCUNE + message (+ « Recharger » si §4), boutons réactivés
ENVOI ──panne réseau──▶ relecture des pages (toujours ENVOI), puis AUCUNE + pages relues + message + « Recharger »
ENVOI ──« Insérer un quiz ici » ou « Insérer »──▶ ignoré (D12)
```

## 7. Étapes (un bloc = une session de travail)

- [x] **B0 Préparation** : état de l'arbre de travail réglé (PDF de l'UC9 supprimé et dossier `Sae Kahoot (3).pdf`
  non suivi, U7) ; `npm ci`, `npm run lint`, `npm run build` et `npm test` passent ; plan enregistré.
- [x] **B1 Socle enseignant** : `shared/http` : CSRF (D4) dans un fichier à part, appliqué par `requete`, rejeu unique
  sur `403`, rien pour `/api/public/**` ; variante binaire `requeteBinaire` (`ArrayBuffer`) qui partage la conversion
  des erreurs (retire le `shortcut:`). Installer `pdfjs-dist` ; `shared/pdf` : worker par `?url`, ouverture d'un
  document depuis un `ArrayBuffer`, `nbPages`, rendu d'une page dans un `<canvas>` à une largeur donnée (annulable),
  texte brut d'une page, fermeture. Vérifier que `dist/` contient le worker et aucune adresse externe.
  Fait (`csrf.ts`, `clientHttp.ts`, `shared/pdf/documentPdf.ts`, `pdfjs-dist` 6.5.438). Écarts : tests de
  `shared/http` écrits dès B1 (`clientHttp.test.ts`) ; `isEvalSupported` (D7) n'existe plus en version 6, qui
  n'utilise plus `eval`. `dist/` vérifié avec un import temporaire : worker dans `dist/assets`, PDF.js dans un chunk
  à part, seules adresses présentes = espaces de noms XML, licence et base factice de `new URL` (rien de chargé).
- [x] **B2 Domaine `cours`** : types, numérotation, liste affichée et emplacements des boutons, `nettoyerRepere`,
  table des erreurs (§4), reducer (§6).
  Fait (`cours/domain` : `cours.ts`, `numerotation.ts`, `repere.ts`, `erreursEditeur.ts`, `machineEditeur.ts`).
  Écarts validés le 25/11/2026 : tests du domaine écrits dès B2 (part « domaine », « table des erreurs » et
  « reducer » de B6) ; état `LECTURE_SEULE` ajouté au §6 (cours chargé avec `archive`, sans bouton d'insertion,
  sélection et « Recharger » possibles) ; état final `CONNEXION` pour les `401` (le hook redirige) ; table des
  erreurs `{message, affichage: BANDEAU | REDIRECTION, action: RECHARGER | AUCUNE, bloquer}` ; `VersionCours` porte
  aussi `nbPages`. Le quiz choisi dans le dialogue est porté par `CONFIRMER` (proposition : `quizParDefaut`).
- [x] **B3 API et PDF `cours`** : `lireCours` (dernière version), `lirePagesInserees`, `lireQuizDuCours`,
  `lireFichierPdf`, `insererPageQuiz` (corps sans `idQuiz` ni `repereTexte` quand ils sont absents) ; conversion et
  vérification des DTO (§3) ; `extraireRepere(document, numeroPage)` (texte brut par `shared/pdf`, nettoyage par le
  domaine, `undefined` si échec).
  Fait (`cours/api` : `convertirCours.ts`, une conversion par route ; `coursApi.ts` ; `extraireRepere.ts`). Rendu,
  ouverture et fermeture du PDF : déjà dans `shared/pdf` (B1), branchés par le hook en B5. Écarts : tests de l'API
  écrits dès B3 (part « API `cours` » de B6) ; `insererPageQuiz` renvoie `REUSSIE | REFUSEE | ECHEC_RESEAU`
  (l'appelant relit les pages après `ECHEC_RESEAU`, jamais de renvoi automatique) ; un `201` mal formé est traité
  comme `ECHEC_RESEAU` (provisoire, `TODO(UC3)`) ; une réponse de lecture mal formée lève une `Error`.
- [x] **B4 Présentation E3** : en-tête (élément 1 ; emplacement vide de l'élément 11), liste des pages avec
  miniatures paresseuses, pages insérées (couleur + icône) et boutons « Insérer un quiz ici » (éléments 2 et 3),
  dialogue de choix du quiz, aperçu (élément 4 : page du PDF, page de quiz, « Question à paramétrer », page de
  classement), bandeau d'erreur avec « Recharger », zone vide pour les éléments 5 à 18. Données par props, styles
  par variables de la charte (`EditeurCours.css`). Démo `/demo/editeur` (D17).
  Fait (`cours/presentation` : `EditeurCours`, `EnteteEditeur`, `ListePages`, `MiniaturePage`, `RenduPdf`,
  `ApercuPage`, `DialogueChoixQuiz`, `BandeauErreur`, `IconePage`, `libelles.ts` ; `app/demo/DemoEditeur.tsx`).
  Disposition d'après la Figure 30 (lue dans le dossier PDF, U5 : `docs/maquettes/E3.png` toujours absent) :
  aperçu et zone 5 à 18 côte à côte, bande des pages en bas. Écarts : l'écran reçoit l'état du reducer
  (`EtatEditeur`) et une fonction `rendrePage` (signature de `DocumentPdf.rendrePage`) ; bouton « + » avec
  « Insérer un quiz ici » en infobulle et un libellé accessible par position (« Insérer un quiz après la page 4 ») ;
  titres des quiz des miniatures passés par la prop `titresQuiz` (provisoire, `TODO(UC3)`, Q5) ; bandeau de lecture
  seule avec le message de `COURS_ARCHIVE` (provisoire, `TODO(UC3)`) ; le focus revient au bouton « + » quand
  l'insertion se termine. Démo sans PDF : pages dessinées sur le canvas (U8). Tests des composants : B6.
- [x] **B5 Assemblage** : hook `useEditeurCours` (API et ouverture du PDF injectables, chargement parallèle,
  insertion D12, rechargement, fermeture du document) ; `app/RouteEditeur.tsx` sur `/cours/:idCours/editeur` (`lazy`,
  identifiant non entier → « Cours introuvable. ») ; `app/ConnexionProvisoire.tsx` sur `/connexion` (`TODO(UC1)`).
  Mise à jour de `docs/ARCHITECTURE.md` (§4 route E3, §6 CSRF et binaire, §8 PDF.js installé, §12 F5),
  `docs/API.md` (§5 E3 : `POST .../pages-quiz`), `docs/DESIGN.md` (E3) et `CLAUDE.md` (pile : `pdfjs-dist`).
  Fait (`cours/application/useEditeurCours.ts` ; `app/RouteEditeur.tsx`, `app/EcranEditeurCours.tsx`,
  `app/ConnexionProvisoire.tsx`). Écarts validés le 25/11/2026 : route `/cours/:idCours/editeur` (au lieu de
  `/cours/:idCours`, D5 suivi) ; après une panne réseau, le hook relit les pages en restant en ENVOI, puis
  `ECHEC_RESEAU_INSERTION` porte `pages` (relues, ou `null` si la relecture échoue) et le reducer remplace la liste
  (§6 et test du reducer ajustés). `CHARGE` part une fois le PDF ouvert (D8, `numPages`) : les lectures et le PDF
  partent en parallèle après la lecture du cours, et les miniatures se rendent ensuite, à la demande. PDF.js est
  importé dynamiquement par le hook (ouverture par défaut). `app/EcranEditeurCours.tsx` porte le hook, avec une `key`
  par cours ; `RouteEditeur` ne fait que valider l'identifiant.
- [x] **B6 Tests** : domaine (formules et exemple de la spec, emplacements uniques et complets, `nettoyerRepere`
  dont page 0, vide, espaces, 300 caractères, paire de substitution), table des erreurs (chaque message mot pour
  mot, replis §4), reducer (chaque transition du §6 et rien d'autre), `shared/http` (en-tête CSRF sur `POST` et pas
  sur `GET`, aucun appel CSRF pour `/api/public/**`, rejeu unique sur `403`, route CSRF absente → envoi sans en-tête,
  binaire), API `cours` (faux `fetch`), composants E3 et hook avec un faux document PDF (PDF.js ne tourne pas sous
  jsdom) et un faux `IntersectionObserver` : double clic → un seul `POST`, `201` → liste remplacée et nouvelle page
  sélectionnée, extraction en échec → `POST` sans `repereTexte`, « Recharger » → relecture, `401` → redirection.
  Fait : compléments dans `numerotation.test.ts` (plusieurs pages au même endroit, numeroPage 0 et nbPages, bornes des
  emplacements), `machineEditeur.test.ts` (matrice état × action : seules les transitions du §6 changent l'état),
  `coursApi.test.ts` (aucun `idEnseignant`), `clientHttp.test.ts` (`401` sans rejeu) ; nouveaux
  `presentation/EditeurCours.test.tsx`, `application/useEditeurCours.test.tsx`, `app/EcranEditeurCours.test.tsx` et
  aide `src/test/fauxNavigateur.ts` (faux `IntersectionObserver`, `ResizeObserver`, `<dialog>`, document PDF).
  Limite : jsdom ne traduit pas Échap en événement `cancel` du `<dialog>` ; le test envoie `cancel` directement.

## 8. Questions ouvertes

### Pour l'équipe back

| # | Question | Bloque |
|---|---|---|
| Q1 | Formes de `GET /api/cours/{idCours}`, `.../versions/{idVersion}/pages`, `/api/cours/{idCours}/quiz` et `.../fichier` (§3, provisoires), et date de livraison : aucune n'existe sur `develop`, UC2 ni UC3 | B3, B5 (démo en attendant) |
| Q2 | Le `500` de l'insertion n'a pas de `code` (`GestionnaireErreurs`) alors que le dossier donne `ERREUR_SERVEUR` : l'ajouter ? | Repli par statut en attendant |
| Q3 | Une contrainte de base violée répond `409` sans code (« Cette opération entre en conflit… ») alors que le dossier prévoit `500 ERREUR_SERVEUR` | Repli §4 en attendant |
| Q4 | `GET /api/auth/csrf` : forme du corps (A3), date ; dépôt de jeton prévu (session ou cookie `XSRF-TOKEN`) | D4 (provisoire) |
| Q5 | Ajouter `idQuiz` (et `titreQuiz`, `idQuestion`) aux pages de la liste : sans eux, l'aperçu d'une page de quiz déjà enregistrée ne peut pas nommer son quiz | Aperçu (élément 4) |
| Q6 | `nbPages` de la version et `numPages` du PDF peuvent-ils différer ? Le front affiche `numPages` | D8 |

### Pour l'équipe front, l'auteur de l'UC3 et l'enseignant

| # | Question | Choix provisoire |
|---|---|---|
| U1 | Interface du choix du quiz (D11) | Dialogue après le clic, à valider avec l'auteur de l'UC3 |
| U2 | Libellés absents de la spec (D18) | Provisoires, regroupés dans un fichier |
| U3 | Message d'une panne réseau pendant l'insertion | Message `ERREUR_SERVEUR` + « Recharger » |
| U4 | Messages d'erreur du chargement de l'éditeur (routes de lecture hors dossier) | `error` du back, sinon texte provisoire |
| U5 | Maquette E3 : exporter la Figure 30 du dossier en `docs/maquettes/E3.png` avant B4 | Mise en page en trois zones (pages, aperçu, zone 5 à 18) |
| U6 | Ressources annexes de PDF.js (`cmaps/`, `standard_fonts/`) : les copier dans le build demande une dépendance (`vite-plugin-static-copy`) ou un script, choix d'équipe | Non copiées : un PDF à polices non embarquées ou en écriture asiatique peut mal s'afficher |
| U7 | B0 : commiter le dossier `Sae Kahoot (3).pdf` (12 Mo) et la suppression du PDF de l'UC9 ? | À décider |
| U8 | PDF de la démo : en générer un petit (quelques pages de texte) ou en fournir un ? | Petit PDF généré, sans donnée réelle |

## 9. Critères d'acceptation

- [ ] E3 affiche le titre et la version, les miniatures des pages du PDF et des pages insérées dans l'ordre, avec la
  numérotation du dossier.
- [ ] Une page de quiz se distingue par la couleur et par une icône ; un clic sur une miniature l'affiche dans
  l'aperçu.
- [ ] Une miniature n'est rendue que quand elle devient visible ; l'aperçu est rendu à la demande ; un seul document
  PDF ouvert par écran.
- [ ] Un bouton « Insérer un quiz ici » au début, entre chaque paire de pages et à la fin ; chacun envoie
  l'emplacement du §5.
- [ ] La requête a les noms de champs du back ; `idQuiz` absent pour « Nouveau quiz » ; `repereTexte` absent si vide
  ou si l'extraction échoue, 300 caractères au plus sinon.
- [ ] Le `POST` porte `X-XSRF-TOKEN` quand un jeton est obtenu ; aucune requête `/api/public/**` ne déclenche
  d'appel CSRF ni d'en-tête CSRF.
- [ ] Une seule requête par insertion, même avec un double clic ; boutons désactivés pendant l'envoi.
- [ ] Après un `201`, la liste vient de la réponse (aucun décalage calculé par le front), la nouvelle page est
  sélectionnée et l'aperçu indique « Question à paramétrer ».
- [ ] Chaque erreur affiche le message exact du §4, avec « Recharger » quand il dit « rechargez l'éditeur » ; un
  `401` mène à `/connexion`.
- [ ] Le worker de PDF.js est dans `dist/` ; aucune ressource externe ; PDF.js absent du bundle des écrans étudiants.
- [ ] Ni `dangerouslySetInnerHTML`, ni donnée personnelle dans la console, ni couleur en dur.
- [ ] `npm run lint`, `npm run build` et `npm test` passent.
