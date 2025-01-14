import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

export const validateExperience = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    userId: Joi.number().required(),
    description: Joi.string().required(),
    endingDate: Joi.date().optional(),
    startingDate: Joi.date().required(),
    title: Joi.string().required(),
    location: Joi.string().required(),
    role: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  next();
};

