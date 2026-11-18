# INCUVA Frontend

Application de la plateforme de données INCUVA, construite avec React 19 et Vite. L’interface est actuellement recentrée sur **Onboarding AI** : tableau de bord, parcours d’intégration, intégrations RH et automatisations en préparation. Elle communique avec l’API Flask du dossier `backend`.

## Démarrage

```bash
npm install
npm run dev
```

Le serveur Vite est utilisé pour le développement. Le proxy Vite et la valeur par défaut de l’API ciblent `http://localhost:5000`.

| Commande | Utilité |
| --- | --- |
| `npm run dev` | Démarrer Vite en développement |
| `npm run build` | Générer le build de production dans `dist/` |
| `npm run preview` | Prévisualiser le build |
| `npm run lint` | Lancer ESLint |

`VITE_API_BASE_URL` permet de définir l’URL de l’API. Sans cette variable, `src/services/api.js` utilise `http://localhost:5000`.

## Structure

```text
frontend/
├── index.html                     Document HTML et ressources de police
├── package.json                   Scripts et dépendances
├── vite.config.js                 Configuration Vite, alias et proxy
├── tailwind.config.js             Configuration Tailwind
├── eslint.config.js               Configuration ESLint
├── public/                        Fichiers servis tels quels
└── src/
    ├── main.jsx                   Point d’entrée React
    ├── App.jsx                    Routes, session, navigation et sidebar
    ├── App.css                    Style général du dashboard
    ├── index.css                  Styles de base
    ├── services/
    │   ├── api.js                 Fonctions d’accès à l’API Flask
    │   └── auth.js                Stockage et lecture des jetons
    ├── pages/
    │   ├── DashboardPage.jsx      Vue d’ensemble de l’onboarding
    │   ├── OnboardingPage.jsx     Création et suivi des parcours
    │   ├── LoginPage.jsx          Connexion
    │   ├── RegisterPage.jsx       Création de compte et organisation
    │   ├── SettingsPages.jsx      Paramètres et gouvernance
    │   ├── OrganizationLayout.jsx Navigation Équipe / Rôles & accès
    │   ├── workspace/             Intégrations et sources connectées
    │   ├── automations/           Brouillons de workflows
    │   └── *.css                  Styles des pages
    ├── Archive_Incuva/            Anciennes pages mises de côté
    └── assets/                    Ressources importées par le code
```

## Routes et fonctionnalités

Toutes les routes applicatives sont protégées par la session, sauf `/login` et `/register`. Après authentification, `/` redirige vers `/dashboard`. Les anciennes routes `/risk`, `/meetings`, `/workspace/models` et `/workspace/logs` redirigent vers les pages conservées ou vers le tableau de bord.

| Route | Page | Fonctionnalités |
| --- | --- | --- |
| `/login` | Connexion | Authentification, affichage des erreurs de l’API et ouverture de la création de compte |
| `/register` | Inscription | Création du compte initial et de son organisation |
| `/dashboard` | Vue d’ensemble | Indicateurs de parcours et tâches, dates en retard, avancement moyen, parcours récents et aperçu d’au plus trois sources connectées, de catégories distinctes |
| `/onboarding` | Parcours d’intégration | Liste des parcours, sélection d’un collaborateur, création d’un plan, ajout de tâches avec échéance et mise à jour des statuts |
| `/workspace/integrations` | Intégrations RH | Catalogue des connecteurs, formulaire sécurisé de saisie, indicateurs d’identifiants enregistrés, état de connexion, erreurs, test réel pour BambooHR/FrappeHR et lancement/suivi de leur synchronisation |
| `/workspace/sources` | Sources connectées | Liste des sources dont la connexion a été vérifiée, date de vérification et état du dernier import, avec accès à la gestion des intégrations |
| `/automations` | Automatisations d’intégration | Liste, recherche, modification et suppression de scénarios préparés |
| `/automations/new` | Création d’un scénario | Choix d’un déclencheur, d’une condition facultative, d’une action et d’une destination |
| `/automations/:workflowId/edit` | Modification d’un scénario | Modification d’un brouillon existant |
| `/automations/runs` | Historique | État de préparation de l’écran ; les exécutions ne sont pas encore lancées ni journalisées |
| `/organization/members` | Équipe | Création et gestion des membres de l’organisation |
| `/organization/permissions` | Rôles & accès | Attribution des rôles et configuration des permissions |
| `/settings/budget` | Budget & consommation | Création et modification de budgets, métriques et portées disponibles |
| `/settings/retention` | Rétention des données | Configuration d’une politique, prévisualisation de purge et informations de traitement |
| `/settings/guardrails` | Garde-fous | Contrôles d’accès, actions permises, approbations humaines, limites et traitement des demandes en attente |
| `/settings/guardrails/documentation` | Guide des garde-fous | Référence des clés prises en charge par le backend et explication de leur effet |
| `/settings/audit` | Journal d’audit | Filtres, pagination et consultation des événements de gouvernance |
| `/settings/security` | Sécurité du compte | Changement du mot de passe, liste des sessions actives et révocation d’une session ; MFA/SSO non disponibles |

L’accès à la gestion de l’organisation et aux paramètres de gouvernance est limité dans l’interface aux rôles `admin` et `owner`. Les utilisateurs sans ces rôles ne voient que les paramètres de sécurité du compte.

## Navigation et affichage

`src/App.jsx` contient les routes React Router et la structure du tableau de bord. La sidebar peut être repliée, son état est conservé dans `localStorage`, et ses menus regroupent Onboarding AI, Automations et Organisation. Les Paramètres restent au bas de la navigation ; l’utilisateur peut aussi se déconnecter depuis la sidebar.

Les styles sont répartis entre `App.css`, `index.css` et les feuilles propres aux pages, dont `OnboardingPage.css`, `WorkspacePages.css`, `AutomationPages.css` et `SettingsPages.css`.

## Accès à l’API et authentification

`src/services/api.js` centralise les appels HTTP et les routes `/v1/...`. Les composants de page utilisent ces fonctions plutôt que d’appeler directement `fetch`.

Le client envoie le jeton d’accès en Bearer, tente de renouveler une session après un `401` avec le jeton de rafraîchissement, émet `incuva:unauthenticated` lorsque la session est rejetée, et expose les API d’authentification, d’onboarding, d’intégrations, de gouvernance, d’audit et de sessions.

`src/services/auth.js` conserve les jetons dans `localStorage`. L’interface efface les jetons lors de la déconnexion ou du changement de mot de passe.

### Intégrations RH

Le catalogue de `IntegrationsPage.jsx` présente plusieurs familles d’outils (SIRH, collaboration, gestion de projet, CRM, finance, notifications). Chaque fiche affiche le protocole et les champs de connexion associés.

La disponibilité d’un formulaire ne signifie pas qu’un connecteur sait synchroniser ses données. Le backend possède actuellement un flux de test et d’import dédié pour BambooHR et FrappeHR. Pour les autres connecteurs, l’enregistrement des identifiants et l’état de connexion dépendent de ce que le backend implémente effectivement. La page indique séparément les identifiants enregistrés, les connexions vérifiées et les erreurs d’import.

### Automatisations

Les pages d’automatisation sont un éditeur de scénarios en mode préparation. Les déclencheurs, conditions et actions proposées sont des données frontend ; les brouillons sont conservés dans le navigateur sous une clé distincte par organisation. Aucun scénario n’est exécuté automatiquement et la page d’historique ne représente pas un journal d’exécutions backend.

## Pages archivées et pages non montées

`src/Archive_Incuva/` contient les anciennes pages de risques, réunions, logs et modèles IA. Les routes `/risk` et `/meetings` redirigent vers `/dashboard` ; ces pages archivées ne sont pas les vues actives de l’application.

`WorkspaceShared.jsx` contient aussi des fonctions utilitaires historiques pour agréger des activités et produire des cellules CSV. Leur présence ne signifie pas que toutes les vues historiques associées sont accessibles depuis les routes actives.

## Dépendances principales

- **React 19** et **Vite 7** pour l’application et le serveur de développement.
- **React Router** pour le routage côté client.
- **Lucide React**, **Recharts**, **MUI**, **Framer Motion** et **React Icons** pour l’interface, les graphiques et les interactions.
- **date-fns** pour la manipulation des dates.
- **Agora**, **Firebase**, `react-webcam`, `html2canvas`, `jspdf` et `pdf-lib` sont également déclarés dans les dépendances ; leur présence dans `package.json` ne garantit pas qu’ils sont utilisés dans les pages actuellement montées.

