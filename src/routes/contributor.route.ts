// contributor.route.ts
import { Router } from 'express';
import { validateContributor} from '../validators/contributor.validator';
import { ContributorController } from '../controllers/contributor.controller';

const router = Router();

const contributorController = new ContributorController();

router.get('/:id', contributorController.getByParams);
router.post('/', validateContributor, contributorController.create);
router.put('/:id', validateContributor, contributorController.updateByParams);
router.delete('/:id', contributorController.deleteByParams);
router.delete('/', contributorController.deleteAll);

export default router;
