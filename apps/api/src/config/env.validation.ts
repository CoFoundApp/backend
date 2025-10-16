import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),

  PORT: Joi.number().port().default(3000),

  DATABASE_URL: Joi.string().uri().required(),

  REDIS_URL: Joi.string().uri().default('redis://redis:6379'),

  JWT_ACCESS_SECRET: Joi.string().min(16).optional(),
  JWT_ACCESS_TTL: Joi.string().default('900s'),
  JWT_REFRESH_SECRET: Joi.string().min(16).optional(),
  JWT_REFRESH_TTL: Joi.string().default('30d'),
  SECURITY_BCRYPT_ROUNDS: Joi.number().integer().min(1).default(12),

  CORS_ORIGIN: Joi.string().default('*'),
  RATE_LIMIT_TTL: Joi.number().integer().min(1).default(60),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(100),
  BODY_LIMIT: Joi.string().default('1mb'),

  EMBEDDING_DIMS: Joi.number().integer().min(1).default(1024),
  OPENAI_EMBEDDING_MODEL: Joi.string().default('text-embedding-ada-002'),
  MISTRAL_EMBEDDING_MODEL: Joi.string().default('mistral-7b'),
  EMBEDDING_PROVIDER: Joi.string().default('mistral'),

  BULLMQ_PREFIX: Joi.string().default('cofound'),
  EMBEDDING_RATE_MAX: Joi.number().integer().min(1).default(100),
  EMBEDDING_RATE_WINDOW: Joi.number().integer().min(1).default(60000),
  EMBEDDING_CONCURRENCY: Joi.number().integer().min(1).default(100),
  EMBEDDING_DEBOUNCE_MS: Joi.number().integer().min(1).default(2000),
  METRICS_QUEUE_POLL_MS: Joi.number().integer().min(1000).default(15000),

  SMTP_HOST: Joi.string().default('smtp.mailtrap.io'),
  SMTP_PORT: Joi.number().integer().min(1).default(587),
  SMTP_FROM: Joi.string().email().default('no-reply@example.com'),

  BRAND_NAME: Joi.string().default('CoFound'),
  BRAND_URL: Joi.string().uri().default('https://cofound.example.com'),
  BRAND_LOGO_URL: Joi.string().uri().default('https://cofound.example.com/logo.png'),
  APP_BASE_URL: Joi.string().uri().default('https://cofound.example.com')
});
