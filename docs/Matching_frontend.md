# Guide frontend du moteur de matching

Ce document synthétise tout ce qu’un développeur front doit connaître pour intégrer les résolveurs GraphQL de matching : routes disponibles, filtres pris en charge, options d’exécution, format de réponse et bonnes pratiques de pagination.

## 1. Prérequis

- **Authentification** : toutes les requêtes sont protégées par `SessionGuard`. Le client doit envoyer un JWT valide via l’en-tête `Authorization: Bearer <token>`.
- **Données de démo** : pour reproduire les exemples, chargez `docs/sql/matching-test-dataset.sql` dans Postgres (`psql "$DATABASE_URL" -f docs/sql/matching-test-dataset.sql`). Vous y trouverez 10 profils et 5 projets enrichis d’embeddings, de compétences et d’intérêts.
- **Enums en majuscules** : GraphQL attend les valeurs littérales (`"BASIC"`, `"BY_TEXT"`, `"ENRICHED"`, etc.), même si côté backend certaines constantes sont en minuscules.

## 2. Résolveurs disponibles

| Résolveur | Description | Détail retourné | Cas d’usage typique |
|-----------|-------------|-----------------|---------------------|
| `suggestProfilesForMe` | Suggestions pour l’utilisateur courant à partir de son embedding | Liste simple de `MatchRecommendation` | Écran « Inspirations » / onboarding |
| `matchProfiles` | Point d’entrée flexible pour trouver des profils | Dépend de `detailLevel` (par défaut `ENRICHED`) | Recherche texte libre ou par projet |
| `getBasicProfileMatches` | Variante forcée en `BASIC` | Scores globaux + chimie | Liste rapide / mobile |
| `getEnrichedProfileMatches` | Variante forcée en `ENRICHED` | Ajoute explications et recommandations | Fiche de revue détaillée |
| `getCompetitiveProfileMatches` | Variante forcée en `COMPETITIVE` | Ajoute `competitive` (rang, percentile) | Bench multi-profils |
| `getBidirectionalProfileMatches` | Variante forcée en `BIDIRECTIONAL` | Ajoute `bidirectional` + `contactPlan` | Préparation d’entretien |
| `matchProjects` + déclinaisons `Basic/Enriched/Competitive/Bidirectional` | Recherche des projets pertinents pour un profil donné | Même logique que pour les profils | Vue « projets pour moi » |

Tous les résolveurs ci-dessus acceptent un unique argument `input` (sauf `suggestProfilesForMe` qui reçoit des scalaires).

## 3. Paramètres communs (`MatchProfilesInput` et `MatchProjectsInput`)

| Champ | Type | Validation | Obligatoire | Notes |
|-------|------|------------|-------------|-------|
| `mode` | `MatchMode!` | Enum (`BY_TEXT`, `BY_PROJECT`, `BY_PROFILE`) | ✔️ | Détermine la source de l’embedding de référence |
| `text` | `String` | Doit être fourni si `mode = BY_TEXT` | conditionnel | Requête texte pour générer un embedding à la volée |
| `projectId` / `profileId` | `UUID` | Regex UUID | conditionnel | Requis pour `BY_PROJECT` (profils) ou `BY_PROFILE` (projets) |
| `k` | `Int` | `Min(1)` – défaut `20` | optionnel | Nombre max de résultats retournés |
| `threshold` | `Float` | aucun (valeur positive recommandée) | optionnel | Distance cosine maximale autorisée |
| `efSearch` | `Int` | `Min(1)` | optionnel | Paramètre HNSW pour augmenter la précision au prix de latence |
| `filters` | `MatchFiltersInput` | validations détaillées ci-dessous | optionnel | Contraintes additionnelles |
| `cursor` | `String` | Base64 interne | optionnel | Pagination (voir § 5) |
| `detailLevel` | `MatchDetailLevel` | Enum (`BASIC`, `ENRICHED`, `COMPETITIVE`, `BIDIRECTIONAL`) | optionnel | Défaut `ENRICHED` sauf routes spécialisées |

> ℹ️ `matchProfiles` et `matchProjects` partagent exactement la même structure d’entrée. Seul le champ contextuel (`projectId` ou `profileId`) change selon le sens du matching.

## 4. Filtres disponibles (`MatchFiltersInput`)

| Filtre | Type | Validation | Effet |
|--------|------|------------|-------|
| `languages` | `[LanguageCode!]` | Enum GraphQL, tableau obligatoire si défini | Le profil doit parler au moins une langue du tableau (`languages && ...`). |
| `minAvailabilityHours` | `Int` | `Min(0)` | Exclut les profils avec `availability_hours` inférieur. |
| `country` | `String` | Chaîne libre | Filtre strict sur `country` (code ISO ou nom, selon la donnée). |
| `remote` | `Boolean` | booléen | `true` ⇒ `remote_preference_percent ≥ 70`; `false` ⇒ `remote_preference_percent ≤ 30`. |
| `tagsAny` | `[String!]` | Tableau de chaînes | Au moins un tag commun (match sur `tags && array`). |

Les filtres sont cumulatifs. S’ils éliminent tous les candidats, la connexion retournée est vide avec `nextCursor = null`.

## 5. Pagination et limites

- `k` définit la taille maximale de la page. En interne, le service présélectionne `max(k×5, 100)` candidats avant de calculer les scores métiers, afin de conserver une bonne diversité.
- `cursor` correspond à la distance et à l’ID du dernier élément sérialisés en Base64 (`<distance>:<uuid>`). Pour charger la page suivante, réutilisez le `cursor` retourné dans `nextCursor`.
- `threshold` agit côté SQL : seuls les candidats dont la distance cosine est ≤ `threshold` sont retenus. Laissez ce champ vide pour laisser l’algorithme choisir automatiquement les meilleurs candidats.
- `efSearch` modifie `SET LOCAL hnsw.ef_search` pendant la requête. Augmenter cette valeur (>200) améliore la précision mais augmente la latence.

## 6. Niveaux de détail (`MatchDetailLevel`)

| Niveau | Champs garantis | Champs additionnels |
|--------|-----------------|---------------------|
| `BASIC` | `profile/project`, `distance`, `score`, `confidence`, `successProbability`, `successConfidence`, `successModelVersion`, `chemistry` | `dimensionScores` (sans notes), `forces`, `gaps`, `recommendations` minimaux |
| `ENRICHED` | Tout le niveau BASIC | Recommandations complètes (impact/effort/priority), `dimensionScores.strengths/gaps` remplis, `chemistry.notes`, `contactPlan` |
| `COMPETITIVE` | Tout le niveau ENRICHED | `competitive` (rang, percentile, avantages uniques) |
| `BIDIRECTIONAL` | Tout le niveau COMPETITIVE | `bidirectional` (insights croisés) + `contactPlan` complet |

Les routes spécialisées (`getEnrichedProfileMatches`, etc.) forcent le niveau correspondant. Sinon, `matchProfiles` / `matchProjects` utilisent `ENRICHED` par défaut.

## 7. Structure de réponse

### Connexion

Chaque résolveur de matching renvoie une connexion :

```graphql
{
  items: [ProfileMatch!]
  nextCursor: String
}
```

`nextCursor` vaut `null` lorsqu’il n’y a plus de résultats.

### `ProfileMatch` / `ProjectMatch`

Champs principaux :

- `distance` : distance cosine dans l’espace d’embeddings (plus petit = plus proche).
- `score` : score composite métiers (0 → 1).
- `confidence` : confiance du score composite.
- `successProbability` / `successConfidence` : estimation issue de `SuccessPredictionService` (heuristique si le modèle ML n’est pas entraîné, `successModelVersion = "heuristic-baseline"`).
- `chemistry` : score relationnel + notes contextuelles.
- `dimensionScores` : liste des dimensions analysées (`key`, `score`, `confidence`, `strengths`, `gaps`).
- `forces` / `gaps` / `recommendations` : storytelling pour le coach.
- `competitive` (niveau `COMPETITIVE+`) : positionnement relatif (rang, percentile, avantages uniques).
- `bidirectional` (niveau `BIDIRECTIONAL`) : messages personnalisés côté profil/projet.
- `contactPlan` : étapes recommandées pour engager la discussion.

## 8. Gestion des erreurs

- **Validation (`BAD_REQUEST`)** : déclenchée par la `ValidationPipe` si un champ non attendu est présent ou si un UUID est invalide. Le tableau `message` détaille chaque violation (« property X should not exist », « projectId must be a UUID », etc.).
- **Absence d’embedding** : si le profil/projet de référence n’a pas d’embedding, le service retourne une connexion vide sans erreur (c’est au front d’afficher un message adapté).
- **Filtres trop restrictifs** : même comportement (connexion vide). Pensez à afficher un CTA pour élargir la recherche.
- **Limitation du modèle de succès** : tant que moins de 40 exemples sont enregistrés, les logs backend indiquent « Not enough samples to train success model » et le front doit accepter `successModelVersion = "heuristic-baseline"`.

## 9. Exemples

- Requêtes GraphQL complètes (opérations + variables) : voir `docs/graphql/matching-playground-examples.md`.
- Pour un scénario mobile rapide : `getBasicProfileMatches` avec `{ "mode": "BY_TEXT", "text": "product designer", "k": 5 }`.
- Pour une revue projet détaillée : `getEnrichedProfileMatches` avec `mode = BY_PROJECT`, `projectId` issu du dataset de démo, filtres `languages`, `remote`.

## 10. Checklist d’intégration frontend

1. Vérifier la présence du token avant chaque appel GraphQL (sinon 401).
2. Implémenter un sélecteur de mode (`BY_TEXT`, `BY_PROJECT`, `BY_PROFILE`) et afficher seulement le champ pertinent (`text`, `projectId`, `profileId`).
3. Mapper les filtres UI → `MatchFiltersInput` en respectant les validations (enum `LanguageCode`, booléens, etc.).
4. Gérer la pagination avec `nextCursor` (ajout à la liste ou infinite scroll).
5. Anticiper le fallback `heuristic-baseline` et les connexions vides pour informer l’utilisateur.
6. Logger les valeurs `score`, `successProbability` et `chemistry.score` pour nourrir vos dashboards produit.

## 11. Comment fonctionne l’apprentissage du modèle de succès ?

Le service `SuccessPredictionService` combine heuristiques et apprentissage supervisé léger pour estimer la probabilité de succès d’un match.

### a. Source des données

- Chaque recommandation enrichie (`ENRICHED+`) génère une entrée dans `match_explanations` qui stocke les `dimension_scores` calculés (technique, culture, équipe, logistique, expérience, sémantique) ainsi que le `chemistry_score`.
- Dès que le match a un retour utilisateur (`match_outcomes`), on associe cette explication à un `status` : `completed` ou `hired` (succès), `rejected` ou `withdrawn` (échec). Les autres statuts (`viewed`, `applied`, `interviewing`) sont ignorés pour l’entraînement.

### b. Seuils et fréquence d’entraînement

- Tant que moins de 40 échantillons exploitables sont présents (`MIN_SAMPLE_SIZE`), le service ne s’entraîne pas et renvoie le fallback `heuristic-baseline`. Un log DEBUG explicite rappelle le volume courant.
- À partir de 40 échantillons, il lance un entraînement toutes les 5 minutes au maximum (`CHECK_INTERVAL_MS`). Chaque itération consomme jusqu’à 5 000 échantillons récents (`MAX_SAMPLES`).
- Après entraînement, le modèle (poids, biais, métriques) est persisté dans `matching_models` et marqué actif ; les anciens modèles du même type sont désactivés.

### c. Caractéristiques apprises

- Pour chaque dimension, on dérive trois features : `score`, `confidence`, `weight`. S’y ajoutent des agrégats (`average_score`, `average_confidence`, `average_weight`, `score_variance`) et le `chemistry_score`.
- L’algorithme est une régression logistique optimisée par descente de gradient (250 itérations maximum, taux d’apprentissage 0,3, régularisation L2 légère).
- L’accuracy mesurée sur l’échantillon d’entraînement devient la `confidence` du modèle.

### d. Inférence côté API

- Si un modèle actif est disponible, les features du match courant sont alignées sur `feature_names` et passent dans la sigmoid pour produire `successProbability` et `successConfidence`.
- En l’absence de modèle, un fallback heuristique combine la moyenne des `dimensionScores` (70 %) et la `chemistry` (30 %), avec une confiance basée sur la moyenne des `dimensionScores.confidence`.
- Dans tous les cas, le champ `successModelVersion` indique la version (`lr-<timestamp>` pour un modèle entraîné, `heuristic-baseline` sinon) afin que le front puisse afficher la provenance.

### e. Implications pour le frontend

- Afficher un badge ou un tooltip lorsque `successModelVersion = "heuristic-baseline"` pour rappeler qu’il s’agit d’une estimation heuristique.
- Prévoir une montée en gamme UI le jour où une version entraînée devient active : les probabilités seront plus dispersées et la confiance > 0,6.
- Les actions utilisateur qui alimentent `match_outcomes` (feedback positif/négatif) accélèrent l’entraînement : pensez à les mettre en avant dans les parcours.

Avec ces éléments, le front dispose d’une vue exhaustive des options offertes par le moteur de matching et peut implémenter des parcours avancés sans devoir inspecter le code backend.
