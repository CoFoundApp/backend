const express = require('express');
const topicController = require('./topic.controller');
const router = express.Router();

router.post('/', topicController.create);
router.get('/', topicController.getAll);
router.get('/:id', topicController.getOne);
router.put('/:id', topicController.update);
router.delete('/:id', topicController.delete);

module.exports = router;
