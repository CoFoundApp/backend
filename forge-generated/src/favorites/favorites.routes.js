const express = require('express');
const favoritesController = require('./favorites.controller');
const router = express.Router();

router.post('/', favoritesController.create);
router.get('/', favoritesController.getAll);
router.get('/:id', favoritesController.getOne);
router.put('/:id', favoritesController.update);
router.delete('/:id', favoritesController.delete);

module.exports = router;
