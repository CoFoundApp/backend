import { Router } from 'express';
import { create, getAll, getOne, update, deleteNotification } from '../controllers/notification.controller';
const router = Router();

router.post('/', create);
router.get('/', getAll);
router.get('/:id', getOne);
router.put('/:id', update);
router.delete('/:id', deleteNotification);

export default router;
