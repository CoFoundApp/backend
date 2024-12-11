const express = require('express');
const experienceskillController = require('./experienceskill.controller');
const router = express.Router();

router.post('/', experienceskillController.create);
router.get('/', experienceskillController.getAll);
router.get('/:id', experienceskillController.getOne);
router.put('/:id', experienceskillController.update);
router.delete('/:id', experienceskillController.delete);

module.exports = router;
