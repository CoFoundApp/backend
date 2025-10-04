# CI/CD GitHub Actions vers OVH

Ce guide explique comment activer la chaîne CI/CD incluse dans ce dépôt pour tester automatiquement le backend puis le déployer sur un serveur OVH via SSH et Docker Compose.

## 1. Aperçu de la pipeline

La workflow [`CI/CD`](../.github/workflows/ci-cd.yml) exécute deux jobs :

1. **quality-gate** (sur chaque `push` / `pull_request` vers `main` et sur déclenchement manuel)
   - installe Node.js et pnpm
   - installe les dépendances (`pnpm install --frozen-lockfile`)
   - lance le lint `pnpm --filter api lint`
   - lance les tests unitaires `pnpm --filter api test -- --runInBand`
   - construit l'API `pnpm --filter api build`
2. **deploy** (uniquement sur `push` direct vers `main`)
   - se connecte en SSH au serveur OVH
   - synchronise le dépôt (reset sur le commit déployé)
   - exécute `docker compose -f docker-compose.prod.yml up -d --build`
   - nettoie les images Docker obsolètes

Le déploiement est conditionné à la réussite du job `quality-gate`.

## 2. Préparation du serveur OVH

1. **Installer les dépendances système**
   ```bash
   sudo apt update && sudo apt install -y git docker.io docker-compose-plugin
   sudo systemctl enable --now docker
   ```
2. **Créer un utilisateur applicatif** (recommandé)
   ```bash
   sudo adduser --disabled-password --gecos "" cofound
   sudo usermod -aG docker cofound
   ```
3. **Configurer l'accès SSH**
   - Générer une paire dédiée depuis votre poste ou un runner sécurisé :
     ```bash
     ssh-keygen -t ed25519 -f ~/.ssh/ovh_github_actions -C "github-actions@cofound"
     # produit ~/.ssh/ovh_github_actions (privée) et ~/.ssh/ovh_github_actions.pub (publique)
     ```
   - Si seul le fichier privé est disponible, dériver la clé publique via :
     ```bash
     ssh-keygen -y -f ~/.ssh/ovh_github_actions > ~/.ssh/ovh_github_actions.pub
     ```
   - Copier le contenu de `ovh_github_actions.pub` dans `~cofound/.ssh/authorized_keys` sur le serveur OVH.
4. **Cloner le dépôt**
   ```bash
   sudo -iu cofound
   mkdir -p ~/apps
   cd ~/apps
   git clone git@github.com:<votre_org>/<votre_repo>.git cofound-backend
   cd cofound-backend
   pnpm install --frozen-lockfile
   pnpm --filter api build
   cp .env.example .env.production # ajustez les variables
   ```
5. **Préparer l'environnement**
   - Renseigner toutes les variables d'environnement nécessaires dans un fichier (`.env.production` ou similaire) consommé par `docker-compose.prod.yml`.
   - Vérifier que `docker-compose.prod.yml` référence le bon fichier d'environnement.

Le script [`scripts/remote-deploy.sh`](../scripts/remote-deploy.sh) peut être lancé manuellement sur le serveur pour valider la configuration :
```bash
APP_DIR=~/apps/cofound-backend ./scripts/remote-deploy.sh
```

## 3. Secrets GitHub à définir

Rendez-vous dans **Settings → Secrets and variables → Actions** du dépôt et ajoutez :

| Secret | Description |
| ------ | ----------- |
| `OVH_HOST` | Adresse IP ou domaine du serveur OVH |
| `OVH_PORT` | (optionnel) Port SSH si différent de 22 |
| `OVH_USER` | Utilisateur SSH (ex. `cofound`) |
| `OVH_SSH_KEY` | Clé privée au format OpenSSH permettant la connexion (sans passphrase ou gérée via `ssh-agent`) |
| `OVH_APP_PATH` | Chemin absolu du dépôt sur le serveur (ex. `/home/cofound/apps/cofound-backend`) |

> **Astuce** : si vous utilisez une clé SSH protégée par passphrase, convertissez-la en clé dédiée à l'automatisation sans passphrase ou utilisez un `deploy key` GitHub spécifique.

## 4. Déroulé d'un déploiement

1. Pousser sur `main` (ou merger une PR vers `main`).
2. GitHub Actions déclenche `quality-gate`.
3. Si le job réussit, `deploy` se lance :
   - connexion SSH via `appleboy/ssh-action`
   - `git fetch` / `git reset --hard origin/main`
   - `docker compose -f docker-compose.prod.yml pull`
   - `docker compose -f docker-compose.prod.yml up -d --build`
4. Les containers sont redémarrés avec la dernière image.

Vous pouvez forcer un déploiement via l'onglet **Actions → CI/CD → Run workflow**.

## 5. Supervision & rollback

- **Logs applicatifs** : `docker compose -f docker-compose.prod.yml logs -f api`
- **Rollback rapide** : sur le serveur, exécuter `git checkout <commit_previous> && docker compose ... up -d --build`
- **Nettoyage** : le workflow exécute `docker image prune -f`, adaptez si vous devez conserver plus d'images.

## 6. Personnalisation

- Adaptez `NODE_VERSION` si vous ciblez Node 24.
- Ajoutez d'autres jobs (lint front, e2e, etc.) en dupliquant la logique `pnpm --filter`.
- Si vous préférez une étape de packaging (tarball/rsync), remplacez la commande dans `scripts/remote-deploy.sh` et dans la workflow.

## 7. Dépannage

| Problème | Piste |
| -------- | ----- |
| `Host key verification failed` | Ajoutez le serveur OVH dans `known_hosts` ou utilisez `appleboy/ssh-action` avec `host_fingerprint`. |
| `docker compose` introuvable | Vérifiez que le plugin Docker Compose V2 est installé (`docker compose version`). |
| Permissions Docker | Ajoutez l'utilisateur au groupe `docker` et reconnectez-vous. |
| pnpm non trouvé | Installez `corepack enable` côté serveur si vous exécutez des commandes pnpm hors workflow. |

En suivant ces étapes, chaque changement fusionné sur `main` sera automatiquement testé et déployé sur votre serveur OVH.
