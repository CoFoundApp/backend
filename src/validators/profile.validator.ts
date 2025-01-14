import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const profileSchema = Joi.object({
  notifEmail: Joi.boolean().required(),
  notifPhone: Joi.boolean().required(),
  availability: Joi.string().required(),
  location: Joi.string().required(),
  userId: Joi.number().required(),
  topicId: Joi.number().optional(),
  notifPush: Joi.boolean().required(),
});

export const validateProfile = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = profileSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }
  next();
};