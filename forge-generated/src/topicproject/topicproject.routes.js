const express = require('express');
const topicprojectController = require('./topicproject.controller');
const router = express.Router();

router.post('/', topicprojectController.create);
router.get('/', topicprojectController.getAll);
router.get('/:id', topicprojectController.getOne);
router.put('/:id', topicprojectController.update);
router.delete('/:id', topicprojectController.delete);

module.exports = router;
