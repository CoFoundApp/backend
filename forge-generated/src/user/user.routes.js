const express = require('express');
const userController = require('./user.controller');
const router = express.Router();

router.post('/', userController.create);
router.get('/', userController.getAll);
router.get('/:id', userController.getOne);
router.put('/:id', userController.update);
router.delete('/:id', userController.delete);

module.exports = router;
