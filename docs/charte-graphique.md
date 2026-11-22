# Charte graphique et exigences front

> Source : cahier des charges du groupe (§ Charte graphique, § Description détaillée des IHM,
> § Exigences de qualité, § Contraintes techniques). Proposition de l'équipe : le client
> n'impose que le logo officiel de l'IUT.
> Maquettes : voir `docs/maquettes/` (Figures 27, 36 et 37 pour les écrans étudiant).

## 1. Couleurs

| Rôle | Couleur | Variable CSS |
|---|---|---|
| Rouge IUT : logo et pages de quiz | `#F5403D` | `--couleur-iut` |
| Bouton d'action principale (texte blanc) | `#DD2E2B` | `--couleur-action` |
| Structure et actions secondaires | `#6C4DF0` | `--couleur-structure` |
| Validations et bonne réponse | `#0E9F8E` | `--couleur-succes` |
| Alertes et classements | `#FFB020` | `--couleur-alerte` |
| Fond (lavande très clair) | `#F4F2FB` | `--couleur-fond` |
| Texte (bleu nuit) | `#231F3A` | `--couleur-texte` |
| Surface des cartes | `#FFFFFF` | `--couleur-carte` |

### Couleurs des réponses A à D

| Réponse | Couleur | Variable CSS |
|---|---|---|
| A | rose `#E8478C` | `--couleur-reponse-a` |
| B | violet `#6C4DF0` | `--couleur-reponse-b` |
| C | vert d'eau `#0E9F8E` | `--couleur-reponse-c` |
| D | orange `#E58A00` | `--couleur-reponse-d` |

**Règle absolue : la couleur ne porte jamais seule le sens.**
- La lettre de la réponse (A, B, C, D) est toujours affichée.
- Les évolutions du classement (vert / rouge) sont toujours doublées d'un symbole (hausse, baisse, égalité).
- Le décompte ne dépend pas que de la couleur : le nombre de secondes est affiché.

## 2. Forme
- Coins arrondis.
- Cartes blanches à fine bordure.
- Boutons à « arête basse » qui s'enfoncent à l'appui (ombre basse qui disparaît en `:active`).

## 3. Police
- **Rubik** (licence SIL OFL), **fournie avec l'application** (fichiers `.woff2` dans le projet).
  Elle n'est jamais chargée depuis un service externe (pas de Google Fonts en ligne).
- Repli : police sans empattement du système.

## 4. Logo
- Logo officiel de l'IUT en en-tête de **toutes les pages publiques** (E7, E8, E9…).

## 5. Smartphone (écrans étudiant E7, E8, E9)
- Touches de réponse d'**au moins 44 px** de haut (environ 62 px dans les maquettes).
- **Une seule action principale par écran.**
- Mobile d'abord : utilisable sur un écran de 360 px de large.

## 6. Écran projeté (E5, E6, hors UC9 étudiant)
- Texte d'au moins 24 px (28 px et plus pour les réponses).

## 7. Accessibilité et sobriété
- Contraste d'au moins 4,5:1 pour le texte courant.
- Animations courtes (moins d'une seconde) et **réduites si l'utilisateur le demande**
  (`prefers-reduced-motion`).
- Pages légères, aucune ressource inutile ; images redimensionnées.
- Page étudiant chargée en moins de 3 secondes en Wi-Fi, image comprise.

## 8. Navigateurs à supporter
- Ordinateur : Chrome, Firefox, Edge, Safari récents.
- Smartphone : iOS (Safari) et Android.
- Aucune application à installer.

## 9. Écrans étudiant : éléments attendus

| N° | Élément | Type et contenu | Règles et comportement |
|---|---|---|---|
| E8-1 | Temps restant | Barre et décompte | Synchronisé sur le serveur ; la validation se désactive à 0 |
| E8-2 | Énoncé | Texte | Lecture seule |
| E8-5 | Image | Image de la question, sous l'énoncé, si elle existe | Réduite à la largeur de l'écran ; affichée en même temps que l'énoncé |
| E8-3 | Zone de réponse | QCM : boutons ; points à relier : deux colonnes ; réponse libre : zone de texte | Dépend du type de question |
| E8-4 | Valider | Bouton | Une seule validation par question, non modifiable ensuite |
| E8-? | Bandeau d'arrivée en cours de route | Visible sur la maquette (Figure 37) | **À préciser** : texte et durée d'affichage, absents du tableau |
| E9-1 | Confirmation | Message | Affiché après la validation ou à l'expiration du temps |
| E9-2 | Score | Points de la question et total | Calculé selon le barème de la question |
| E9-3 | Position | Rang sur le nombre de participants, évolution | Mis à jour en direct |
| E9-4 | Attente | Message | Retour automatique sur E8 à la question suivante |

## 10. Exigences de service qui touchent le front
- **Coupure réseau d'un étudiant** : reconnexion automatique, reprise sur la question en cours,
  réponses déjà confirmées conservées (aucune perte d'une réponse confirmée).
- L'étudiant ne voit que **son propre rang** ; le classement complet n'est projeté qu'en salle.
- Les événements envoyés aux étudiants ne contiennent **jamais** la bonne réponse avant la clôture.

## 11. Variables CSS de référence

```css
/* shared/styles/tokens.css : seul endroit où les couleurs sont écrites en dur */
:root {
  /* Couleurs principales */
  --couleur-iut: #F5403D;
  --couleur-action: #DD2E2B;
  --couleur-action-texte: #FFFFFF;
  --couleur-structure: #6C4DF0;
  --couleur-succes: #0E9F8E;
  --couleur-alerte: #FFB020;
  --couleur-fond: #F4F2FB;
  --couleur-texte: #231F3A;
  --couleur-carte: #FFFFFF;

  /* Réponses A à D */
  --couleur-reponse-a: #E8478C;
  --couleur-reponse-b: #6C4DF0;
  --couleur-reponse-c: #0E9F8E;
  --couleur-reponse-d: #E58A00;

  /* Typographie */
  --police: "Rubik", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;

  /* Formes et tailles */
  --rayon: 12px;
  --bordure: 1px solid rgba(35, 31, 58, 0.12);
  --hauteur-touche-min: 44px;
  --hauteur-touche-reponse: 62px;

  /* Animations */
  --duree-animation: 200ms;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duree-animation: 0ms;
  }
}
```

> Les valeurs `--rayon`, `--bordure` et `--duree-animation` ne figurent pas dans le cahier des
> charges : ce sont des propositions à ajuster d'après les maquettes.
