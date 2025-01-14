// message routes
import { Router } from 'express';
import { validateMessage } from '../validators/message.validator';
import { MessageController } from '../controllers/message.controller';

const router = Router();

const messageController = new MessageController();

router.post('/', validateMessage, messageController.create);
router.get('/conversations/:receiverUserId', messageController.getConversationsByUser);
router.get('/:receiverUserId/:senderUserId', messageController.getMessagesByUsers);
router.put('/seen/:messageId', messageController.updateMessageSeen);

export default router;