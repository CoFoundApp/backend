import { Router } from 'express';
import { create, deleteMessage, getByUser, getByUsers } from '../controllers/messages.controller';

const router = Router();

router.post('/', create);
router.get('/:userId/', getByUser);
router.get('/:senderUserId/:receiverUserId/', getByUsers);
router.delete('/:id', deleteMessage);

export default router;
