const express = require('express');
const experienceController = require('./experience.controller');
const router = express.Router();

router.post('/', experienceController.create);
router.get('/', experienceController.getAll);
router.get('/:id', experienceController.getOne);
router.put('/:id', experienceController.update);
router.delete('/:id', experienceController.delete);

module.exports = router;
