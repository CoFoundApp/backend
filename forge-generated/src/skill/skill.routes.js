const express = require('express');
const skillController = require('./skill.controller');
const router = express.Router();

router.post('/', skillController.create);
router.get('/', skillController.getAll);
router.get('/:id', skillController.getOne);
router.put('/:id', skillController.update);
router.delete('/:id', skillController.delete);

module.exports = router;
