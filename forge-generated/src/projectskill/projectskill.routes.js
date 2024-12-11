const express = require('express');
const projectskillController = require('./projectskill.controller');
const router = express.Router();

router.post('/', projectskillController.create);
router.get('/', projectskillController.getAll);
router.get('/:id', projectskillController.getOne);
router.put('/:id', projectskillController.update);
router.delete('/:id', projectskillController.delete);

module.exports = router;
