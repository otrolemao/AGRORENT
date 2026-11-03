const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reservaController');

router.post('/', reservaController.crearReserva);
router.get('/', reservaController.verReservas);

module.exports = router;