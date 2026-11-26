# Plan d'implémentation – UC7 « Lancer un quiz en séance » (front)

Périmètre : **front React uniquement** : E3 « Éditeur cours + quiz », élément 11 « Lancer la présentation », et E5
« Quiz en cours » (écran projeté). Spécification : [`docs/uc/UC7-lancer-quiz-seance.md`](../uc/UC7-lancer-quiz-seance.md).
Contrat : `docs/API.md` du back, branche `feature/uc7-lancer-un-quiz-en-seance`, §3.4 (routes marquées « Fait
(UC7) ») et §4 (temps réel). Branche front : `FEAT/uc7-lancer-quiz-seance`, créée depuis `fix/uc3` (client STOMP,
`useTempsReelSeance`, `Decompte` de l'UC9 ; CSRF et éditeur E3 de l'UC3). Elle remplace le travail de `uc2-front`
(fichiers `RouteSeance.tsx`, `RouteEditeurProvisoire.tsx`, `Icone.tsx`, `ecranEnseignant.css` jamais commités).

Hors périmètre : écrans intermédiaires (UC14, `…/ecran`), classement projeté E6 (UC11, `…/classement`), image de la
question (UC4), autorisation après coup `POST .../identites-non-verifiees` (UC15).

## 1. Décisions prises

| # | Décision |
|---|---|
| D1 | **Commandes en REST, STOMP en réception seule** (`CLAUDE.md`, règle 4) : lancer, question suivante, clore la question, clore la séance passent par REST ; E5 s'abonne à `etat`, `question`, `correction`, `repartition`, `connectes` sous `/topic/sessions/{codeAcces}/`. Le `codeAcces` vient de l'état REST. |
| D2 | **État complet par REST** (`GET /api/sessions/{idSession}`) à l'ouverture de E5, à chaque (re)connexion STOMP, après chaque commande (le corps de la réponse est l'état à jour) et, tant que STOMP n'est pas connecté, toutes les 2 s. Un rechargement de la page reprend donc la séance. |
| D3 | **Réducteur pur** (`seance/domain/seanceAnimee.ts`) qui ignore ce qui arrive en retard : l'avancement d'une séance (position, question close, séance close) ne recule jamais, l'ordre entre REST et STOMP est sans effet. |
| D4 | **Décompte** sur l'heure du serveur (règle 5) : `tempsRestantMs` de l'état REST quand il est donné, sinon `echeance` + écart relevé sur l'en-tête `Date` (`echeanceQuestion` de l'UC9, avec son repli). Le serveur clôt seul la question ; si le message de clôture n'arrive pas 1,5 s après l'échéance, l'état est relu. Affichage : le `Decompte` de l'UC9, rafraîchi toutes les 200 ms, avec « Question n / total ». |
| D5 | **Messages** : ceux de la fiche UC7. Le `error` du back est affiché tel quel pour 403, 404, 409 et 422 (il porte la page incomplète et le titre du cours) ; 500 et panne réseau → « Le lancement a échoué, réessayez. » ; 401 → `/connexion?retour=…`. Sans corps du back : messages de la fiche pour 403 et 404. |
| D6 | **409 `SESSION_DEJA_OUVERTE`** : « La reprendre » (`GET /api/sessions/ouverte` puis E5) ou « La terminer et lancer ce quiz » (`POST /api/sessions/{id}/cloture` puis nouveau lancement ; `SEANCE_INTROUVABLE` ou `SEANCE_TERMINEE` à la clôture = déjà fait). **409 `ANNUAIRE_INDISPONIBLE`** : « Autoriser » relance avec `{autoriserIdentiteNonVerifiee: true}`. |
| D7 | **Quiz lancé** depuis E3 : le cours peut en avoir plusieurs. Une liste « Quiz à lancer » apparaît s'il y en a plus d'un ; elle propose le quiz de la page de quiz sélectionnée (l'`idQuiz` des pages lues par `GET .../pages` est désormais gardé), sinon le premier. Sans quiz : bouton désactivé. Cours archivé : bouton absent (le back refuse). |
| D8 | **Assemblage** dans `app/EcranEditeurCours.tsx` : `EditeurCours` reçoit l'élément 11 par la prop `actionsEntete` ; la feature `cours` n'importe rien de `seance` (règle 1). |
| D9 | **QR code** : le back le décrit en base64 brut et en `data:image/png;base64,…` ; les deux sont acceptés et rendus en `data:image/png`, toute autre valeur est ignorée (aucune adresse reçue ne part telle quelle dans `src`). |
| D10 | **Confidentialité** (règle 6) : E5 n'affiche que des nombres (connectés, réponses par proposition), jamais de pseudonyme ni d'identité. |
| D11 | **Erreurs de commande** sur E5 : `AUCUNE_QUESTION_OUVERTE` et `SEANCE_TERMINEE` (clôture automatique, autre onglet) → simple relecture, sans message ; autre erreur → `error` du back, référence `request_id` pour un 5xx. |
| D12 | **Pas de maquette E5** dans le dépôt (seulement E7, E8-E9) : mise en page d'après `docs/DESIGN.md` (E5, §2.1 écran projeté : 24 px au moins, 28 px pour les réponses, plein écran sans défilement) et la charte (couleurs des réponses A à D avec lettre, boutons à arête basse). |

## 2. Étapes

- [x] B0 Fiche UC7 convertie (`docs/uc/UC7-lancer-quiz-seance.md`) et ce plan.
- [x] B1 Domaine : `seanceAnimee.ts` (types, réducteur, `etapeSuivante`, `barres`), `erreursLancement.ts`.
- [x] B2 API : `animationApi.ts` (routes REST), `lecturesAnimation.ts` (lecture vérifiée des corps et messages),
  `destinationsAnimation.ts` (destinations STOMP, seul endroit).
- [x] B3 Application : `useLancerQuiz` (élément 11, décisions des deux 409), `useSeanceEnDirect` (E5 : REST + STOMP).
- [x] B4 Présentation : `BoutonLancerPresentation`, `EcranQuizEnCours`, `QuestionProjetee`, `ZoneAcces`,
  `DecompteProjete` (réutilise `Decompte`, dont le style passe dans `Decompte.css`), `ecranEnseignant.css`,
  libellés provisoires regroupés dans `libellesAnimation.ts`.
- [x] B5 Assemblage : élément 11 dans E3 (`EcranEditeurCours`, prop `actionsEntete`, `idQuiz` des pages), route
  `/seances/:idSession` (`RouteSeance`, en `lazy`).
- [x] B6 Tests : domaine et lecture (`seanceAnimee.test.ts`, `erreursLancement.test.ts`), élément 11
  (`BoutonLancerPresentation.test.tsx`), E5 (`EcranQuizEnCours.test.tsx`), parcours E3 → E5
  (`EcranEditeurCours.test.tsx`).
- [x] B7 Documentation : `API.md`, `ARCHITECTURE.md`, `DESIGN.md`, `TODO.md`.

## 3. Questions ouvertes

| # | Question | Valeur provisoire |
|---|---|---|
| Q1 | Quel quiz « Lancer la présentation » lance-t-il quand le cours en a plusieurs ? | Liste « Quiz à lancer », quiz de la page sélectionnée proposé (D7). |
| Q2 | Comment E3 sait-il qu'une question est incomplète (bouton désactivé) ? Les questions arrivent avec l'UC4. | Bouton actif ; le `422 QUIZ_INCOMPLET` du back fait foi (prop `quizPret` prête). |
| Q3 | Forme exacte de `qrCode` : base64 brut (exemple du back) ou `data:image/png;base64,…` (texte du back) ? | Les deux acceptés (D9). |
| Q4 | Maquette de E5 ? | Aucune ; mise en page d'après `docs/DESIGN.md` (D12). |
| U1 | Libellés absents de la spec : « Démarrer », « Terminer », « Clore le quiz », « La reprendre », « La terminer et lancer ce quiz », « Autoriser », « Quiz à lancer », textes d'attente, de chargement, de fin, de confirmation. | `seance/presentation/libellesAnimation.ts`. |
| U2 | Message d'une commande de E5 sans réponse du serveur. | Texte du 500 du back : « Une erreur est survenue. Réessayez dans un instant. » |
