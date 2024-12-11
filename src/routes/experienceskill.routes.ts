import { Router } from 'express';
import { create, getAll, getSkill, getExperience, deleteExperienceSkill } from '../controllers/experienceskill.controller';

const router = Router();

router.post('/', create);
router.get('/', getAll);
router.get('/skill/:id', getSkill);
router.get('/experience/:id', getExperience);
router.delete('/:experienceId/:skillId', deleteExperienceSkill);

export default router;

