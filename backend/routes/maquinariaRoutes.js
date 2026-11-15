const express = require('express');
const router = express.Router();
const maquinariaController = require('../controllers/maquinariaController');
const upload = require('../middlewares/uploadMiddleware'); // <-- Importamos multer

// A la ruta POST le agregamos el middleware 'upload.single("foto")'
router.post('/', upload.single('foto'), maquinariaController.crearMaquinaria);

router.get('/buscar', maquinariaController.buscarMaquinaria);
router.get('/categorias', maquinariaController.listarCategorias);
router.get('/:id', maquinariaController.verDetalleMaquinaria);
router.put('/:id', maquinariaController.actualizarMaquinaria);
router.delete('/:id', maquinariaController.eliminarMaquinaria);

module.exports = router;