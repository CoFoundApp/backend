const express = require('express');
const messagesController = require('./messages.controller');
const router = express.Router();

router.post('/', messagesController.create);
router.get('/', messagesController.getAll);
router.get('/:id', messagesController.getOne);
router.put('/:id', messagesController.update);
router.delete('/:id', messagesController.delete);

module.exports = router;
