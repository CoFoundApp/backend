import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const schema = Joi.object({
  id: Joi.number().optional(),
  receiverUserId: Joi.number().required(),
  sentDate: Joi.date().required(),
  message: Joi.string().required(),
  senderUserId: Joi.number().required(),
  seenDate: Joi.date().optional(),
});

export const validateMessage = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }
  next();
};