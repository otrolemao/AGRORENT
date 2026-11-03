const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/metricas', adminController.obtenerMetricas);
router.put('/suspender/:id', adminController.suspenderUsuario);

module.exports = router;