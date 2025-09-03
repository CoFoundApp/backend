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
