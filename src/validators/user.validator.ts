import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const userSchema = Joi.object({
  id: Joi.number().optional(),
  isAdmin: Joi.boolean().optional(),
  email: Joi.string().email().required(),
  lastName: Joi.string().min(2).required(),
  firstName: Joi.string().min(2).required(),
  password: Joi.string().min(6).required(),
  phoneNumber: Joi.number().optional(),
  username: Joi.string().min(3).required(),
});

export const validateUser = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = userSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }
  next();
};