# CoFound Monorepo

- Gestionnaire: **pnpm**
- Workspaces: `apps/*`, `packages/*`
- API: `apps/api` (NestJS)

## Démarrer

```bash
pnpm install
pnpm dev

## Email & notifications

Un serveur SMTP de développement (MailHog) est fourni dans `docker-compose.yml`. Il écoute sur le port SMTP `1025` et expose une interface web sur [http://localhost:8025](http://localhost:8025).

Les variables d'environnement par défaut pointent vers ce service :

```bash
SMTP_HOST=mail
SMTP_PORT=1025
SMTP_FROM=no-reply@example.com
```

Pour envoyer un email depuis n'importe quel service NestJS, importez `EmailModule` et injectez le provider :

```ts
import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_PROVIDER, EmailProvider } from './infra/email/email.module';

@Injectable()
export class ExampleService {
  constructor(@Inject(EMAIL_PROVIDER) private readonly mail: EmailProvider) {}

  async run() {
    await this.mail.send('user@example.com', 'Sujet', '<b>Contenu</b>');
  }
}
```

Le module de notifications utilise `@nestjs/schedule` pour planifier les envois de digest quotidiens et hebdomadaires via des décorateurs `@Cron` dans `NotificationService`.
