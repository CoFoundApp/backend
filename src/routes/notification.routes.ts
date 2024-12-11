import { Router } from 'express';
import { create, getOne, deleteNotification, getByUser } from '../controllers/notification.controller';
const router = Router();

router.post('/', create);
router.get('/', getByUser);
router.get('/:id', getOne);
router.delete('/:id', deleteNotification);

export default router;
