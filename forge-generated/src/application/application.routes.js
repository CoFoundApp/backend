const express = require('express');
const applicationController = require('./application.controller');
const router = express.Router();

router.post('/', applicationController.create);
router.get('/', applicationController.getAll);
router.get('/:id', applicationController.getOne);
router.put('/:id', applicationController.update);
router.delete('/:id', applicationController.delete);

module.exports = router;
