import Joi from 'joi';

export const userSchema = Joi.object({
  email: Joi.string().email().required(),
  first_name: Joi.string().min(2).required(),
  last_name: Joi.string().min(2).required(),
  password: Joi.string().min(6).required(),
});
