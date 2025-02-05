import { Router } from 'express';
import { LoginController } from '../controllers/login.controller';

const router = Router();

const loginController = new LoginController();

router.post('/', loginController.login);
router.post('/username', loginController.loginWithUsername);
router.post('/checkToken', loginController.checkToken);


export default router;
