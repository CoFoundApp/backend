# CoFound Monorepo

Plateforme matching & collaboration pour founders et talents, regroupée dans un monorepo `pnpm`.
L'API NestJS expose un schéma GraphQL complet (auth, profils, projets, matching IA, conversations,
notifications et facturation Stripe) et s'appuie sur Postgres + `pgvector`, Redis, BullMQ et un
pipeline d'emails temps réel.

## Table des matières
- [Fonctionnalités clés](#fonctionnalités-clés)
- [Organisation du dépôt](#organisation-du-dépôt)
- [Prérequis](#prérequis)
- [Configuration de l'environnement](#configuration-de-lenvironnement)
- [Lancer l'environnement de développement](#lancer-lenvironnement-de-développement)
- [Base de données & Prisma](#base-de-données--prisma)
- [Tests](#tests)
- [Monitoring, emails & outils](#monitoring-emails--outils)
- [Déploiement](#déploiement)
- [Documentation additionnelle](#documentation-additionnelle)

## Fonctionnalités clés
- **Auth & sécurité** : JWT access/refresh, 2FA TOTP, OAuth Google/LinkedIn, gestion des sessions et rate limiting.
- **Profils & Projets** : CRUD complet, intérêts & skills auto-générés, embeddings OpenAI/Mistral pour le matching.
- **Matching IA** : moteur vectoriel `pgvector` avec explications détaillées, scoring composite, digests quotidiens/hebdo.
- **Candidatures & membres** : workflow complet (apply, accept/reject, invitations, rôles).
- **Conversations & notifications** : WebSocket + emails Handlebars localisés par utilisateur, digests programmés via `@nestjs/schedule`.
- **Facturation** : intégration Stripe (portail billing, webhooks, plans mensuels/annuels) et synchronisation client.
- **Monitoring** : métriques Prometheus, dashboards Grafana, alerting prêt à brancher.

## Organisation du dépôt
```
.
├── apps/
│   └── api/              # API NestJS + Prisma + GraphQL
├── docs/                 # Guides (CI/CD, matching frontend, ...)
├── monitoring/           # Config Prometheus/Grafana
├── scripts/              # Scripts d'automatisation (déploiement, etc.)
├── docker-compose*.yml   # Orchestrations Docker dev/prod/proxy
└── README.md             # Ce document
```

## Prérequis
- **Node.js 24+** avec `corepack enable` (pnpm 10.15).
- **Docker / Docker Compose v2** pour orchestrer Postgres, Redis, Mailhog, Prometheus, Grafana.
- **OpenSSL** (ou équivalent) si vous générez des clés JWT/TOTP locales.

## Configuration de l'environnement
1. Dupliquez l'exemple et adaptez les valeurs :
   ```bash
   cp .env.example .env
   ```
2. Renseignez au minimum :
   - `DATABASE_URL` : URI Postgres (`postgresql://user:pass@host:5432/db?schema=public`).
   - `REDIS_URL` : `redis://localhost:6379` (ou container docker `redis://redis:6379`).
   - `SMTP_HOST` / `SMTP_PORT` / `SMTP_FROM` : pour l'envoi des emails (Mailhog en dev).
   - `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` si vous testez la facturation.
   - `APP_BASE_URL`, `BRAND_URL`, `BRAND_LOGO_URL` : URLs utilisées dans les emails/notifications.
   - `COOKIE_BASE_DOMAIN` : domaine parent pour les cookies (ex: `.localhost`).
   - `GRAPHQL_PLAYGROUND_ENABLED` : laisser `false` en prod pour éviter d'exposer le schéma.
   - `OPENAI_API_KEY` / `MISTRAL_API_KEY` + `EMBEDDING_PROVIDER` pour choisir le moteur d'embeddings.

> ℹ️ Par compatibilité, définissez **à la fois** `EMBEDDING_DIMS` et `EMBEDDING_DIM` ainsi que la série `EMBEDDING_*`/`EMBEDDINGS_*`
> si vous personnalisez la pipeline d'embeddings : certains services legacy consomment encore l'ancien nommage.

## Lancer l'environnement de développement
### Option A – Tout via Docker Compose
```bash
docker compose up --build
```
- API GraphQL : [http://localhost:3000/graphql](http://localhost:3000/graphql)
- Playground activé uniquement si `GRAPHQL_PLAYGROUND_ENABLED=true`.
- Mailhog (emails dev) : [http://localhost:8025](http://localhost:8025)
- Prometheus : [http://localhost:9090](http://localhost:9090)
- Grafana : [http://localhost:3001](http://localhost:3001) (`admin` / `admin`)

Hot-reload NestJS est activé grâce au montage du volume `./`.

### Option B – API locale + dépendances Docker
1. Lancez uniquement les services d'infrastructure :
   ```bash
   docker compose up db redis mail prometheus grafana -d
   ```
2. Installez les dépendances Node :
   ```bash
   pnpm install
   ```
3. Générez Prisma et appliquez les migrations :
   ```bash
   pnpm --filter @cofound/api prisma:generate
   pnpm --filter @cofound/api prisma:migrate
   ```
4. Démarrez l'API en mode watch :
   ```bash
   pnpm --filter @cofound/api dev
   ```

## Base de données & Prisma
- Les migrations résident dans `apps/api/prisma/migrations` et sont gérées via Prisma Migrate.
- Créez une nouvelle migration :
  ```bash
  pnpm --filter @cofound/api prisma migrate dev --name <nom_migration>
  ```
- Pour synchroniser un schéma existant : `pnpm --filter @cofound/api prisma:pull`.
- Le seed d'admin (utilisateur fondateur) est disponible après build : `pnpm --filter @cofound/api seed:admin`.

## Tests
- **Unitaires** : `pnpm --filter @cofound/api test`
- **Watch** : `pnpm --filter @cofound/api test:watch`
- **End-to-End GraphQL** :
  ```bash
  pnpm --filter @cofound/api prisma:generate
  pnpm --filter @cofound/api test:e2e
  ```
  Le script `test:e2e` déclenche déjà `prisma:generate`, mais générer manuellement garantit que les engines Prisma sont présents (surtout hors CI connectée).

## Monitoring, emails & outils
- **Mailhog** (dev SMTP) écoute sur `1025` et expose l'interface sur `8025`.
- **Prometheus/Grafana** préconfigurés collectent : latence GraphQL, jobs BullMQ, notifications, Stripe webhooks...
- **Cron & BullMQ** : les jobs se basent sur Redis (`REDIS_URL`) et le préfixe `BULLMQ_PREFIX`.
- **Notifications email** : s'appuient sur `TemplateMailerService` et respectent la locale stockée en base (fallback `en`).

## Déploiement
Le workflow GitHub Actions `CI/CD` exécute lint + tests + build puis déploie sur un serveur OVH via Docker Compose.
Consultez [docs/CI-CD_SETUP.md](docs/CI-CD_SETUP.md) pour la configuration détaillée (secrets GitHub, serveur, rollback...).

## Documentation additionnelle
- [docs/Matching_frontend.md](docs/Matching_frontend.md) : guide d'intégration frontend du moteur de matching.
- [docs/CI-CD_SETUP.md](docs/CI-CD_SETUP.md) : pipeline GitHub Actions → OVH.
- `monitoring/` : dashboards Grafana et configuration Prometheus.
- `apps/api/prisma/migrations/*/README.md` : notes par migration.

Pour toute contribution, adoptez le formatage Prettier (`pnpm format`) et respectez les conventions NestJS/Prisma déjà en place.
