import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const skillSchema = Joi.object({
  name: Joi.string().min(3).required(),
});

export const validateSkill = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = skillSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }
  next();
};