import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const userSchema = Joi.object({
  isAdmin: Joi.boolean().optional(),
  email: Joi.string().email().required(),
  lastName: Joi.string().min(2).required(),
  firstName: Joi.string().min(2).required(),
  password: Joi.string().min(6).required(),
  phoneNumber: Joi.number().optional(),
  username: Joi.string().min(3).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const validateUser = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = userSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }
  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
  }
  next();
};
