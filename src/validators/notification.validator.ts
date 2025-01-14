import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const notificationValidator = Joi.object({
  id: Joi.number().optional(),
  userId: Joi.number().required(),
  emitterProjectId: Joi.number().optional(),
  emitterUserId: Joi.number().optional(),
  link: Joi.string().optional(),
  seen: Joi.boolean().required(),
  description: Joi.string().required(),
  emissionDate: Joi.date().required(),
});

export const validateNotification = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = notificationValidator.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }
  next();
};