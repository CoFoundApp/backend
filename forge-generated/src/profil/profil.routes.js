const express = require('express');
const profilController = require('./profil.controller');
const router = express.Router();

router.post('/', profilController.create);
router.get('/', profilController.getAll);
router.get('/:id', profilController.getOne);
router.put('/:id', profilController.update);
router.delete('/:id', profilController.delete);

module.exports = router;
