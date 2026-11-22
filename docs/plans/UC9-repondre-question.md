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
- Routeur, client STOMP et outil de test : **à choisir par l'équipe**. Les blocs qui en dépendent sont bloqués.

## 2. Décisions prises

| # | Décision |
|---|---|
| D1 | La réponse part en **REST** (`CLAUDE.md`, règle 4) : `POST /api/public/sessions/{codeAcces}/reponses`, erreur lue dans la réponse HTTP. STOMP sert uniquement aux abonnements. |
| D2 | Branche de travail recréée depuis `9d32892`. |
| D3 | L'**écran** (E8 ou E9) se choisit par le statut HTTP, qui suffit (§4). Le **message** se choisit par `code` quand le back le fournit. Sans `code` : message de l'UC9 pour 401, 422 et 500 ; message `error` du back pour 409 (trois cas possibles). |
| D4 | Code dans la feature `seance` (`docs/ARCHITECTURE.md` §3). |
| D5 | Machine à états (§5) = reducer pur dans `seance/domain`, sans React ni réseau. |
| D6 | Aucune nouvelle dépendance tant que l'équipe n'a pas choisi le routeur, le client STOMP et l'outil de test. |
| D7 | Le front n'affiche pas `pointsProvisoires` et ne calcule pas la justesse avant la clôture. |
| D8 | Relier des points : toucher un élément à gauche puis un élément à droite. Pas de bibliothèque de glisser-déposer. |
| D9 | Décompte = échéance − (heure de l'appareil + écart avec le serveur). « Valider » se désactive à 0 ; le serveur reste seul juge. |
| D10 | L'histogramme de E5 est hors périmètre. |
| D11 | **Parsing de l'échéance** : une seule fonction dans `shared/lib`, `lireInstantServeur(texte) → number \| null` (millisecondes depuis 1970). Aucun `new Date(echeance)` ni `Date.parse(echeance)` ailleurs. Avec `Z` ou `+hh:mm` : instant exact. Sans décalage : `null` (pas de fuseau inventé), donc repli D12. Quand le format sera fixé, seule cette fonction change. |
| D12 | **Repli si l'heure du serveur est inconnue** : si l'en-tête `Date` est illisible (`response.headers.get('Date')` renvoie `null`, en-tête non exposé en CORS) ou si l'échéance vaut `null`, l'échéance devient « heure de l'appareil à la réception de la question + `dureeSec` × 1000 ». En développement seulement, un `console.warn` signale le repli, sans donnée personnelle. Si le back fournit `heureServeur` dans `GET .../etat`, l'écart se calcule dessus, au même endroit. |
| D13 | **QCM** : le front lit `choixMultiple` dans le message de question (champ demandé au back). Absent = **choix unique**. Choix unique : un nouveau choix remplace le précédent. Réponse complète dès 1 choix dans les deux cas. |
| D14 | **Renvoi après coupure** : si l'envoi échoue sans réponse HTTP (réseau), l'état garde `renvoi = true` et le front renvoie le même corps à la reconnexion, s'il reste du temps. Un renvoi qui reçoit `DEJA_REPONDU` mène à CONFIRMEE (« Réponse enregistrée »), pas à une erreur. Sans champ `code`, un 409 reste ambigu : repli sur le message `error` du back en E9. Si `GET .../etat` fournit `dejaRepondu`, la reprise passe directement à CONFIRMEE. |
| D15 | Image de la question : affichée sous l'énoncé, avec un texte alternatif, si le champ `image` existe. Ne bloque pas E8. |

## 3. Contrat des messages (provisoire)

| Sens | Canal | Forme | Source |
|---|---|---|---|
| Envoi | `POST /api/public/sessions/{codeAcces}/reponses`, en-tête `X-Jeton-Participant` | `{idQuestion, propositions: [id]}` / `{idQuestion, liens: [{gauche, droite}]}` / `{idQuestion, texte}` ; aucun horodatage. Noms à aligner (question B3). | `docs/API.md` du back §3.5 |
| Succès | Réponse HTTP | `201 {pointsProvisoires}` (ignoré, retrait demandé) | `docs/API.md` du back §3.5 |
| Erreur | Réponse HTTP | `{error, request_id, champs?}` (+ `code` demandé) | `ReponseErreur.java` |
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
ENVOI ──échec réseau──▶ ENVOI (renvoi = true, bandeau)
ENVOI (renvoi) ──reconnexion, t > 0──▶ renvoi du même corps
ENVOI (renvoi) ──201 ou DEJA_REPONDU──▶ CONFIRMEE
ENVOI (renvoi) ──reconnexion, t = 0──▶ CHARGEMENT
CONFIRMEE | TEMPS_ECOULE | REFUSEE ──résultat reçu──▶ RESULTAT (E9)
tout état sauf SESSION_EXPIREE ──nouvelle question──▶ SAISIE (remise à zéro)
etat = CLOTUREE ──▶ SEANCE_CLOSE
Indicateur à part : connexion perdue (bandeau) ; à la reconnexion ──▶ CHARGEMENT
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
- [ ] **B3 API `seance`** : `envoyerReponse`. `lireEtat` et `reconnexion` partiellement bloqués (formes inconnues,
  question B7).
- [ ] **B4 Présentation E8** : décompte (barre et chiffre), énoncé, image facultative, zone QCM (radio ou cases selon
  `choixMultiple`), zone relier, zone réponse libre (1000 caractères au plus), Valider, message d'erreur. Données
  par props.
- [ ] **B5 Présentation E9** : réponse enregistrée, temps écoulé, erreur, résultat (points, score total, rang sur le
  nombre de participants, évolution), attente.
- [ ] **B6 Temps réel** – **bloqué** par le choix du client STOMP : trame `CONNECT` avec `X-Jeton-Participant`,
  abonnements `question`, `etat`, `correction`, `/user/queue/resultat`, reconnexion puis resynchronisation REST,
  bandeau, renvoi D14.
- [ ] **B7 Assemblage** – **bloqué** par le choix du routeur : hook `useRepondreQuestion`, route
  `/rejoindre/:codeAcces/question`, garde étudiant (jeton par `codeAcces`), mise à jour de `docs/ARCHITECTURE.md`,
  `docs/DESIGN.md` et `docs/API.md`.
- [ ] **B8 Tests** – **bloqué** par le choix de l'outil : reducer, table des erreurs, `reponseComplete`,
  `lireInstantServeur`, composants E8 et E9.

## 7. Questions ouvertes

### Pour l'équipe back

| # | Question | Bloque |
|---|---|---|
| B1 | Ajouter un champ `code` à `ReponseErreur`, pour distinguer les 409 et les 422 | Message exact des 409, D14 |
| B2 | Retirer `pointsProvisoires` du `201` : les points ne doivent pas apparaître avant la clôture | Rien (déjà ignoré, D7) |
| B3 | Aligner les noms de champs avec le dossier (`propositions`/`idPropositions`, `texte`/`texteLibre`) | B3 |
| B4 | `echeance` avec fuseau horaire (`+01:00`) ou en millisecondes | D11 (repli en attendant) |
| B5 | Exposer l'en-tête `Date` en CORS, ou renvoyer `heureServeur` dans `GET .../etat` | D12, reprise en milieu de question |
| B6 | Exemples du message de question pour `POINTS_A_RELIER` et `REPONSE_LIBRE`, plus les champs `image` et `choixMultiple` | B2, B4 |
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
| U6 | Routeur, client STOMP, outil de test | À choisir par l'équipe |

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
- [ ] `npm run lint` et `npm run build` passent.
