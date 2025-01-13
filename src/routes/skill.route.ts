// sill route
import { Router } from 'express';
import { SkillController } from '../controllers/skill.controller';
import { validateSkill } from '../validators/skill.validator';

const router = Router();

const skillController = new SkillController();

router.get('/', skillController.getAll);
router.get('/:id', skillController.getByParams);
router.post('/', validateSkill, skillController.create);
router.put('/:id', validateSkill, skillController.updateByParams);
router.delete('/:id', skillController.deleteByParams);
router.delete('/', skillController.deleteAll);

export default router;