// route profile
import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { validateProfile } from '../validators/profile.validator';

const router = Router();

const profileController = new ProfileController();

router.get('/', profileController.getAll);
router.get('/:id', profileController.getByParams);
router.post('/', validateProfile, profileController.create);
router.put('/:id', validateProfile, profileController.updateByParams);
router.delete('/:id', profileController.deleteByParams);
router.delete('/', profileController.deleteAll);

export default router;