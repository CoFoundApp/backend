import { Router } from 'express';
import { validateApplication } from '../validators/application.validator';
import { ApplicationController } from '../controllers/application.controller';

const router = Router();

const applicationController = new ApplicationController();

router.get('/', applicationController.getAll);
router.get('/:id', applicationController.getByParams);
router.post('/', validateApplication, applicationController.create);
router.put('/:id', validateApplication, applicationController.updateByParams);
router.delete('/:id', applicationController.deleteByParams);
router.delete('/', applicationController.deleteAll);

export default router;
