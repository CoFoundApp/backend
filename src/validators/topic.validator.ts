import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const topicSchema = Joi.object({
  id: Joi.number().optional(),
  name: Joi.string().min(3).required(),
});

export const validateTopic = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = topicSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }
  next();
};