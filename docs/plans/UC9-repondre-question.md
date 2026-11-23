# Plan d'implémentation – UC9 « Répondre à une question » (front)

Périmètre : **front React uniquement** (écrans E8 « Question » et E9 « Résultat et classement »). Le back est hors
périmètre. Spécification : [`docs/uc/UC9-repondre-question.md`](../uc/UC9-repondre-question.md). Branche :
`feature/uc9-front`, partie du commit `9d32892` (socle de `develop` + spec UC9).

Hors périmètre : E7 « Rejoindre » (UC8, UC15), ouverture et clôture des questions (UC7), histogramme de E5 (front
enseignant, UC7), correction des réponses libres (UC16).

## 1. État de départ

- Front : seul le modèle Vite existe. Aucun client STOMP, aucune gestion du jeton, aucun routeur, aucun composant
  (`src/features/*` et `src/shared/*` ne contiennent que des `.gitkeep`).
- Back (`SAE_S5_2026_Quizzard_Back`, branche `develop`) : seul le socle existe. UC7 et UC9 ne sont pas codés. Le
  contrat vient de son `docs/API.md` (cible) et de `ReponseErreur.java` (seul format réel).
- Routeur, client STOMP et outil de test : **choisis par l'équipe** (22/11/2026) : React Router, `@stomp/stompjs`,
  Vitest + React Testing Library (D6).

## 2. Décisions prises

| # | Décision |
|---|---|
| D1 | La réponse part en **REST** (`CLAUDE.md`, règle 4) : `POST /api/public/sessions/{codeAcces}/reponses`, erreur lue dans la réponse HTTP. STOMP sert uniquement aux abonnements. |
| D2 | Branche de travail recréée depuis `9d32892`. |
| D3 | L'**écran** (E8 ou E9) se choisit par le statut HTTP, qui suffit (§4). Le **message** se choisit par `code` du corps d'erreur (fourni par le contrat, D16). Repli sans `code` (corps qui ne vient pas du back) : message de l'UC9 pour 401, 422 et 500 ; message `error` du back pour 409 (trois cas possibles). |
| D4 | Code dans la feature `seance` (`docs/ARCHITECTURE.md` §3). |
| D5 | Machine à états (§5) = reducer pur dans `seance/domain`, sans React ni réseau. |
| D6 | Dépendances choisies par l'équipe : `@stomp/stompjs` (client STOMP, B6), `react-router` (routeur, B7) ; en développement `vitest`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom` et `jsdom` (tests, B8 ; `user-event` et `jest-dom` ajoutés le 23/11/2026), avec le script `"test": "vitest run"`. Versions : celles du `package-lock.json` à l'installation. Aucune autre dépendance. |
| D7 | Le front n'affiche pas `pointsProvisoires` et ne calcule pas la justesse avant la clôture. |
| D8 | Relier des points : toucher un élément à gauche puis un élément à droite. Pas de bibliothèque de glisser-déposer. |
| D9 | Décompte = échéance − (heure de l'appareil + écart avec le serveur). « Valider » se désactive à 0 ; le serveur reste seul juge. |
| D10 | L'histogramme de E5 est hors périmètre. |
| D11 | **Parsing de l'échéance** : une seule fonction dans `shared/lib`, `lireInstantServeur(texte) → number \| null` (millisecondes depuis 1970). Aucun `new Date(echeance)` ni `Date.parse(echeance)` ailleurs. Avec `Z` ou `+hh:mm` : instant exact. Sans décalage : `null` (pas de fuseau inventé), donc repli D12. Quand le format sera fixé, seule cette fonction change. |
| D12 | **Repli si l'heure du serveur est inconnue** : si l'en-tête `Date` est illisible (`response.headers.get('Date')` renvoie `null`, en-tête non exposé en CORS) ou si l'échéance vaut `null`, l'échéance devient « heure de l'appareil à la réception de la question + `dureeSec` × 1000 ». En développement seulement, un `console.warn` signale le repli, sans donnée personnelle. Si le back fournit `heureServeur` dans `GET .../etat`, l'écart se calcule dessus, au même endroit. |
| D13 | **QCM** : le front lit `choixMultiple` dans le message de question (champ demandé au back). Absent = **choix unique**. Choix unique : un nouveau choix remplace le précédent. Réponse complète dès 1 choix dans les deux cas. |
| D14 | **Renvoi après coupure** : si l'envoi échoue sans réponse HTTP (réseau), l'état garde `renvoi = true` et le front renvoie le même corps à la reconnexion, s'il reste du temps. Un renvoi qui reçoit `DEJA_REPONDU` mène à CONFIRMEE (« Réponse enregistrée »), pas à une erreur. Sans champ `code`, un 409 reste ambigu : repli sur le message `error` du back en E9. Si `GET .../etat` fournit `dejaRepondu`, la reprise passe directement à CONFIRMEE. |
| D15 | Image de la question : affichée sous l'énoncé, avec un texte alternatif, si le champ `image` existe. Ne bloque pas E8. |
| D16 | **Architecture du dossier v3** (consigne du 22/11/2026). **Envoi en REST** : `POST /api/public/sessions/{codeAcces}/reponses`, jeton dans `X-Jeton-Participant`, corps `{idQuestion, idPropositions \| liens \| texteLibre}` ; `201 {idQuestion, horodatageServeur}`, sans points ni justesse ; erreurs `{error, request_id, champs}` avec le `code` du tableau de l'UC9. **Réception en STOMP** : connexion sur `/ws` avec `X-Jeton-Participant` dans la trame `CONNECT` ; événements `question_demarree`, `question_close`, `session_terminee` et résultat personnel. **Pas de polling.** Le fichier `docs/uc/UC9-repondre-question.md` du dépôt est encore la version précédente (envoi STOMP, `requestId`, `/user/queue/reponses`, `/user/queue/erreurs`) : à remplacer par la v3 quand le PDF sera fourni. Les codes et messages d'erreur ne changent pas. |

## 3. Contrat des messages

Envoi, succès et erreur : fixés (D16). Réception : provisoire (question O1).

| Sens | Canal | Forme | Source |
|---|---|---|---|
| Envoi | `POST /api/public/sessions/{codeAcces}/reponses`, en-tête `X-Jeton-Participant` | `{idQuestion, idPropositions: [id]}` / `{idQuestion, liens: [{gauche, droite}]}` / `{idQuestion, texteLibre}` ; ni horodatage, ni `idParticipant`, ni `requestId` | D16 |
| Succès | Réponse HTTP | `201 {idQuestion, horodatageServeur}`, sans points ni justesse (non lu) | D16 |
| Erreur | Réponse HTTP | `{error, request_id, champs?, code}`, `code` du tableau de l'UC9 | D16 |
| Question | `/topic/sessions/{codeAcces}/question` | `{idQuestion, position, type, enonce, propositions: [{idProposition, libelle}], dureeSec, echeance}` (+ `choixMultiple`, `image` demandés). Formes pour `POINTS_A_RELIER` et `REPONSE_LIBRE` : inconnues. | `docs/API.md` du back §4 |
| État | `/topic/sessions/{codeAcces}/etat` | `{etat, position, idQuestion, echeance}` | `docs/API.md` du back §4 |
| Correction | `/topic/sessions/{codeAcces}/correction` | « Bonnes réponses, répartition finale » : forme inconnue | `docs/API.md` du back §4 |
| Résultat | `/user/queue/resultat` | `{points, scoreTotal, rang, nombreParticipants, evolution}` | `docs/API.md` du back §4 |
| Reprise | `POST .../reconnexion`, `GET .../etat` | « État courant + score » : forme inconnue (+ `dejaRepondu`, `heureServeur` demandés) | `docs/API.md` du back §3.5 |

## 4. Tableau des erreurs

Messages repris mot pour mot de l'UC9.

| Code | HTTP | Message exact | Corrigeable | Écran |
|---|---|---|---|---|
| `JETON_INVALIDE` | 401 | « Ta session a expiré, rejoins le quiz à nouveau. » | Non | E9 (+ suppression du jeton) |
| `QUESTION_CLOSE` | 409 | « Cette session est terminée. » | Non | E9 |
| `HORS_DELAI` | 409 | « Temps écoulé : réponse non prise en compte. » | Non | E9 |
| `DEJA_REPONDU` | 409 | « Tu as déjà répondu. » | Non | E9 ; CONFIRMEE s'il s'agit d'un renvoi (D14) |
| `REPONSE_INVALIDE` | 422 | « Réponse incomplète, vérifie ta saisie. » | Oui, s'il reste du temps | E8 (sinon E9) |
| `ERREUR_SERVEUR` | 500 | « Réponse non enregistrée, réessaie. » | Oui, s'il reste du temps (rien n'est enregistré) | E8 (sinon E9) |
| `REQUETE_INVALIDE` | 400 | Absent de l'UC9 (question B11) | À fixer | À fixer |
| Panne réseau | Aucune | Absent de l'UC9 (question U5) | Renvoi automatique (D14) | E8 + bandeau |

## 5. Machine à états de l'écran

```text
CHARGEMENT ──resynchronisation──▶ ATTENTE (E9) | SAISIE (E8) | CONFIRMEE (dejaRepondu)
ATTENTE ──question reçue──▶ SAISIE
SAISIE ──Valider (réponse complète, t > 0)──▶ ENVOI            (Valider désactivé)
SAISIE ──t = 0──▶ TEMPS_ECOULE (E9)
ENVOI ──201──▶ CONFIRMEE (E9 « Réponse enregistrée »)
ENVOI ──422 ou 500, t > 0──▶ SAISIE + message (E8)
ENVOI ──422 ou 500 avec t = 0, ou 409──▶ REFUSEE (E9 + message)
ENVOI ──401──▶ SESSION_EXPIREE (E9, état final)
ENVOI ──échec réseau, t > 0──▶ ENVOI (renvoi = true, bandeau)
ENVOI ──échec réseau, t = 0──▶ CHARGEMENT (réponse peut-être enregistrée : état relu par REST)
ENVOI (renvoi) ──tout de suite si STOMP est connecté, sinon à la reconnexion──▶ renvoi du même corps
ENVOI (renvoi) ──201 ou DEJA_REPONDU──▶ CONFIRMEE
ENVOI (renvoi) ──échec du renvoi, ou reconnexion avec t = 0──▶ CHARGEMENT (état relu par REST)
CONFIRMEE | TEMPS_ECOULE | REFUSEE | CHARGEMENT ──résultat reçu──▶ RESULTAT (E9)
tout état sauf SESSION_EXPIREE ──nouvelle question──▶ SAISIE (remise à zéro)
etat = CLOTUREE ──▶ SEANCE_CLOSE
Indicateur à part : connexion perdue (bandeau). À la reconnexion, l'écran est gardé (un envoi en cours attend sa
réponse HTTP), puis corrigé par la resynchronisation : autre question en cours ──▶ SAISIE (CONFIRMEE si dejaRepondu) ;
même question ──▶ écran gardé ; aucune question en cours ──▶ SAISIE passe en ATTENTE, les écrans E9 sont gardés.
```

## 6. Étapes (un bloc = une session de travail)

- [x] **B0 Préparation** : branche recréée depuis `9d32892`, `npm ci`, `npm run lint` et `npm run build` passent,
  plan enregistré.
- [x] **B1 Socle partagé** : `shared/config` (`VITE_API_URL`, mode développement) ; `shared/http` (fetch,
  `credentials: 'include'`, `X-Jeton-Participant`, erreur typée `{statut, error, request_id, champs, code?}`, relevé
  de l'écart sur `Date` tolérant à `null`) ; `shared/lib` (`lireInstantServeur`, écart avec le serveur ou `null`,
  temps restant) ; `shared/styles` (variables de la charte, police Rubik embarquée). Le repli D12 n'est pas dans
  `shared` : il dépend de `dureeSec`, propre à l'UC9 (déplacé en B2).
- [x] **B2 Domaine `seance`** : types, `reponseComplete` (avec `choixMultiple`), corps de la requête par type, table
  des erreurs (code ou statut → message, corrigeable, écran), échéance avec repli D12 (réception + `dureeSec`),
  reducer de la machine à états (dont `renvoi` et `DEJA_REPONDU` → CONFIRMEE).
- [x] **B3 API `seance`** : `envoyerReponse` (acceptée avec écart, refusée avec `ErreurHttp`, échec réseau).
  `lireEtat` et `reconnexion` : signatures seules, formes inconnues (question B7).
- [x] **B4 Présentation E8** : décompte (barre et chiffre), énoncé, image facultative, zone QCM (radio ou cases selon
  `choixMultiple`), zone relier, zone réponse libre (1000 caractères au plus), Valider, message d'erreur. Données
  par props. Démo temporaire sans back : `http://localhost:5173/?demo=e8` (dossier `src/app/demo/`, à supprimer).
- [x] **B5 Présentation E9** : réponse enregistrée, temps écoulé, erreur, résultat (points, score total, rang sur le
  nombre de participants, évolution), attente. Aussi : séance close, boutons « Rejoindre » (401) et « Recharger »
  (400), bonne réponse si elle est fournie (champ provisoire `bonneReponse`). Le rang de l'étudiant seul : la liste des
  voisins de la maquette n'est pas affichée (charte §10). Libellés provisoires à valider (U3). Styles communs E8/E9
  dans `ecranEtudiant.css`. Démo temporaire : `http://localhost:5173/?demo=e9`.
### Corrections avant B6

Écarts trouvés à l'audit de B1 à B5 (22/11/2026) par rapport à D16.

- [x] **C1** `seance/domain/corpsReponse.ts` : champs `idPropositions` et `texteLibre` (au lieu de `propositions` et
  `texte`), `CHAMPS_CORPS` retiré, `CorpsReponse` typé par l'union exacte des trois formes.
- [x] **C2** `seance/api/reponsesApi.ts` : commentaire du `201` aligné sur `{idQuestion, horodatageServeur}` (plus de
  `pointsProvisoires`).
- [x] **C3** `shared/http/ErreurHttp.ts` : `code` fait partie du contrat (n'est plus « demandé au back »).
- [x] **C4** `seance/domain/erreursReponse.ts` : commentaire du repli 409 sans `code` aligné sur D3 et D16.
- [x] **C5** `app/demo/DemoE8.tsx` : image SVG de démonstration retirée (couleurs en dur hors de `tokens.css`).

### Suite

- [x] **B6 Temps réel** : installer `@stomp/stompjs`. Client sur `/ws` (URL déduite de `VITE_API_URL`), en-tête
  `X-Jeton-Participant` dans la trame `CONNECT`. Abonnements aux événements de la séance (`question_demarree`,
  `question_close`, `session_terminee`) et au résultat personnel, selon la correspondance de la question O1.
  Reconnexion automatique de la bibliothèque, puis resynchronisation par REST. Bandeau « connexion perdue »,
  renvoi D14. Le front n'envoie rien par STOMP.
  Fait : `shared/tempsReel` (interface `ClientTempsReel`, `creerClientStomp`, `creerClientFactice`) ;
  `seance/api/destinationsSeance.ts` (destinations provisoires, O1), `messagesSeance.ts` (validation et conversion
  en actions, `convertirRefus`, `convertirResynchronisation`), `scenarioFactice.ts`, `lireEtat` (forme provisoire,
  B7) ; action `JETON_REFUSE` du reducer ; hook `useTempsReelSeance` (renvoi D14 délégué à `surRenvoi`, branché en
  B7) ; `BandeauConnexion` (libellé provisoire, U5) ; démo `?demo=temps-reel`. `/correction` : abonné, sans effet
  (forme inconnue, B7). En attendant `dejaRepondu`, une question confirmée sur l'appareil reste confirmée après
  une reconnexion.
- [x] **B7 Assemblage** : installer `react-router`. Hook `useRepondreQuestion`, route `/rejoindre/:codeAcces/question`,
  garde étudiant (jeton par `codeAcces`), suppression de `src/app/demo/`, mise à jour de `docs/ARCHITECTURE.md`,
  `docs/DESIGN.md` et `docs/API.md`.
  Fait : `react-router` 7 ; `seance/application/useRepondreQuestion.ts` (client temps réel et API injectables) ;
  `seance/application/jetonParticipant.ts` (`sessionStorage`, clé provisoire) ; `seance/presentation/PageQuestion.tsx` ;
  `app/RouteQuestion.tsx` (garde) ; `app/RejoindreProvisoire.tsx` (E7 vide, en attendant UC8) ; routes dans
  `app/main.tsx`. Démos E8, E9 et temps réel supprimées, remplacées par une seule démo `/demo/question`, en
  développement seulement (accord du 23/11/2026). Précision de D14 (23/11/2026) : un seul renvoi automatique, tout de
  suite si STOMP est resté connecté, sinon à la reconnexion ; s'il échoue aussi, la reconnexion suivante repasse par
  CHARGEMENT. Conséquences : `surRenvoi` renvoie un booléen (`useTempsReelSeance`) et une réponse HTTP au renvoi
  efface le bandeau (reducer).
- [x] **B8 Tests** : installer `vitest`, `@testing-library/react`, `@testing-library/dom`, `jsdom` ; script `test`.
  Reducer, table des erreurs, `reponseComplete`, `corpsReponse`, `lireInstantServeur`, composants E8 et E9.
  Fait : Vitest (`jsdom`, préparation `src/test/preparation.ts`, données `src/test/fabriques.ts`), fichiers
  `*.test.ts(x)` à côté du code. Couvert : table des erreurs, reducer (chaque transition du §5 et absence de toute
  autre), `reponseComplete`, `corpsReponse`, `envoyerReponse` et `lireEtat` (faux `fetch`), `lireInstantServeur`,
  écart et repli D12, `echeanceQuestion`, messages STOMP, `useTempsReelSeance` (faux client), E8, E9, `PageQuestion`
  (un seul envoi au double clic, temps écoulé, nouvelle question). Non couvert : le `400` (`REQUETE_INVALIDE`,
  message à fixer, question B11) et le renvoi automatique D14 par `useRepondreQuestion`.

### Corrections après la relecture (23/11/2026)

Bloquants trouvés à la relecture de B1 à B8, reproduits par un test avant correction.

- [x] **R1** Deux pannes réseau avec STOMP connecté : l'écran restait en ENVOI (bandeau, « 0:00 ») et ignorait le
  résultat. Désormais, l'échec du renvoi unique (ou une panne à t = 0) mène à CHARGEMENT ; l'état est relu par REST
  tout de suite si STOMP est connecté (`useTempsReelSeance`), et un résultat reçu en CHARGEMENT s'affiche.
- [x] **R2** Reconnexion STOMP pendant le `POST` : l'écran passait en CHARGEMENT et le `201` était perdu (retour sur
  E8, puis « Tu as déjà répondu. »). Désormais, la reconnexion garde l'écran ; un envoi en cours attend sa réponse
  HTTP, un renvoi déjà parti aussi (`RECONNEXION.renvoiEnCours`).
- [x] **R3** Une reconnexion effaçait le résultat affiché sur E9. Désormais, `RESYNCHRONISEE` corrige l'écran sans
  l'effacer (§5) ; le repli « question confirmée sur cet appareil » de B6 devient inutile et est retiré.
- [x] Bandeau : `connexionPerdue` ne suit plus que STOMP ; `connexionInterrompue` (domaine) l'affiche aussi pour une
  réponse en attente de son renvoi. Il ne reste plus affiché après le retour du réseau.
- [x] Tests : transitions du §5 mises à jour, resynchronisation, relecture en CHARGEMENT, et dans `PageQuestion` les
  trois scénarios ci-dessus (dont le renvoi D14 par `useRepondreQuestion` avec STOMP connecté).

## 7. Questions ouvertes

### Pour l'équipe back

| # | Question | Bloque |
|---|---|---|
| O1 | Correspondance entre les événements du dossier v3 et les destinations STOMP de l'`API.md` : `question_demarree` → `/topic/sessions/{codeAcces}/question` ? `question_close` → `/etat` ou `/correction` ? `session_terminee` → `/etat` avec `etat = CLOTUREE` ? résultat personnel → `/user/queue/resultat` ? | B6 |
| ~~B1~~ | ~~Ajouter un champ `code` à `ReponseErreur`~~ : réglé, `code` dans le contrat (D16) | – |
| ~~B2~~ | ~~Retirer `pointsProvisoires` du `201`~~ : réglé, `201 {idQuestion, horodatageServeur}` (D16) | – |
| ~~B3~~ | ~~Aligner les noms de champs~~ : réglé, `idPropositions`, `liens`, `texteLibre` (D16, C1) | – |
| B4 | Fuseau d'`echeance` (`+01:00`, `Z`) ou millisecondes ; même question pour `horodatageServeur`, qui pourrait alors servir à calculer l'écart avec le serveur | D11 (repli en attendant) |
| B5 | Exposer l'en-tête `Date` en CORS, ou renvoyer `heureServeur` dans `GET .../etat` | D12, reprise en milieu de question |
| B6 | Forme des messages pour `POINTS_A_RELIER` et `REPONSE_LIBRE`, plus les champs `image` et `choixMultiple` | B6, B7 |
| B7 | Formes de `/correction`, `POST .../reconnexion` et `GET .../etat` (avec `dejaRepondu`) | B3, B5, B6 |
| B8 | Confirmer que `/api/public/**` est exclu du CSRF | B1 |
| B9 | Dans `liens`, que désignent `gauche` et `droite` (identifiants de quels éléments) ? | B2, B3 |
| B10 | `/user/queue/resultat` : type de `evolution`, et faut-il un champ de justesse ? | B5 |
| B11 | Quel message pour un `400` (`REQUETE_INVALIDE` n'a pas de message dans l'UC9) ? | Tableau des erreurs |
| B12 | Par quelle route l'étudiant charge-t-il l'image d'une question, et avec quel en-tête ? | D15 |

### Pour l'équipe front et l'enseignant

| # | Question | Choix provisoire |
|---|---|---|
| U1 | `ERREUR_SERVEUR` est-il corrigeable ? | Oui, s'il reste du temps |
| U2 | `JETON_INVALIDE` : afficher E9 (UC9) ou revenir à E7 (`docs/API.md` du front) ? | E9 + suppression du jeton |
| U3 | Libellés exacts de E9 (temps écoulé sans réponse, attente) : absents de la spec | Aucun, à fournir |
| U4 | Comment tester sans back et sans E7 ? | À décider |
| U5 | Message d'une panne réseau sans réponse HTTP | Aucun, à fournir |
| ~~U6~~ | ~~Routeur, client STOMP, outil de test~~ | Réglé : React Router, `@stomp/stompjs`, Vitest + RTL (D6) |

## 8. Critères d'acceptation

- [ ] E8 affiche l'énoncé, la zone de réponse du type et un décompte à la seconde calé sur le serveur.
- [ ] « Valider » est désactivé si la réponse est incomplète ou si le temps est à 0.
- [ ] Une seule requête par question, même avec un double clic ; après l'envoi, la réponse n'est plus modifiable.
- [ ] Le corps de la requête a les noms de champs du back, aucun horodatage ; le jeton est dans l'en-tête
  `X-Jeton-Participant`.
- [ ] Chaque erreur affiche le message exact du §4, sur l'écran prévu.
- [ ] Aucun `new Date(` ni `Date.parse(` appliqué à `echeance` hors de `lireInstantServeur` (vérifiable par grep).
- [ ] Sans en-tête `Date` lisible, le décompte part de `dureeSec` et un avertissement s'affiche en développement
  seulement.
- [ ] Un QCM sans `choixMultiple` n'accepte qu'un seul choix.
- [ ] Réponse libre : vide = incomplète, 1000 caractères au plus. Relier : chaque élément n'est relié qu'une fois.
- [ ] Un renvoi après coupure qui reçoit `DEJA_REPONDU` affiche « Réponse enregistrée ».
- [ ] Le résultat montre les points, le score total, le rang sur le nombre de participants et l'évolution de
  l'étudiant seul.
- [ ] Une nouvelle question ramène sur E8, remis à zéro.
- [ ] Après une coupure : bandeau, puis resynchronisation ; une réponse confirmée reste affichée comme confirmée.
- [ ] Ni `dangerouslySetInnerHTML`, ni donnée personnelle dans la console, ni couleur en dur.
- [ ] Aucun polling : la réception passe uniquement par STOMP, la resynchronisation REST n'a lieu qu'après une
  reconnexion.
- [ ] `npm run lint`, `npm run build` et `npm test` passent.
