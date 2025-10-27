# 🚀 Changelog – CoFound v1.4.0

## 🔍 Matching & Historique
- ✨ **Historique de matching** – suivi et consultation de l'historique des matchs effectués pour profils et projets

## 📚 E-Learning
- ✨ **Module E-Learning** – intégration d'un système de formation et d'apprentissage en ligne

## 🔐 Authentification & Sécurité
- ✨ **Vérification OTP par email** – système d'authentification à deux facteurs par code OTP envoyé par email
- 🔒 **Réinitialisation de mot de passe** – fonctionnalité complète de reset de mot de passe sécurisée

## 🌱 Core
- 🔧 **Application des dernières modifications** – mise à jour technique et corrections diverses pour la stabilité
- 🐞 **Améliorations et corrections** – ajustements techniques et optimisations internes du système

# 🚀 Changelog – CoFound v1.3.0

## 💳 Paiement & Abonnements
- ✨ **Paiement Stripe** – intégration complète du système de paiement avec gestion des abonnements et facturation
- 🧾 **Facturation et gestion des abonnements** – création, mise à jour et consultation des factures et abonnements
- 🔒 **Sécurité et conformité** – mise en place des meilleures pratiques pour la sécurité des données de paiement

# 🚀 Changelog – CoFound v1.2.0

## 🔍 Matching IA v2
- ✨ **Refonte complète du système de matching** – amélioration de l'algorithme de matching avec support multi-dimensionnel et scoring avancé
- 🧮 **Nouveau système de scoring composite** – intégration de la similarité cosine, Jaccard (skills/intérêts), localisation et fraîcheur des profils
- 📊 **Amélioration des embeddings** – optimisation de la génération et du stockage des embeddings pour profils et projets
- 🔎 **Meilleurs résultats de matching** – raisons de matching plus détaillées et pertinentes
- ⚡ **Optimisation des performances** – réduction du temps de réponse pour les requêtes de matching
- 📈 **Monitoring et alerting** - ajout de métriques et d'alertes pour suivre les performances du système de matching

***

## 🌱 Core
- 🔧 **Améliorations diverses du développement** – ajustements techniques et optimisations internes pour la stabilité
- 🐞 **Corrections de bugs** – résolution de bugs mineurs et amélioration de la robustesse du système

# 🚀 Changelog – CoFound v1.1.0

## 💡 Projets
- ✨ **Ajout d’upload et modification sur projet** – permettre l’ajout et la mise à jour de fichiers liés aux projets[1]

***

## 🌱 Core
- 🐞 **Changement d’intercepteur et déploiement** – mise à jour des intercepteurs pour améliorer la gestion des requêtes et du déploiement[1]
- 🐞 **Ajout du session guard pour corriger la déconnexion** – correction du bug de logout via un guard de session[1]
- 🐞 **Modification du mapper et correction d’enum** – refactorisation du mapping des données et correction des enums pour assurer la cohérence du modèle[1]
- 🐞 **Correction de bug sur les projets** – résolution d’un bug critique affectant la gestion des projets[1]

***

## 🧩 Divers
- 🏗️ **Ajout d’un nouveau proxy Docker et du composer prod** – configuration mise à jour pour le déploiement en production avec un proxy Docker et un fichier `docker-compose.prod.yml`[1]
- 🔧 **Développement divers** – ajustements internes et préparations pour les prochaines itérations[1]

# 🚀 Changelog – CoFound v1

## 🌱 Core
- ✨ **Initialisation API GraphQL NestJS + Prisma**
- 🗄️ **Base PostgreSQL** avec support `pgvector` pour la recherche sémantique
- 🔐 **Auth** : signup / login / JWT / guards

---

## 👤 Profils
- 📝 **CRUD Profils** (display name, bio, langues, tags, etc.)
- 📊 **Embeddings profils** (pgvector + OpenAI/Mistral) pour le matching IA

---

## 💡 Projets
- 📝 **CRUD Projets** (titre, résumé, description, industry, tags, stage, status, visibility)
- 🔗 **Embeddings projets** pour recherche et matching
- 🛠️ **Skills & Interests liés aux projets** (tables pivot + importance pour skills)
- 👥 **Positions de projet** (offres de rôle ouvertes, closeable)

---

## 🔍 Matching IA
- 🔎 **Recherche profils ↔ projets** avec cosine similarity
- ⚖️ **Filtres** : langues, disponibilité, remote/pays, tags
- 🗂️ **Raisons de matching** (skills, intérêts, contraintes compatibles, etc.)
- 🧭 **Pagination cursor** (distance + id) pour scroll infini
- ⚡ Préparation au **reranking composite** (cosine + Jaccard skills/intérêts + city + freshness)

---

## 📬 Candidatures
- 🙋 **Postuler à un projet** (avec option position)
- 📑 **Lister les candidatures** pour un projet (filtrage par position, status)
- ✅ **Décider** (accept/reject + ajout auto en membre si accepté)
- ↩️ **Withdraw** par le candidat
- ❌ **Cancel** par l’owner
- ⚖️ **Contraintes** (pas de candidature en double, pas sur ses propres projets, visibilité check)

---

## 👥 Membership
- 👑 **Membres de projet** (owner, maintainer, member)
- ✉️ **Invitations** (invite, accept, decline, expire à 14 jours)
- 🚪 **Quitter un projet** (safe pour owner, empêche de laisser un projet sans owner)
- 🔨 **Remove membre** (owner/maintainer peuvent kick, sauf owner)
- 🔄 **Update rôle** (owner peut promouvoir/dégrader, vérifie last owner)

---

## 🔎 Recherche
- 🔍 **Recherche de projets** hybride :
  - BM25 (Postgres full-text search)
  - Embedding cosine similarity
  - Fusion pondérée (0.6 BM25 + 0.4 cosine)
- 📑 **Raisons** : match texte titre/summary/description, tags, similarité sémantique

---

## 🔔 Notifications
- 🔔 **Notifications site** avec état lu/non-lu, pagination cursor
- 📧 **Emails Handlebars** (immediate, digest quotidien/hebdo, quiet hours)
- ⚙️ **Préférences utilisateur** : activer/désactiver, fréquence email, quiet hours
- 📨 **Émission de notification** centralisée (site + email selon prefs)
- ⏰ **Cron digests** (daily, weekly)

---

## 💬 Conversations
- 💬 **Conversations privées (DM)**
- 📨 **Envoi de messages** + mise à jour `last_message` / compteur
- 👥 **Participants** avec `last_read_at` (tracking lecture)
- 📑 **Pagination messages** avec cursor
- 🔔 **Notifications new_message** (site/email si offline)
- 🌐 **WebSocket subscription `messageAdded`** par conversation

---

## 🧩 Divers
- 🛡️ **Guards/permissions** sur toutes les mutations sensibles
- 🕒 **Gestion timestamps** : `created_at`, `updated_at` (triggers set_updated_at)
- 🌍 Préparation multi-locale pour emails (fallback `en`)
- ⚡ Redis intégré pour **présence utilisateur** (online/offline)
