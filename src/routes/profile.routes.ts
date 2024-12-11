import { Router } from 'express';
import { create, getAll, getOne, update, deleteProfile } from '../controllers/profile.controller';
const router = Router();

router.post('/', create);
router.get('/', getAll);
router.get('/:id', getOne);
router.put('/:id', update);
router.delete('/:id', deleteProfile);

module.exports = router;
