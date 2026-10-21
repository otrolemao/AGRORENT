const express = require('express');
const router = express.Router();
const maquinariaController = require('../controllers/maquinariaController');

router.get('/buscar', maquinariaController.buscarMaquinaria);
router.get('/:id', maquinariaController.verDetalleMaquinaria);
router.post('/', maquinariaController.crearMaquinaria);
router.delete('/:id', maquinariaController.eliminarMaquinaria);

module.exports = router;