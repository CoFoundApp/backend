const express = require('express');
const contributorController = require('./contributor.controller');
const router = express.Router();

router.post('/', contributorController.create);
router.get('/', contributorController.getAll);
router.get('/:id', contributorController.getOne);
router.put('/:id', contributorController.update);
router.delete('/:id', contributorController.delete);

module.exports = router;
