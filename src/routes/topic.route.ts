import { Router } from 'express';
import { TopicController } from '../controllers/topic.controller';
import { validateTopic } from '../validators/topic.validator';

const router = Router();

const topicController = new TopicController();

router.get('/', topicController.getAll);
router.get('/:id', topicController.getByParams);
router.post('/', validateTopic, topicController.create);
router.put('/:id', validateTopic, topicController.updateByParams);
router.delete('/:id', topicController.deleteByParams);
router.delete('/', topicController.deleteAll);

export default router;