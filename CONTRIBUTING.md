# Contribuer au front-end Quizzard

Guide de travail de l'équipe pour le dépôt front-end (SAÉ 5.01A, BUT 3, 2026-2027). Il vaut pour les cinq membres,
quel que soit leur rôle du sprint (Dev Front, Dev Back, Dev/Ops – Dev qualité).

À lire aussi : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DESIGN.md](docs/DESIGN.md) (charte, écrans et
conventions de code), [docs/API.md](docs/API.md), [TODO.md](TODO.md), et la documentation du back-end dans le dépôt
`DUT-Info-Montreuil/SAE_S5_2026_Quizzard_Back`.

---

## 1. Prérequis

| Outil | Version | Remarque |
|---|---|---|
| Node.js | **20.19+ ou 22.13+** | Exigé par Vite 8 et ESLint 10 (`node -v`) |
| npm | Fourni avec Node.js | Le dépôt contient un `package-lock.json` : utiliser npm, pas un autre gestionnaire |
| Back-end Quizzard | Branche `develop` | Nécessaire pour appeler l'API (voir son `CONTRIBUTING.md`) |
| Éditeur | VS Code ou IntelliJ IDEA / WebStorm | Encodage UTF-8, ESLint activé dans l'éditeur |

## 2. Démarrer en local

```bash
git clone git@github.com:DUT-Info-Montreuil/SAE_S5_2026_Quizzard_Front.git
```

```bash
cd SAE_S5_2026_Quizzard_Front
```

```bash
npm ci
```

```bash
cp .env.example .env
```

Le fichier `.env` est facultatif : il sert à changer `VITE_API_URL` (adresse du back, `http://localhost:8080` par
défaut dans `.env.example`). Il n'est jamais commité.

```bash
npm run dev
```

Vite sert l'application sur `http://localhost:5173`, l'origine autorisée par défaut par le CORS du back
(`FRONT_URL`). Démarrer le back à côté (`./mvnw spring-boot:run` dans son dépôt). Tant que la connexion enseignant
n'existe pas côté back, celui-ci se lance avec `SECURITE_OUVERTE=true` dans son `.env` pour que le front puisse
l'appeler ; jamais sur le serveur.

Autres commandes :

| Commande | Effet |
|---|---|
| `npm run build` | Vérification des types (`tsc -b`) puis build de production dans `dist/` |
| `npm run preview` | Sert le contenu de `dist/` pour vérifier le build |
| `npm run lint` | ESLint sur tout le dépôt |

## 3. Tests et vérifications

Aucun outil de test n'est encore installé : le choix (tests unitaires, tests de composants, tests de bout en bout)
est à faire par l'équipe et à reporter ici, dans `package.json` (script `test`) et dans [CLAUDE.md](CLAUDE.md).

En attendant, avant d'ouvrir une pull request :

```bash
npm run lint
```

```bash
npm run build
```

Les deux commandes doivent passer sans erreur. Vérifier aussi à la main le parcours modifié, sur ordinateur et sur
smartphone (ou dans le mode appareil mobile du navigateur) pour les écrans étudiants E7 à E9.

Attendu dès qu'un outil de test sera en place :

- tests unitaires de la logique pure (`domain/`) : décompte synchronisé sur le serveur, validation d'une question,
  traitement des erreurs de l'API ;
- tests de composants pour les écrans et leurs états (chargement, erreur, vide, nominal) ;
- un nom de test, en français, qui décrit le comportement : `le bouton Valider est désactivé à la fin du décompte`.

## 4. Branches

| Branche | Rôle | Qui y pousse |
|---|---|---|
| `main` | Versions livrées et taguées | Fusion de `develop` en fin de sprint uniquement |
| `develop` | Intégration continue de l'équipe | Pull requests relues uniquement |
| `TYPE/description` | Travail en cours | Son auteur |

Nommage des branches de travail : un préfixe en majuscules, puis une description courte **avec des tirets** (Git
refuse les espaces).

| Préfixe | Usage | Exemple |
|---|---|---|
| `FEAT/` | Nouvelle fonctionnalité | `FEAT/ecran-connexion` |
| `FIX/` | Correction d'anomalie | `FIX/decompte-apres-reconnexion` |
| `DOCS/` | Documentation seule | `DOCS/routes-ecrans` |
| `TEST/` | Tests seuls | `TEST/composants-question` |
| `REFACTOR/` | Restructuration sans changement de comportement | `REFACTOR/client-http` |
| `CHORE/` | Outillage, dépendances, CI, Docker | `CHORE/image-docker-front` |

Une branche part de `develop` à jour et ne traite qu'un ticket Jira.

```bash
git switch develop
```

```bash
git pull
```

```bash
git switch -c FEAT/ecran-connexion
```

## 5. Commits

- Messages **en français**, courts et explicites : ce que fait le commit, pas comment.
- Première ligne de 72 caractères au plus ; détails éventuels après une ligne vide.
- Un commit = un changement cohérent qui passe `npm run lint` et `npm run build`.

```text
Écran de connexion : message d'erreur générique

Affiche le même message quel que soit le champ erroné (UC1, E1-4).
Le bouton reste désactivé tant qu'un des deux champs est vide.
```

## 6. Pull requests et relecture

1. Pousser la branche, ouvrir une pull request vers **`develop`**.
2. Titre clair, description : ticket Jira, UC et écran concernés (E1 à E11), ce qui change, comment tester,
   captures d'écran (ordinateur et smartphone si l'écran est étudiant).
3. Au moins **une relecture approuvée** par un autre membre ; le Dev qualité du sprint relit en priorité.
4. `npm run lint` et `npm run build` passent.
5. Fusion par l'auteur après approbation, puis suppression de la branche.

Checklist du relecteur :

- [ ] Le code est rangé dans la bonne feature et la bonne couche (`api`, `application`, `domain`, `presentation`) ;
      aucune feature n'importe le code interne d'une autre.
- [ ] Les appels au back passent par le client HTTP commun (`src/shared/http`) : cookie de session, CSRF, jeton de
      participant et format d'erreur gérés au même endroit.
- [ ] Les routes et messages STOMP utilisés existent dans `docs/API.md` du back ; sinon le changement est annoncé à
      l'équipe back.
- [ ] Le décompte s'appuie sur l'échéance envoyée par le serveur, pas sur l'horloge de l'appareil.
- [ ] Aucune identité d'étudiant n'est affichée sur les écrans projetés (E5, E6) : pseudonyme uniquement.
- [ ] Aucune ressource chargée depuis l'extérieur (CDN, police distante, image distante).
- [ ] L'écran respecte [docs/DESIGN.md](docs/DESIGN.md) : tailles, contraste, sens jamais porté par la couleur seule,
      navigation au clavier, animations réduites si l'utilisateur le demande.
- [ ] Les états chargement, erreur et vide sont traités.
- [ ] La documentation concernée est à jour.

## 7. Définition de « terminé »

Un ticket est terminé quand :

- le code est fusionné dans `develop` après relecture ;
- `npm run lint` et `npm run build` passent, ainsi que les tests automatiques une fois l'outil choisi ;
- l'écran est vérifié contre la maquette et le tableau d'éléments du cahier des charges (§5.2), sur ordinateur et,
  pour les écrans étudiants, sur smartphone ;
- le comportement est vérifié contre le cas d'utilisation du cahier des charges, avec le back de `develop` ;
- la documentation concernée est à jour (architecture, conception, API) ;
- le scénario est ajouté au cahier de recette s'il est visible par l'utilisateur.

## 8. Outils et cérémonies

- **Jira** : backlog et tickets ; un ticket = une branche = une pull request.
- **Refinement, Sprint Planning, Sprint Review** à chaque sprint ; Sprint Review du Sprint 3 en anglais.
- **Rotation des rôles** à chaque sprint : la personne qui reprend une feature doit pouvoir la comprendre avec le
  code, les tests et ces documents.
- **Moodle** : dépôt des livrables.
- En fin de sprint : `develop` est fusionnée dans `main` par pull request, `main` est taguée et
  [TODO.md](TODO.md) est mis à jour.
