// route project
import { Router } from 'express';
import { validateProject } from '../validators/project.validator';
import { ProjectController } from '../controllers/project.controller';

const router = Router();

const projectController = new ProjectController();

router.get('/', projectController.getAll);
router.get('/:id', projectController.getByParams);
router.post('/', validateProject, projectController.create);
router.put('/:id', validateProject, projectController.updateByParams);
router.delete('/:id', projectController.deleteByParams);
router.delete('/', projectController.deleteAll);

export default router;