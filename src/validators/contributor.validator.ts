import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

export const validateContributor = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    id: Joi.number().optional(),
    endingDate: Joi.date().optional(),
    role: Joi.string().required(),
    projectId: Joi.number().required(),
    mission: Joi.string().required(),
    userId: Joi.number().required(),
    startingDate: Joi.date().required(),
    location: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  next();
};