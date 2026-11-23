# CLAUDE.md

Consignes pour Claude Code (et tout assistant de code) qui travaille dans ce dépôt.

## Projet

Front-end de **Quizzard**, outil de quiz dynamique de l'IUT de Montreuil (SAÉ 5.01A, BUT 3, 2026-2027).
Un enseignant importe un cours PDF, y intercale des pages de quiz et de classement, puis anime les quiz en direct ;
les étudiants répondent depuis leur téléphone (QR code ou lien), sans compte ou avec leur compte LDAP pour un quiz noté.
Le back-end Spring Boot est dans le dépôt séparé `DUT-Info-Montreuil/SAE_S5_2026_Quizzard_Back`.

Pile front (vérifiée dans `package.json`) : **React 19.3**, **TypeScript 6.0**, **Vite 8.3**
(`@vitejs/plugin-react` 6), **ESLint 10** (`typescript-eslint` 8, `eslint-plugin-react-hooks` 7,
`eslint-plugin-react-refresh` 0.5). Node.js **20.19+ ou 22.13+** (`CONTRIBUTING.md`). Pas encore installés, à
choisir par l'équipe : outil de test (Vitest + RTL retenu). Installés depuis : `react-router` 7, `@stomp/stompjs` 7. PDF.js est retenu par l'étude de faisabilité pour le
rendu du PDF mais n'est pas encore installé.

Pile back (dépôt séparé, versions non vérifiables depuis ce dépôt) : **Spring Boot** lancé par Maven
(`./mvnw spring-boot:run`), WebSocket/STOMP sur `/ws`, PostgreSQL (dépôts `Postgres…Repository` dans les cas
d'utilisation), JPA. Versions exactes de Java, Spring Boot et PostgreSQL : voir le `pom.xml` du back.

Documentation à lire avant de modifier une zone :

- `docs/ARCHITECTURE.md` : organisation du code, routage, état, clients REST et STOMP, PDF.js, sécurité, build.
- `docs/DESIGN.md` : charte graphique, écrans E1 à E11, conventions de code.
- `docs/API.md` : comment le front consomme l'API du back (erreurs, authentification, temps réel).
- `docs/API.md` du **back** : la référence des routes REST et des destinations STOMP.
- `CONTRIBUTING.md` : prérequis, branches, commits, pull requests.
- `TODO.md` : ce qui reste à faire.

## Commandes

```bash
npm ci
```

Installe les dépendances exactes du `package-lock.json`.

```bash
npm run dev
```

Serveur de développement Vite sur `http://localhost:5173` ; le back doit tourner sur `VITE_API_URL`
(`http://localhost:8080` par défaut).

```bash
npm run lint
```

```bash
npm run build
```

Vérification des types puis build de production dans `dist/`. Avec `npm run lint`, c'est la vérification à faire
avant une pull request. Aucun script `test` pour l'instant.

## Architecture en bref

```text
src/
├── app/                main.tsx : point d'entrée et routes ; à venir : fournisseurs de contexte
├── features/<feature>/{api, application, domain, presentation}
└── shared/{config, http, lib, ui}
```

Features (mêmes noms que le back) : `compte`, `cours`, `quiz`, `seance`, `classement`, `resultat`, `administration`.
`src/App.tsx`, `src/App.css` et `src/assets/` (hero, logos React et Vite) viennent du modèle Vite et sont à remplacer.

Règles à respecter :

1. **Couches** : `domain` = types et règles pures, sans React ni appel réseau ; `api` = appels au back et conversion
   des DTO ; `application` = hooks et cas d'usage qui orchestrent `api` et `domain` ; `presentation` = composants et
   écrans. Une feature n'importe jamais le code interne d'une autre : ce qui est commun va dans `shared`,
   l'assemblage des écrans se fait dans `app`.
2. **Un seul client HTTP** (`shared/http`) : `credentials: "include"`, en-tête `X-XSRF-TOKEN` sur `POST`, `PUT`,
   `PATCH`, `DELETE`, en-tête `X-Jeton-Participant` pour les routes `/api/public/**`, lecture du format d'erreur
   `{error, request_id, champs}`.
3. **Routes du back** : ne jamais inventer une route ni une destination STOMP ; reprendre celles du `docs/API.md` du
   back. Une route manquante se demande à l'équipe back.
4. **Commandes en REST, diffusion en STOMP** : le front n'envoie rien par STOMP ; il s'abonne et appelle l'API REST
   pour agir. Après une reconnexion, il resynchronise l'état par REST.
5. **Horloge du serveur** : le décompte se calcule à partir de `echeance` et de l'heure du serveur, jamais de la seule
   horloge de l'appareil.
6. **Confidentialité** : l'identité d'un étudiant n'apparaît jamais sur les écrans projetés (E5, E6) ; pseudonyme
   uniquement. Aucune donnée personnelle dans `console.log`.
7. **Aucune dépendance externe à l'exécution** (CDN, police distante, image distante, API tierce) : hébergement
   interne à l'IUT. Police Rubik, logo de l'IUT, worker et ressources de PDF.js sont embarqués dans le build.
8. **Pas de `dangerouslySetInnerHTML`** pour un contenu saisi par un utilisateur (énoncé, proposition, pseudonyme,
   réponse libre).

## Conventions

- Code métier, commentaires, textes de l'interface et documentation **en français** ; termes techniques imposés en
  anglais (`props`, `hook`, `Provider`).
- Composants et types en `PascalCase`, fonctions et variables en `camelCase`, hooks préfixés par `use`
  (`useSeanceEnDirect`) ; un composant par fichier `.tsx` du même nom.
- JSON échangé avec le back en `camelCase`, mêmes noms que le back (`idCours`, `dureeParDefautSec`).
- Couleurs, tailles et espacements passent par les variables CSS de la charte (`docs/DESIGN.md`), jamais en dur.
- Mettre à jour `docs/` dans la même modification qu'un écran, une route du front ou un usage de l'API.
- Style observé dans le code existant (`src/app/main.tsx`, `vite.config.ts`, `eslint.config.js`) : indentation de
  2 espaces, guillemets simples, pas de point-virgule, virgule finale dans les appels multilignes, imports nommés
  depuis `react`, import des fichiers locaux avec l'extension (`'../App.tsx'`). Aucun Prettier configuré : ESLint
  est la seule vérification de style.
- TypeScript strict sur l'inutilisé (`noUnusedLocals`, `noUnusedParameters`) et `verbatimModuleSyntax` : importer
  les types avec `import type`. `erasableSyntaxOnly` : pas d'`enum` ni de `namespace`, préférer des unions de
  chaînes.

## Workflow

- Les cas d'utilisation (spécifications) sont dans `docs/uc/` (PDF d'origine et conversion Markdown, par exemple
  `docs/uc/UC9-repondre-question.md`). Les plans d'implémentation sont dans `docs/plans/`.
- **Toujours lire le plan correspondant avant de coder**, puis le cas d'utilisation qu'il cite. Cocher (`- [x]`)
  dans le plan chaque étape terminée, dans la même modification que le code.
- **Les messages affichés à l'utilisateur sont exactement ceux de la spec** (colonne « Message affiché » du tableau
  des cas d'erreur, libellés des écrans) : mot pour mot, ponctuation et guillemets compris. Ne pas reformuler.
- **Si une information manque ou se contredit** dans la spec, le plan ou `docs/`, **demander au lieu de deviner** ;
  ne pas inventer de route, de code d'erreur, de message ni de règle de calcul.

## Git et livraison

- **Avant tout commit, push ou pull request : présenter les changements à l'utilisateur et attendre sa validation.**
- Branches `TYPE/description-avec-tirets` (`FEAT/`, `FIX/`, `DOCS/`, `TEST/`, `REFACTOR/`, `CHORE/`), créées depuis
  `develop`, pull request vers `develop`.
- Messages de commit en français, première ligne de 72 caractères au plus.
- Ne jamais commiter `.env` ni `node_modules/` ni `dist/` (déjà dans `.gitignore`).

## Points d'attention actuels

- Le back n'a pour l'instant que son socle (`GET /actuator/health`) ; les autres routes de son `docs/API.md` sont la
  **cible**. En développement il tourne avec `SECURITE_OUVERTE=true` (pas de session ni de CSRF).
- Plusieurs règles sont « à valider » avec le client (charte graphique, mode d'affichage du cours en séance, bornes
  des durées et des pseudonymes, durées de conservation) : ne pas les présenter comme définitives.
- `index.html` a encore `lang="en"` et le titre du modèle Vite.
- **UC9 et STOMP (tranché)** : l'UC9 fait envoyer la réponse par STOMP (`SEND /app/sessions/{idSession}/reponses`),
  mais **la règle 4 prime** : le front envoie la réponse en REST, `POST /api/public/sessions/{codeAcces}/reponses`
  (`docs/API.md`), et lit l'erreur dans la réponse HTTP. Codes d'erreur et messages affichés : ceux du tableau de
  l'UC9.
