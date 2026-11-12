# Consommation de l'API du back-end

Comment le front React utilise l'API du back Spring Boot : adresse, format des erreurs, authentification et temps
réel. Ce fichier **ne redéfinit pas** le contrat.

> **Référence** : `docs/API.md` du dépôt `DUT-Info-Montreuil/SAE_S5_2026_Quizzard_Back` (branche `develop`). Les
> routes, corps de requête, codes de statut et destinations STOMP sont ceux de ce document. Une route ou un message
> qui manque se demande à l'équipe back, qui met à jour sa documentation ; on ne l'invente pas côté front.
>
> **État actuel du back** : seul le socle existe (`GET /actuator/health`, format d'erreur, sécurité, CORS). Les autres
> routes sont la **cible** de sa documentation. La documentation Swagger/OpenAPI générée depuis le code du back
> (prévue sur `/swagger-ui.html` et `/v3/api-docs`) deviendra la référence détaillée des schémas.

---

## 1. Adresse et généralités

| Élément | Valeur |
|---|---|
| Adresse du back | `VITE_API_URL` (`http://localhost:8080` en développement, voir [ARCHITECTURE.md](ARCHITECTURE.md) §10) |
| Routes métier | `/api/...` (enseignant connecté) |
| Routes étudiants sans compte | `/api/public/...` |
| Temps réel | `/ws` (WebSocket, STOMP) |
| Format | JSON, sauf import de PDF (`multipart/form-data`), PDF, QR code (`image/png`) et CSV (`text/csv`) |
| Nommage JSON | `camelCase` en français (`idCours`, `dureeParDefautSec`) ; seul le format d'erreur garde `error` et `request_id` |
| Dates | ISO 8601, heure du serveur |
| Traçabilité | En-tête `X-Request-Id` sur chaque réponse (exposé par CORS) |

Tous les appels passent par le client commun `src/shared/http` ([ARCHITECTURE.md](ARCHITECTURE.md) §6).

## 2. Format des erreurs

Toutes les erreurs du back, y compris `401` et `403`, ont la même forme :

```json
{
  "error": "Le cours 42 est introuvable.",
  "request_id": "8f0c6e0e-6a51-4c1e-9b0b-2f7f0f2d4c11"
}
```

Une erreur de validation (`422`) ajoute `champs` :

```json
{
  "error": "Certaines valeurs sont invalides.",
  "request_id": "…",
  "champs": { "titre": "Le titre est obligatoire." }
}
```

Le client HTTP convertit toute réponse non 2xx en une erreur qui garde `status`, `error`, `request_id` et `champs`.
Si le corps n'est pas dans ce format (panne réseau, reverse proxy, réponse vide), il produit un message générique.

Comportement du front par statut :

| Statut | Réaction du front |
|---|---|
| `400` | Message `error` ; signale une anomalie du front (requête mal formée) |
| `401` | Enseignant : retour à E1 (puis à l'écran demandé après connexion). Étudiant : jeton absent ou invalide, retour à E7. Échec de connexion : message générique (E1-4, E7-4) |
| `403` | Message `error` ; si le jeton CSRF manque ou a expiré, en redemander un puis rejouer la requête une fois |
| `404` | État « introuvable » de l'écran ; sur E7, code d'accès inconnu |
| `409` | Message `error` sans recharger l'écran : pseudonyme pris (afficher la suggestion), réponse hors délai ou déjà donnée, question verrouillée, PDF déjà importé, séance close |
| `413`, `415` | Import : fichier trop lourd ou qui n'est pas un PDF (ou une image acceptée) |
| `422` | Message de chaque entrée de `champs` sous le champ concerné, `error` en tête du formulaire |
| `500` | Message générique et `request_id` à transmettre à l'équipe |

Les messages `error` sont en français et sans donnée personnelle : ils s'affichent tels quels.

## 3. Authentification de l'enseignant

- **Session HTTP côté serveur** : le back pose un cookie de session `HttpOnly` ; le front ne le lit pas. Toutes les
  requêtes partent avec `credentials: "include"`.
- **Connexion** : `POST /api/auth/connexion` `{identifiant, motDePasse}` → `200` profil + cookie ; `401` message
  générique.
- **Profil** : `GET /api/auth/moi` → `{idEnseignant, nom, prenom, role}` ; `401` si non connecté. Appelé au démarrage
  de l'application et par la garde des écrans enseignant.
- **Déconnexion** : `POST /api/auth/deconnexion` → `204`, puis retour à E1.
- **CSRF** : le front obtient le jeton par `GET /api/auth/csrf` et le renvoie dans l'en-tête `X-XSRF-TOKEN` sur toute
  requête `POST`, `PUT`, `PATCH`, `DELETE`. Le jeton est demandé au démarrage et de nouveau après une connexion ou une
  déconnexion. La forme exacte du corps de la réponse de `/api/auth/csrf` est à préciser dans la documentation du back.
- **Développement** : tant que la connexion n'existe pas, le back tourne avec `SECURITE_OUVERTE=true` (routes ouvertes,
  CSRF coupé) ; le front doit fonctionner dans les deux cas.

## 4. Participation de l'étudiant

- Routes `/api/public/**`, sans compte.
- **Rejoindre** : `POST /api/public/sessions/{codeAcces}/participants` `{pseudonyme}` (quiz non noté) ou
  `POST /api/public/sessions/{codeAcces}/participants/ldap` `{identifiant, motDePasse, pseudonyme?}` (quiz noté) →
  `201` avec le **jeton de participant**.
- Le jeton est renvoyé dans l'en-tête **`X-Jeton-Participant`** sur les routes publiques suivantes, et dans la trame
  STOMP `CONNECT` (§6). Il n'est valable que pour cette séance et devient invalide à sa clôture.
- Le front conserve le jeton par `codeAcces` pour la durée de la séance (emplacement proposé dans
  [ARCHITECTURE.md](ARCHITECTURE.md) §5, à valider) et le supprime à la clôture ou sur un `401`.
- **Reprise** après une coupure ou un rechargement : `POST /api/public/sessions/{codeAcces}/reconnexion` → état courant
  et score.
- **Répondre** : `POST /api/public/sessions/{codeAcces}/reponses` ; le corps dépend du type de question (voir le back).
  Le front n'envoie **aucun horodatage** : le temps de réponse est mesuré par le serveur.

## 5. Routes utilisées par écran

Correspondance entre les écrans et les routes de la documentation du back (§3 de son `API.md`). Les priorités MoSCoW
sont celles du back.

| Écran | Routes du back |
|---|---|
| E1 Connexion | `GET /api/auth/csrf`, `POST /api/auth/connexion`, `GET /api/auth/moi` |
| E2 Mes cours | `GET /api/cours`, `POST /api/cours` (import), `POST /api/cours/{idCours}/versions`, `PATCH /api/cours/{idCours}`, `POST /api/auth/deconnexion` |
| E3 Éditeur | `GET /api/cours/{idCours}`, `GET .../versions/{idVersion}/fichier` (PDF.js), `GET` / `POST .../versions/{idVersion}/pages`, `PATCH` / `DELETE /api/pages/{idPage}`, `POST .../pages/validation` (UC6), `GET` / `POST /api/cours/{idCours}/quiz`, `GET` / `PATCH` / `DELETE /api/quiz/{idQuiz}`, `POST /api/quiz/{idQuiz}/questions`, `PUT` / `DELETE /api/questions/{idQuestion}`, `POST /api/questions/{idQuestion}/motifs/test`, `PUT` / `DELETE /api/questions/{idQuestion}/image`, `POST /api/quiz/{idQuiz}/sessions` (lancer) |
| E4 Classements | `GET` / `POST /api/classements`, `GET` / `PUT` / `DELETE /api/classements/{idClassement}`, `POST .../versions/{idVersion}/pages` (intégrer au cours) |
| E5 Quiz en cours | `GET /api/sessions/{idSession}`, `GET /api/sessions/{idSession}/qrcode`, `POST .../question-suivante`, `POST .../cloture-question`, `POST .../cloture`, `POST .../identites-non-verifiees` |
| E6 Classement | `GET /api/sessions/{idSession}/classement` ; pour une page de classement cumulé : `GET /api/classements/{idClassement}` |
| E7 Rejoindre | `GET /api/public/sessions/{codeAcces}`, `POST .../participants`, `POST .../participants/ldap` |
| E8 Question | `GET /api/public/sessions/{codeAcces}/etat`, `POST .../reponses`, `POST .../reconnexion` |
| E9 Résultat | Message `/user/queue/resultat` ; `GET /api/public/sessions/{codeAcces}/etat` après une reconnexion |
| E10 Résultats | `GET /api/cours/{idCours}/sessions`, `GET /api/sessions/{idSession}/resultats`, `GET /api/sessions/{idSession}/export.csv` |
| E11 Correction | `GET .../questions/{idQuestion}/reponses-libres`, `PUT .../corrections`, `POST .../motifs`, `POST /api/sessions/{idSession}/recalcul` |

Les chemins abrégés par `...` reprennent le préfixe de la ligne (par exemple
`/api/cours/{idCours}/versions/{idVersion}/pages`, `/api/sessions/{idSession}/question-suivante`).

Fichiers :

- **Import d'un PDF** : `FormData` avec le champ `fichier` (et `titre` facultatif) ; ne pas fixer `Content-Type`.
- **PDF** : chargé par PDF.js depuis la route protégée, jamais par un lien direct.
- **QR code** : image `image/png` générée par le back, affichée telle quelle sur E5.
- **Export CSV** : téléchargé par le navigateur (réponse `text/csv` transformée en fichier) ; action journalisée par
  le back.

## 6. Temps réel (WebSocket / STOMP)

- Point d'entrée `/ws`, protocole STOMP. Abonnements : `/topic/...` (diffusion) et `/user/queue/...` (message
  personnel). Préfixe `/app` côté back, **non utilisé** par le front : les commandes passent par REST.
- Authentification : cookie de session pour l'enseignant ; en-tête STOMP `X-Jeton-Participant` dans la trame
  `CONNECT` pour l'étudiant.

Destinations du back et usage par le front :

| Destination | Contenu (back) | Écrans abonnés | Effet côté front |
|---|---|---|---|
| `/topic/sessions/{codeAcces}/etat` | `{etat, position, idQuestion, echeance}` | E5, E8, E9 | Change de page ou d'écran, met à jour l'échéance |
| `/topic/sessions/{codeAcces}/question` | Énoncé, propositions sans réponse attendue, durée, échéance | E5, E8 | Affiche la question, lance le décompte |
| `/topic/sessions/{codeAcces}/connectes` | `{nombre}` | E5 | Compteur de connectés |
| `/topic/sessions/{codeAcces}/repartition` | Nombre de réponses par proposition, total | E5 | Histogramme en direct (au plus un message toutes les 300 ms) |
| `/topic/sessions/{codeAcces}/correction` | Bonnes réponses, répartition finale | E5, E8 | Révèle la bonne réponse ; côté étudiant, passage à E9 |
| `/topic/sessions/{codeAcces}/ecran` | Écran intermédiaire à afficher | E5 | Enchaîne bonne réponse, répartition, classement |
| `/topic/sessions/{codeAcces}/classement` | Classement complet (pseudonymes, scores, évolution) | E5, E6 | Classement projeté et podium animé |
| `/user/queue/resultat` | `{points, scoreTotal, rang, nombreParticipants, evolution}` | E9 | Points, score total, rang de l'étudiant |

D'après la documentation du back, `connectes`, `repartition`, `ecran` et `classement` sont destinés à l'enseignant :
le front étudiant ne s'y abonne pas.

Reconnexion : le broker ne rejoue pas les messages manqués ; après une reconnexion, le front se réabonne puis
resynchronise l'état par REST (`reconnexion` ou `etat` pour l'étudiant, `GET /api/sessions/{idSession}` pour
l'enseignant). Détail : [ARCHITECTURE.md](ARCHITECTURE.md) §7.

## 7. Heure du serveur et décompte

D'après le back, le front calcule le temps restant à partir d'`echeance` et de l'heure du serveur, lue dans l'en-tête
`Date` d'une réponse REST, pour ne pas dépendre de l'horloge du téléphone :

```text
ecart          = heure de l'en-tête Date − Date.now() au moment de la réponse
tempsRestantMs = echeance − (Date.now() + ecart)
```

L'en-tête `Date` a une précision d'une seconde : l'écart est relevé sur plusieurs réponses et le décompte s'affiche à
la seconde. Le serveur reste seul juge : une réponse hors délai reçoit un `409`.

## 8. Points à aligner avec le back

À traiter avec l'équipe back avant d'implémenter les écrans concernés :

| # | Point | Pourquoi |
|---|---|---|
| A1 | Exposer l'en-tête `Date` par CORS (`Access-Control-Expose-Headers`), comme `X-Request-Id`, ou fournir l'heure du serveur autrement | En développement, front et back sont sur deux origines ; `Date` ne fait pas partie des en-têtes lisibles par défaut en CORS, le décompte ne pourrait pas le lire. En production (même origine), la question ne se pose pas. |
| A2 | Préciser le fuseau d'`echeance` (exemple du back : `2026-11-12T14:05:20`, sans décalage) | Sans décalage, le navigateur l'interprète dans le fuseau de l'appareil, alors que `Date` est en temps universel ; une échéance avec décalage (`Z` ou `+01:00`) lève l'ambiguïté. |
| A3 | Forme du corps de `GET /api/auth/csrf` | Le front doit savoir où lire le jeton à renvoyer dans `X-XSRF-TOKEN`. |
| A4 | Format du `lien` renvoyé au lancement d'une séance | Il doit pointer vers la route de E7 du front ([ARCHITECTURE.md](ARCHITECTURE.md) §4). |
| A5 | Accès étudiant au PDF (`.../fichier` avec `X-Jeton-Participant`) | Utile seulement si le mode « cours visible sur les appareils étudiants » est retenu (point ouvert du cahier des charges). |
