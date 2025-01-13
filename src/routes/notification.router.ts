// notification router
import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { validateNotification } from '../validators/notification.validator';

const router = Router();

const notificationController = new NotificationController();

router.get('/', notificationController.getAll);
router.get('/:id', notificationController.getByParams);
router.post('/', validateNotification, notificationController.create);
router.put('/:id', validateNotification, notificationController.updateByParams);
router.delete('/:id', notificationController.deleteByParams);
router.delete('/', notificationController.deleteAll);

export default router;