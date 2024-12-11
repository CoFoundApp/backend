import { Router } from 'express';
import { create, getAll, getOne, update, deleteProject } from '../controllers/project.controller';
const router = Router();

router.post('/', create);
router.get('/', getAll);
router.get('/:id', getOne);
router.put('/:id', update);
router.delete('/:id', deleteProject);

module.exports = router;
