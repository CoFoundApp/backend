import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),

  PORT: Joi.number().port().default(3000),

  DATABASE_URL: Joi.string().uri().required(),

  REDIS_URL: Joi.string().uri().default('redis://redis:6379'),

  STRIPE_SECRET_KEY: Joi.string().min(10).default('sk_test_dummy'),
  STRIPE_PUBLISHABLE_KEY: Joi.string().min(10).default('pk_test_dummy'),
  STRIPE_WEBHOOK_SECRET: Joi.string().min(10).default('whsec_dummy'),
  STRIPE_PRICE_FREE_MONTHLY: Joi.string().allow('').default(''),
  STRIPE_PRICE_SOLO_MONTHLY: Joi.string().min(1).default('price_solo_monthly'),
  STRIPE_PRICE_SOLO_ANNUAL: Joi.string().min(1).default('price_solo_annual'),
  STRIPE_PRICE_PRO_MONTHLY: Joi.string().min(1).default('price_pro_monthly'),
  STRIPE_PRICE_PRO_ANNUAL: Joi.string().min(1).default('price_pro_annual'),
  STRIPE_BILLING_PORTAL_RETURN_URL: Joi.string().uri().default('https://cofound.example.com/app/settings/billing'),

  BILLING_INVOICE_FOOTER: Joi.string().default(
    'CoFound SAS – 10 rue de la Paix, 75002 Paris – SIREN 123 456 789 – RCS Paris – Capital social 50 000€ – TVA FR12 3456789 – Paiement comptant à réception. Indemnité forfaitaire de 40€ pour frais de recouvrement en cas de retard. TVA non applicable – art. 293 B CGI.'
  ),

  JWT_ACCESS_SECRET: Joi.string().min(16).optional(),
  JWT_ACCESS_TTL: Joi.string().default('900s'),
  JWT_REFRESH_SECRET: Joi.string().min(16).optional(),
  JWT_REFRESH_TTL: Joi.string().default('30d'),
  SECURITY_BCRYPT_ROUNDS: Joi.number().integer().min(1).default(12),
  EMAIL_VERIFICATION_TTL: Joi.number().integer().min(300).default(86400),
  TOTP_ENCRYPTION_KEY: Joi.string().base64({ paddingRequired: false }).default('MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY='),
  TWO_FACTOR_CHALLENGE_TTL: Joi.number().integer().min(60).default(300),

  CORS_ORIGIN: Joi.string().default('*'),
  RATE_LIMIT_TTL: Joi.number().integer().min(1).default(60),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(100),
  BODY_LIMIT: Joi.string().default('1mb'),

  EMBEDDING_DIMS: Joi.number().integer().min(1).default(1024),
  OPENAI_EMBEDDING_MODEL: Joi.string().default('text-embedding-ada-002'),
  MISTRAL_EMBEDDING_MODEL: Joi.string().default('mistral-7b'),
  MISTRAL_API_KEY: Joi.string().allow('').default(''),
  EMBEDDING_PROVIDER: Joi.string().default('mistral'),
  PROJECT_ASSISTANT_MODEL: Joi.string().default('mistral-small-latest'),

  BULLMQ_PREFIX: Joi.string().default('cofound'),
  EMBEDDING_RATE_MAX: Joi.number().integer().min(1).default(100),
  EMBEDDING_RATE_WINDOW: Joi.number().integer().min(1).default(60000),
  EMBEDDING_CONCURRENCY: Joi.number().integer().min(1).default(100),
  EMBEDDING_DEBOUNCE_MS: Joi.number().integer().min(1).default(2000),
  METRICS_QUEUE_POLL_MS: Joi.number().integer().min(1000).default(15000),

  SMTP_HOST: Joi.string().default('smtp.mailtrap.io'),
  SMTP_PORT: Joi.number().integer().min(1).default(587),
  SMTP_FROM: Joi.string().email().default('no-reply@example.com'),

  APP_NAME: Joi.string().default('CoFound'),
  BRAND_NAME: Joi.string().default('CoFound'),
  BRAND_URL: Joi.string().uri().default('https://cofound.example.com'),
  BRAND_LOGO_URL: Joi.string().uri().default('https://cofound.example.com/logo.png'),
  APP_BASE_URL: Joi.string().uri().default('https://cofound.example.com'),
  OAUTH_ALLOWED_REDIRECT_ORIGINS: Joi.string().allow('').default(''),
  UPLOADS_PUBLIC_BASE_URL: Joi.string().uri().default('http://localhost:3000'),

  GRAPHQL_PLAYGROUND_ENABLED: Joi.boolean()
    .truthy('true')
    .truthy('1')
    .falsy('false')
    .falsy('0')
    .default(process.env.NODE_ENV === 'production' ? false : true),

  GOOGLE_CLIENT_ID: Joi.string().allow('').default(''),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').default(''),
  LINKEDIN_CLIENT_ID: Joi.string().allow('').default(''),
  LINKEDIN_CLIENT_SECRET: Joi.string().allow('').default(''),
});
