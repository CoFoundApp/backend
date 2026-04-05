# Guide frontend complet : assistant "Projet & Idéation"

Ce guide décrit comment intégrer pas-à-pas l'assistant côté frontend : flux GraphQL, gestion de la conversation, abonnements, persistance et rendu des livrables (documents, stats, guidance).

## 1. Prérequis et principes clés
- **Auth obligatoire** : toutes les mutations/queries sont protégées (JWT).
- **Mode step-by-step par défaut** : le backend force `EXPLORATION` si aucun step n'est fourni ; `ALL` reste possible pour tout générer.
- **Blocage par offre** : un compte gratuit ne peut appeler que `EXPLORATION`. Les autres steps renvoient `assistant.stepUnavailable` et `availableSteps` reflète l'ordre autorisé.
- **Conversation guidée** : à chaque appel, l'API renvoie `assistantReply`, `stepQuestions`, `guidance` (nudges, risques, stats de réussite, potentiel marché, idées de nom) et `conversationExample` pour alimenter l'UI.
- **Persistance** : chaque run est sauvegardé (`assistant_project_ideation_runs`) et ré-exploitable via des queries d'historique/détail. Le cache LLM et la sauvegarde partagent les mêmes données.

## 2. Mutation principale (tour de conversation)
Appel standard avec historique de conversation pour conserver le fil et enrichir le step courant.

```graphql
mutation RunIdeation($input: ProjectIdeationAssistantInput!) {
  runProjectIdeationAssistant(input: $input) {
    step
    availableSteps
    assistantReply
    dataUpdate { vision problems keywords sector stats { confidence completeness marketPotential } }
    stepQuestions
    guidance {
      suggestedNextInput
      nudges
      riskAlerts
      projectSuccessStats
      marketPotential
      appNameIdeas
      segmentInsights { segment painsOrNeeds successSignals indicativeSuccessRate confidence }
    }
    conversationTrace { role content }
    exploration { vision problems keywords audience }
    structuration { miniCanvas { problem solution target value differentiation } pitch }
    action { quickActions { title description duration why metric effort } goal30Days { statement metric milestones } }
    documentationDownloads { filename mimeType title }
  }
}
```

Variables d'exemple (tour initial) :

```json
{
  "input": {
    "idea": "Dashboard de gestion d'aéroclub avec plan de vol et réservation IA",
    "context": "Clubs d'aviation de loisir, manque de digitalisation",
    "language": "fr",
    "conversationHistory": [
      { "role": "user", "content": "Dashboard de gestion d'aéroclub avec plan de vol et réservation IA" }
    ]
  }
}
```

Points clés :
- `assistantReply` est prêt à afficher (Markdown toléré).
- `dataUpdate` contient uniquement les champs nouveaux ou modifiés par ce tour (idéal pour pré-remplir des formulaires).
- `stepQuestions` fournit la prochaine question à poser ; `guidance.suggestedNextInput` sert de priorité si une seule question doit être affichée.
- `conversationTrace` réémet l'historique validé par le backend (sécurisé et typé). Réutilisez-le pour l'appel suivant en y ajoutant le dernier message utilisateur + la réponse précédente.

## 3. Enchaîner les steps et gérer les droits
- **Déblocage** : utilisez `availableSteps` pour afficher la progression et masquer les steps verrouillés par l'offre.
- **Changement de pilier** : passez `step` dans l'input (`STRUCTURATION`, `ACTION`, `DOCUMENTATION`, `ALL`).
- **Erreur d'accès** : si l'utilisateur n'a pas l'abonnement requis, la mutation renvoie `assistant.stepUnavailable`. Affichez une modale/CTA d'upgrade et restez sur `EXPLORATION`.

## 4. Conversation linéaire et contexte conservé
- Stockez localement la liste des messages `{ role: "user" | "assistant", content: string }`.
- À chaque envoi, ajoutez le dernier `assistantReply` et le message utilisateur puis transmettez `conversationHistory` dans l'input.
- Le backend retourne `conversationTrace` et `conversationExample` (message d'ouverture + mini-scénario) pour réhydrater l'UI après un refresh ou une reprise.

## 5. Sauvegarde, reprise et historique
- Chaque réponse est upsertée dans `assistant_project_ideation_runs` avec l'`inputEcho`, le `step` et le `payload` complet.
- **Lister l'historique** : query `projectIdeationAssistantHistory` pour afficher les runs récents (date, step, aperçu des questions/guidance).
- **Charger un run** : query `projectIdeationAssistantRun(id)` pour récupérer le `payload`, les `documentationDownloads` et le `conversationTrace` afin de restaurer l'écran.

## 6. Documents téléchargeables et livrables
- Pour le step `DOCUMENTATION` (ou `ALL`), le champ `documentationDownloads` renvoie des fichiers Markdown prêts à sauvegarder : business plan light, canvas, étude de marché, pitch deck 1-page, persona, prochaines étapes, récap global.
- Les autres blocs (`exploration`, `structuration`, `action`, `orientation`, `elearning`) sont disponibles dans la même réponse pour affichage direct.

## 7. Gestion des erreurs et comportements attendus
- **Abonnement insuffisant** : code `assistant.stepUnavailable` (FR/EN). Rester sur le step courant et proposer l'upgrade.
- **Absence d'idée** : `assistant.missingIdea` (demander une phrase simple).
- **Clé Mistral manquante** : `assistant.missingApiKey` (erreur serveur côté ops).
- **Provider down / réponse invalide** : `assistant.requestFailed` ou `assistant.invalidResponse` (afficher un retry avec délai).
- **Timeout transaction** : le backend a été configuré avec un timeout étendu, mais prévoir un message de retry si la mutation dépasse ~90s.

## 8. Recette UI suggérée (pilier Exploration)
1. Afficher `conversationExample.opening`, puis la première `stepQuestion`.
2. L'utilisateur répond → envoyer la mutation avec `conversationHistory` mis à jour et la nouvelle valeur (`idea`, `problem`, etc.).
3. Lire `assistantReply` pour afficher la relance, `dataUpdate` pour pré-remplir les champs, `guidance` pour montrer stats/risques/noms, et `stepQuestions` pour la prochaine question.
4. Répéter jusqu'à complétion du pilier ; proposer le pilier suivant si présent dans `availableSteps`.
5. Sur `DOCUMENTATION`, proposer les liens de téléchargement issus de `documentationDownloads` et afficher l'e-learning recommandé.

## 9. Champs utiles côté interface
- **Guidance** : `projectSuccessStats`, `marketPotential`, `appNameIdeas`, `segmentInsights`, `riskAlerts`, `nudges`, `suggestedNextInput`.
- **Livrables clés** : `miniCanvas`, `persona`, `pitch`, `quickActions`, `goal30Days`, `actionPlan`, `documentationDownloads`, `elearning`, `orientation.recommendedSteps`.
- **Stats de complétude** : `dataUpdate.stats.completeness` pour les indicateurs de progression.
