const express = require('express');
const notificationController = require('./notification.controller');
const router = express.Router();

router.post('/', notificationController.create);
router.get('/', notificationController.getAll);
router.get('/:id', notificationController.getOne);
router.put('/:id', notificationController.update);
router.delete('/:id', notificationController.delete);

module.exports = router;
