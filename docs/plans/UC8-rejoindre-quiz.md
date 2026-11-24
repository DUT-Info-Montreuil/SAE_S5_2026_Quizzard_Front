# Plan d'implémentation – UC8 « Rejoindre un quiz » (front)

Périmètre : **front React uniquement**, écran E7 « Rejoindre » (éléments E7-1, E7-2, E7-3, E7-5) et passage vers E8.
Le back est hors périmètre. Spécification : [`docs/uc/UC8-rejoindre-quiz.md`](../uc/UC8-rejoindre-quiz.md). Branche :
`feature/uc8-front`, créée depuis `feature/uc9-front` (UC9 pas encore fusionné dans `develop`).

Hors périmètre : connexion LDAP pour un quiz noté (E7-4, UC15), lancement de la séance et QR code (UC6), compteur
de connectés de E5 (front enseignant), écrans E8 et E9 (UC9, déjà faits), limite du nombre d'entrées par appareil.

## 1. État de départ

- Front (`feature/uc9-front`, plan [`UC9-repondre-question.md`](UC9-repondre-question.md)) : socle en place et
  réutilisé tel quel.
  - `shared/http` : `requete()`, `ErreurHttp` et `lireCorpsErreur` (`{error, request_id, champs, code}`), sans
    `suggestion`.
  - `shared/config`, `shared/lib`, `shared/styles` (`tokens.css`, Rubik), `shared/ui/LogoIut`.
  - `seance/presentation/ecranEtudiant.css` : mise en page, `.bouton-principal`, `.message-erreur`,
    `.visuellement-cache`.
  - `seance/application/jetonParticipant.ts` : `lireJeton`, `supprimerJeton` (`sessionStorage`, clé
    `quizzard.jeton.<codeAcces>`). Il n'y a pas encore de fonction d'écriture.
  - `app/RouteQuestion.tsx` : garde de `/rejoindre/:codeAcces/question`. Sans jeton, elle renvoie vers
    `/rejoindre/:codeAcces`.
  - `app/RejoindreProvisoire.tsx` : E7 vide, à remplacer.
  - Le bandeau d'arrivée en cours de route est déjà géré par E8 (`arriveeEnCours`).
- Back (`SAE_S5_2026_Quizzard_Back`, `develop`, `af5bc91`) : seul le socle existe, les deux routes ne sont pas codées.
  - `ReponseErreur` n'a que `{error, request_id, champs}` : **ni `code` ni `suggestion`**.
  - Le `@Valid` en échec renvoie `422` avec `error` = « Certaines valeurs sont invalides. » et
    `champs.pseudonyme`. Ce n'est pas le message de l'UC8.
  - Une exception métier renvoie son propre message dans `error`.
  - `DataIntegrityViolationException` donne `409` « Cette opération entre en conflit avec des données existantes. ».
  - Schéma : `code_acces VARCHAR(32)`, `pseudonyme VARCHAR(20)` (longueur comptée en caractères par PostgreSQL),
    `UNIQUE (id_session, pseudonyme)`.
- Maquettes : les fichiers étaient **inversés** (renommés en B0). `docs/maquettes/E7.png` montre maintenant E7
  (pseudonyme à gauche, quiz noté à droite) et `docs/maquettes/E8-E9.png` montre E8 et E9.

## 2. Décisions prises

| # | Décision |
|---|---|
| D1 | Code dans la feature `seance`, comme le dit la spec (« features/seance/api ») et comme l'UC9. Aucun import d'une autre feature. |
| D2 | **Un seul module de stockage du jeton** : `seance/application/jetonParticipant.ts`, complété par `enregistrerJeton(codeAcces, jeton): boolean`. Il garde `sessionStorage` et la clé `quizzard.jeton.<codeAcces>` (choix du 24/11/2026). Le jeton survit au rechargement, mais pas à la fermeture de l'onglet. L'UC9 n'est pas modifié. |
| D3 | **Garde inverse** sur `/rejoindre/:codeAcces` : si un jeton existe pour ce code, redirection (`replace`) vers `/rejoindre/:codeAcces/question` (choix du 24/11/2026). Cela évite qu'un même étudiant entre deux fois. Un jeton périmé est déjà supprimé par l'UC9 (`JETON_INVALIDE`, séance close), donc les deux gardes ne bouclent pas. |
| D4 | **Libellés** : bouton « Entrer dans le quiz » (E7-3, mot pour mot). Titre « Choisis ton pseudo pour rejoindre », repris de la maquette et **provisoire** (choix du 24/11/2026). Le champ a le libellé « Pseudonyme » (nom de E7-2), caché visuellement. Le lien « Quiz noté ? Connexion avec mon compte IUT » de la maquette n'est pas repris (E7-4, UC15). |
| D5 | **Suggestion** (`409` avec `suggestion`) : le message s'affiche, puis un bouton secondaire dont le texte est le pseudonyme proposé. Un clic remplace la saisie par la suggestion ; l'étudiant clique ensuite sur « Entrer dans le quiz » (choix du 24/11/2026). Le bouton ne porte pas de libellé inventé. |
| D6 | **Message par `code`, repli par statut** (comme D3 de l'UC9). Le `code` est demandé au back (§4, question K1). Sans `code`, le statut suffit pour `404`, `422` et `500`. Pour un `409` sans `code` : avec `suggestion`, c'est « pseudonyme pris » ; sans `suggestion`, le cas est ambigu (séance close, quiz noté ou doublon simultané), donc on affiche le message `error` du back et on garde le formulaire. |
| D7 | Pour `422`, le message affiché est **toujours celui de l'UC8**, jamais le `error` du back (« Certaines valeurs sont invalides. » vient du `@Valid`). |
| D8 | **Nettoyage du pseudonyme** (domaine, fonction pure), dans l'ordre de la spec : espaces de début et de fin retirés (`trim()`), suites d'espaces réduites à une seule (`/\s+/gu` → espace), normalisation `normalize('NFC')`. Validation : 2 à 20 caractères comptés en points de code (`[...texte].length`, comme `VARCHAR(20)`), aucun caractère de contrôle (`/\p{Cc}/u`). En échec : « Ton pseudonyme doit faire de 2 à 20 caractères. » et aucune requête. Le serveur fait foi (question K3). |
| D9 | Le front **envoie le pseudonyme nettoyé**. Le `@Size` du back s'applique au texte brut : sans nettoyage, « Alice » entouré de nombreux espaces serait refusé. Le champ n'a pas d'attribut `maxLength` : un collage avec des espaces ne doit pas être tronqué. Attributs : `autocomplete="nickname"`. |
| D10 | `estNotee` dans le `200` : on affiche les titres et « Ce quiz est noté : connecte-toi avec ton compte IUT. », **sans formulaire**. E7-4 n'est pas fait. |
| D11 | GET en erreur : `404` et `409` affichent seulement le message, sans titres ni formulaire. Sur cette route, tout `409` veut dire « séance close » (un seul cas). |
| D12 | **Succès** : `enregistrerJeton`, puis `navigate('/rejoindre/:codeAcces/question', { replace: true })`. Le bouton Retour ne revient pas au formulaire. E8 relit ensuite l'état par REST et se connecte en STOMP (UC9). Seul `jeton` est lu dans le `201` ; `idParticipant` et `pseudonyme` ne sont ni stockés ni affichés. |
| D13 | **Un seul envoi** : « Entrer dans le quiz » est désactivé pendant le `POST`. Le formulaire se soumet aussi avec Entrée (`<form onSubmit>`). |
| D14 | **Confidentialité** : ni le pseudonyme, ni la suggestion, ni le jeton ne vont dans la console, une URL ou un message d'erreur construit par le front. La suggestion est rendue comme texte, sans `dangerouslySetInnerHTML`. |
| D15 | **Mention E7-5** : un seul fichier, `seance/presentation/mentionInformation.ts`, avec une constante `MENTION_INFORMATION`. Texte provisoire, celui de la maquette : « Tes réponses sont conservées pour le cours. Finalité, base légale, durée de conservation et contact : mention d'information. ». Elle est affichée avec le formulaire seulement. |
| D16 | **Machine à états** de E7 : reducer pur dans `seance/domain`, sans React ni réseau, comme l'UC9. L'API est injectable dans le hook (vraie par défaut, fausse pour la démo et les tests). |
| D17 | Démo sans back, en développement seulement : `/demo/rejoindre?cas=…`, construite comme `/demo/question`. Un succès dans la démo mène à `/demo/question`. |

## 3. Contrat des deux routes

Source : spec UC8 (« Services API »), `docs/API.md` du back, `ReponseErreur.java`. Les deux routes passent par
`requete()` de `shared/http`, avec le code d'accès dans le chemin via `encodeURIComponent`. Elles n'envoient pas de
jeton.

| | `GET /api/public/sessions/{codeAcces}` | `POST /api/public/sessions/{codeAcces}/participants` |
|---|---|---|
| Fonction front | `consulterSession(codeAcces, signal?)` | `rejoindreSession(codeAcces, pseudonyme, signal?)` |
| Corps envoyé | Aucun | `{ "pseudonyme": "<nettoyé>" }` |
| Succès | `200 {titreCours: string, titreQuiz: string, estNotee: boolean, etat: 'PREPAREE' \| 'EN_COURS' \| 'CLOTUREE'}` | `201 {idParticipant: number, jeton: string, pseudonyme: string}`, `Cache-Control: no-store` |
| Conversion | Chaque champ est vérifié. Un corps mal formé lève une `Error`. Si `etat` vaut `CLOTUREE` dans un `200`, il est traité comme un `409`. | `jeton` doit être une chaîne non vide, sinon `Error`. |
| Erreurs | `404` code inconnu, `409` séance close | `400` corps illisible, `404`, `409` (close, noté, pseudonyme pris), `422`, `500` |
| Corps d'erreur | `{error, request_id}` | `{error, request_id, champs?, code?, suggestion?}` |
| Résultat | `{ resultat: 'OUVERTE', session }`, `{ resultat: 'REFUSEE', erreur: ErreurHttp }` ou `{ resultat: 'ECHEC_RESEAU' }`, comme `envoyerReponse` | Même forme, avec `{ resultat: 'REJOINT', jeton }` |

À ajouter dans `shared/http` : `suggestion?: string` dans `CorpsErreur`, `readonly suggestion: string | undefined`
dans `ErreurHttp`, et la lecture dans `lireCorpsErreur` (chaîne seulement). Le champ n'est jamais écrit dans
`message`.

CSRF : `requete()` n'envoie pas encore `X-XSRF-TOKEN`. En développement, c'est sans effet (`SECURITE_OUVERTE`). En
production, le `POST` dépend de la question B8 de l'UC9.

## 4. Tableau des erreurs

Les messages sont repris mot pour mot de l'UC8. Les guillemets « » encadrent le message et n'en font pas partie. Les
codes sont **proposés au back**, d'après les noms d'exception (question K1) : ils n'existent pas encore.

### `POST …/participants`

| Cas | HTTP | Code attendu | Message exact | Affichage |
|---|---|---|---|---|
| Pseudonyme invalide, détecté par le navigateur | (aucune requête) | – | « Ton pseudonyme doit faire de 2 à 20 caractères. » | FORMULAIRE, saisie gardée |
| Code d'accès inconnu | 404 | `SESSION_INTROUVABLE` | « Ce quiz n'existe pas : vérifie le lien ou scanne à nouveau le QR code. » | INTROUVABLE (sans formulaire) |
| Séance clôturée | 409 | `SESSION_CLOSE` | « Ce quiz est terminé. » | TERMINE (sans formulaire) |
| Quiz noté, entrée sans compte | 409 | `CONNEXION_IUT_REQUISE` | « Ce quiz est noté : connecte-toi avec ton compte IUT. » | QUIZ_NOTE (sans formulaire) |
| Pseudonyme absent, vide ou trop long | 422 | `PSEUDONYME_INVALIDE` | « Ton pseudonyme doit faire de 2 à 20 caractères. » | FORMULAIRE |
| Pseudonyme déjà pris | 409 | `PSEUDONYME_DEJA_PRIS` + `suggestion` | « Ce pseudonyme est déjà pris. Essaie celui qui t'est proposé. » | FORMULAIRE, avec le bouton de suggestion (D5) |
| Doublon simultané (sans proposition) | 409 | `PSEUDONYME_DEJA_PRIS` sans `suggestion` | « Ce pseudonyme est déjà pris. » | FORMULAIRE |
| Erreur d'écriture en base | 500 | `ERREUR_SERVEUR` | « Une erreur est survenue. Réessayez dans un instant. » | FORMULAIRE, saisie gardée (rien n'est créé) |
| Corps illisible | 400 | `REQUETE_INVALIDE` | Absent de l'UC8 (question K6) | Provisoire : message `error` du back, FORMULAIRE |
| Panne réseau (aucune réponse) | – | – | Absent de l'UC8 (question U1) | Provisoire : message du `500`, FORMULAIRE |

Repli sans `code` (D6) :

- `404`, `422` et `500` : se reconnaissent au statut.
- `409` avec `suggestion` : `PSEUDONYME_DEJA_PRIS`.
- `409` sans `suggestion` : message `error` du back, FORMULAIRE.
- Autre statut (`403`, `429`, `502`…) : traité comme `ERREUR_SERVEUR`, comme dans l'UC9.

### `GET /api/public/sessions/{codeAcces}`

| Cas | HTTP | Message exact | Affichage |
|---|---|---|---|
| Code d'accès inconnu | 404 | « Ce quiz n'existe pas : vérifie le lien ou scanne à nouveau le QR code. » | INTROUVABLE |
| Séance clôturée | 409 | « Ce quiz est terminé. » | TERMINE |
| Quiz noté (`200`, `estNotee`) | 200 | « Ce quiz est noté : connecte-toi avec ton compte IUT. » | QUIZ_NOTE, avec les titres |
| `500`, autre statut, panne réseau, corps mal formé | – | Absent de l'UC8 (question U2) | Provisoire : message du `500` et bouton « Recharger » (libellé de l'UC9) |

## 5. États de l'écran E7

```text
CHARGEMENT ──GET 200, non noté──▶ FORMULAIRE { session, saisie: '', erreur: null, suggestion: null, envoi: false }
CHARGEMENT ──GET 200, estNotee──▶ QUIZ_NOTE { session }                 (titres + message, sans formulaire)
CHARGEMENT ──GET 404──▶ INTROUVABLE                                      (message seul)
CHARGEMENT ──GET 409 (ou etat CLOTUREE)──▶ TERMINE                       (message seul)
CHARGEMENT ──GET autre, réseau, corps mal formé──▶ ECHEC_CHARGEMENT      (message + « Recharger »)
FORMULAIRE ──saisie──▶ FORMULAIRE (saisie mise à jour ; erreur et suggestion gardées)
FORMULAIRE ──Entrer, pseudonyme invalide──▶ FORMULAIRE + erreur 422      (aucune requête)
FORMULAIRE ──Entrer, pseudonyme valide──▶ FORMULAIRE { envoi: true }     (bouton désactivé, erreur et suggestion effacées)
envoi ──201──▶ jeton enregistré puis navigation vers E8 (D12)
envoi ──409 pseudonyme pris──▶ FORMULAIRE + erreur (+ suggestion si fournie)
envoi ──422, 500, 400, autre statut, réseau, 409 ambigu──▶ FORMULAIRE + erreur (§4)
envoi ──404──▶ INTROUVABLE ; ──SESSION_CLOSE──▶ TERMINE ; ──CONNEXION_IUT_REQUISE──▶ QUIZ_NOTE
FORMULAIRE ──clic sur la suggestion──▶ FORMULAIRE { saisie: suggestion, suggestion: null, erreur: null }
Avant tout : jeton présent pour ce code ──▶ redirection vers E8 (D3), sans GET.
```

Il n'y a pas d'état « rejoint » : la navigation quitte E7. Si l'enregistrement du jeton échoue (stockage
indisponible), on revient à FORMULAIRE avec le message du `500` (question U5). Le logo de l'IUT est affiché dans tous
les états ; les titres E7-1 (« titreCours • titreQuiz ») le sont dans FORMULAIRE et QUIZ_NOTE.

## 6. Fichiers prévus

| Couche | Fichier | Contenu |
|---|---|---|
| `shared/http` | `ErreurHttp.ts` (modifié) | `suggestion` |
| `seance/domain` | `pseudonyme.ts` | `nettoyerPseudonyme`, `pseudonymeValide` |
| `seance/domain` | `erreursRejoindre.ts` | Table du §4 (codes, messages, écran), `lireErreurRejoindre`, `lireErreurConsultation` |
| `seance/domain` | `ecranRejoindre.ts` | Types `SessionPublique`, `EcranRejoindre`, actions et reducer du §5 |
| `seance/api` | `rejoindreApi.ts` | `consulterSession`, `rejoindreSession`, conversion des DTO |
| `seance/application` | `jetonParticipant.ts` (modifié) | `enregistrerJeton` |
| `seance/application` | `useRejoindreQuiz.ts` | GET au montage (`AbortController`), envoi, stockage, appel de `onRejoint` ; API injectable |
| `seance/presentation` | `EcranRejoindre.tsx`, `EcranRejoindre.css` | E7 par props (états du §5) |
| `seance/presentation` | `PageRejoindre.tsx` | Relie `useRejoindreQuiz` et `EcranRejoindre` |
| `seance/presentation` | `mentionInformation.ts` | Texte E7-5 (D15) |
| `app` | `RouteRejoindre.tsx` | Garde inverse (D3), puis `PageRejoindre` avec `onRejoint` → `navigate` |
| `app` | `RejoindreProvisoire.tsx` | Supprimé |
| `app/demo` | `DemoRejoindre.tsx` | Démo D17 |

## 7. Étapes (un bloc = une session de travail)

- [x] **B0 Préparation** : vérifier la branche `feature/uc8-front` ; `npm ci` ; `npm run lint`, `npm run build` et
  `npm test` passent avant toute modification ; enregistrer ce plan. Remettre les noms des maquettes à l'endroit
  (`E7.png` ↔ `E8-E9.png`, à confirmer). Le PDF de l'UC9 supprimé et le dossier `.claude/` non suivi restent tels
  quels : décision de l'auteur. Fait le 24/11/2026 : 293 tests, lint et build passent. Maquettes
  renommées (inversion vérifiée, confirmée le 24/11/2026).
- [x] **B1 Domaine** : `pseudonyme.ts` (D8), `erreursRejoindre.ts` (§4 et repli D6), `ecranRejoindre.ts` (types et
  reducer du §5). Rien d'autre que du TypeScript pur. Fait le 24/11/2026, avec les tests du domaine (déjà écrits
  pour B5) ; longueur comptée dans `longueurPseudonyme` seulement (provisoire, K3).
- [x] **B2 API et stockage** : `suggestion` dans `shared/http` ; `rejoindreApi.ts` (§3, conversion vérifiée, résultat
  `REFUSEE` ou `ECHEC_RESEAU` comme `envoyerReponse`) ; `enregistrerJeton` dans `jetonParticipant.ts` (`false` si le
  stockage est indisponible) ; hook `useRejoindreQuiz`. Fait le 24/11/2026, avec les tests de l'api, du stockage et
  du hook ; `sessionStorage` gardé (D2, reconfirmé le 24/11/2026).
- [x] **B3 Présentation E7** : `EcranRejoindre` (logo, titres E7-1, titre provisoire, champ E7-2 avec libellé caché,
  bouton E7-3, message d'erreur, bouton de suggestion, mention E7-5, états sans formulaire, chargement « Chargement… »
  comme E8), styles par les variables de `tokens.css` et les classes de `ecranEtudiant.css`. Le bouton principal
  prend `--couleur-action` (rouge de la maquette E7). `mentionInformation.ts`. Démo `/demo/rejoindre?cas=formulaire|
  note|introuvable|termine|pris|doublon|echec`, en développement seulement. Fait le 24/11/2026 : libellé du champ
  caché (D4, reconfirmé le 24/11/2026), compteur `x/20` (longueur du pseudonyme nettoyé), démo avec un sélecteur
  de cas (plus `chargement`), tests de chaque état.
- [x] **B4 Assemblage** : `PageRejoindre`, `app/RouteRejoindre.tsx` (garde inverse D3, `onRejoint` → navigation
  `replace` vers `/rejoindre/:codeAcces/question`), route dans `app/main.tsx`, suppression de
  `RejoindreProvisoire.tsx`. Mise à jour de la documentation :
  - `docs/ARCHITECTURE.md` §4 (route E7 en place, garde inverse) et §5 ;
  - `docs/DESIGN.md` E7 (libellés provisoires) ;
  - `docs/API.md` (E7, `suggestion`, codes demandés) ;
  - `TODO.md` ;
  - les points d'attention de `CLAUDE.md` si besoin.

  Fait le 24/11/2026 : parcours E7 → E8 testé (`app/RouteRejoindre.test.tsx`, garde inverse, un seul `POST`,
  `replace`, retour à E7 après `JETON_INVALIDE`) ; la démo passe par `PageRejoindre` ; `CLAUDE.md` inchangé (rien
  à ajouter).
- [ ] **B5 Tests** (Vitest + RTL, fichiers `*.test.ts(x)` à côté du code) :
  - `nettoyerPseudonyme` et `pseudonymeValide` : bornes 1, 2, 20 et 21, emoji, `e` + accent combinant, tabulation,
    caractère de contrôle ;
  - table des erreurs : chaque code et chaque repli ;
  - reducer : chaque transition du §5 ;
  - `rejoindreApi` avec un faux `fetch` (corps envoyé, conversions, `suggestion`, panne réseau) ;
  - `lireCorpsErreur` avec `suggestion` ;
  - `jetonParticipant` (aller-retour, une clé par code) ;
  - `EcranRejoindre` : chaque état ;
  - `RouteRejoindre` dans un `MemoryRouter` : pseudonyme invalide sans `fetch`, un seul `POST` au double clic, la
    suggestion remplit le champ, un succès enregistre le jeton et mène à E8, un jeton présent redirige vers E8, un
    quiz noté n'a pas de formulaire, la console ne reçoit ni pseudonyme ni jeton.

## 8. Questions ouvertes

### Pour l'équipe back

| # | Question | Bloque |
|---|---|---|
| K1 | Ajouter `code` à `ReponseErreur` pour l'UC8 : `SESSION_INTROUVABLE`, `SESSION_CLOSE`, `CONNEXION_IUT_REQUISE`, `PSEUDONYME_INVALIDE`, `PSEUDONYME_DEJA_PRIS`, `ERREUR_SERVEUR`, `REQUETE_INVALIDE` (noms proposés) | Repli D6 en attendant |
| K2 | Forme de `suggestion` : une chaîne au premier niveau de `ReponseErreur`, présente seulement pour le `409` « pseudonyme pris » ? | B2 |
| K3 | Comment le back compte-t-il les 2 à 20 caractères ? `@Size` compte en UTF-16, `VARCHAR(20)` en points de code, et `Pseudonyme.de` n'est pas précisé. Quels espaces sont retirés (`trim` ou `strip`, espace insécable, tabulation) ? | D8 (provisoire : points de code, `trim()`, `\s+`) |
| K4 | `@Size` s'applique au texte brut, avant le nettoyage. Le front envoie le texte nettoyé (D9) : est-ce que cela convient ? | D9 |
| K5 | Les messages `error` de `SessionCloseException`, `ConnexionIutRequiseException` et `PseudonymeDejaPrisException` reprennent-ils les messages de l'UC8 ? Le repli sans `code` les affiche tels quels. | D6 |
| K6 | Quel message pour un `400` (corps illisible) ? L'UC8 n'en donne pas. | §4 |
| K7 | `/api/public/**` est-il exclu du CSRF ? (même question que B8 de l'UC9) | `POST` en production |
| K8 | Limite d'entrées par appareil : quel statut et quel message, quand elle sera fixée ? | Plus tard |

### Pour l'équipe front et l'enseignant

| # | Question | Choix provisoire |
|---|---|---|
| U1 | Quel message pour une panne réseau pendant le `POST` ? Le participant a peut-être été créé : un nouvel essai recevra alors « pseudonyme pris » et une suggestion. | Message du `500` |
| U2 | Quels message et action pour un GET en `500`, en panne réseau ou avec un corps mal formé ? | Message du `500` et « Recharger » |
| U3 | Texte définitif de la mention E7-5, à valider par le délégué à la protection des données | Texte de la maquette (D15) |
| U4 | Titre « Choisis ton pseudo pour rejoindre » (absent de la spec) | Gardé, provisoire (D4) |
| U5 | Que faire si le stockage du jeton est indisponible (stockage désactivé) ? | Message du `500` |
| U6 | Faut-il renommer les maquettes inversées (`E7.png` ↔ `E8-E9.png`) ? | Oui, fait en B0 (24/11/2026) |

## 9. Critères d'acceptation

- [ ] `/rejoindre/:codeAcces` affiche le logo, « titreCours • titreQuiz », le champ, « Entrer dans le quiz » et la
  mention E7-5 pour un quiz non noté ouvert.
- [ ] Quiz noté : titres et « Ce quiz est noté : connecte-toi avec ton compte IUT. », sans champ ni bouton.
- [ ] Code inconnu ou séance close au chargement : seulement le message exact du §4, sans formulaire.
- [ ] Un pseudonyme invalide après nettoyage n'envoie aucune requête et affiche « Ton pseudonyme doit faire de 2 à 20
  caractères. ».
- [ ] Le corps du `POST` est `{pseudonyme}` nettoyé (espaces, NFC) ; aucun jeton n'est envoyé.
- [ ] Un seul `POST`, même avec un double clic ou Entrée répétée.
- [ ] Chaque erreur du §4 affiche son message exact, sur l'état prévu, avec ou sans `code`.
- [ ] `409` avec `suggestion` : message, puis bouton portant le pseudonyme proposé ; un clic remplit le champ.
- [ ] Succès : le jeton est enregistré sous `quizzard.jeton.<codeAcces>`, puis navigation `replace` vers
  `/rejoindre/:codeAcces/question`. La garde de l'UC9 laisse passer.
- [ ] Après un rechargement sur E8, le jeton est toujours là ; rouvrir E7 avec un jeton mène à E8.
- [ ] Ni pseudonyme, ni suggestion, ni jeton dans la console, une URL ou un message construit par le front ; pas de
  `dangerouslySetInnerHTML` ; aucune couleur en dur ; texte de la mention dans un seul fichier.
- [ ] Le champ a un nom accessible ; les touches font au moins 44 px ; l'écran tient sur 360 px de large.
- [ ] Démo `/demo/rejoindre` absente du build de production.
- [ ] `npm run lint`, `npm run build` et `npm test` passent.
