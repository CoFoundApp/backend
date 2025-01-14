import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validateUser } from '../validators/user.validator';

const router = Router();

const userController = new UserController();

router.get('/', userController.getAll);
router.get('/:id', userController.getByParams);
router.post('/', validateUser, userController.create);
router.put('/:id', validateUser, userController.updateByParams);
router.delete('/:id', userController.deleteByParams);
router.delete('/', userController.deleteAll);

export default router;