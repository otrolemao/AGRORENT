const express = require('express');
const router = express.Router();
const maquinariaController = require('../controllers/maquinariaController');
const upload = require('../middlewares/uploadMiddleware');

// CAMBIO: Ahora es 'fotos' (plural) y array
router.post('/', upload.array('fotos', 5), maquinariaController.crearMaquinaria);

router.get('/buscar', maquinariaController.buscarMaquinaria);
router.get('/categorias', maquinariaController.listarCategorias);
router.get('/fotos/:id', maquinariaController.obtenerFotosMaquinaria);
router.get('/:id', maquinariaController.verDetalleMaquinaria);
router.put('/:id', upload.array('fotos', 5), maquinariaController.actualizarMaquinaria);
router.delete('/:id', maquinariaController.eliminarMaquinaria);

module.exports = router;