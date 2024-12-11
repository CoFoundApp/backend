const express = require('express');
const userskillController = require('./userskill.controller');
const router = express.Router();

router.post('/', userskillController.create);
router.get('/', userskillController.getAll);
router.get('/:id', userskillController.getOne);
router.put('/:id', userskillController.update);
router.delete('/:id', userskillController.delete);

module.exports = router;
