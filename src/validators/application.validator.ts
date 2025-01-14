import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const schema = Joi.object({
  description: Joi.string().required(),
  userId: Joi.number().required(),
  projectId: Joi.number().required(),
});

export const validateApplication = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }
  next();
};