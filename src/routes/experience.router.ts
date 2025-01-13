import { Router } from 'express';
import { validateExperience } from '../validators/experience.validator';
import { ExperienceController } from '../controllers/experience.controller';

const router = Router();

const experienceController = new ExperienceController();

router.get('/', experienceController.getAll);
router.get('/:id', experienceController.getByParams);
router.post('/', validateExperience, experienceController.create);
router.put('/:id', validateExperience, experienceController.updateByParams);
router.delete('/:id', experienceController.deleteByParams);
router.delete('/', experienceController.deleteAll);

export default router;