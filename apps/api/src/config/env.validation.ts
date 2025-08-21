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

  CORS_ORIGIN: Joi.string().default('*'),
  RATE_LIMIT_TTL: Joi.number().integer().min(1).default(60),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(100),
  BODY_LIMIT: Joi.string().default('1mb')
});
