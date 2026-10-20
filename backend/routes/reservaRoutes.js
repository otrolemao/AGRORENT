const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reservaController');

router.post('/crear', reservaController.solicitarReserva);
router.put('/:id/estado', reservaController.actualizarEstadoReserva);
router.get('/', reservaController.listarReservas);

module.exports = router;