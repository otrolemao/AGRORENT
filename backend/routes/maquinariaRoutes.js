const express = require('express');
const router = express.Router();
const maquinariaController = require('../controllers/maquinariaController');

router.get('/buscar', maquinariaController.buscarMaquinaria);
router.get('/:id', maquinariaController.verDetalleMaquinaria);

module.exports = router;