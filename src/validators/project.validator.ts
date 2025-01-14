import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const projectValidator = Joi.object({
    userId: Joi.number().required(),
    endingDate: Joi.date().optional(),
    startingDate: Joi.date().required(),
    description: Joi.string().required(),
    title: Joi.string().required(),
});

export const validateProject = (req: Request, res: Response, next: NextFunction): void => {
    const { error } = projectValidator.validate(req.body);
    if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
    }
    next();
};