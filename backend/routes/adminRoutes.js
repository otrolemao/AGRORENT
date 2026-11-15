const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const db = require('../config/db');

router.get('/metricas', adminController.obtenerMetricas);
router.put('/suspender/:id', adminController.suspenderUsuario);

// RUTA DE USUARIOS
router.get('/usuarios', async (req, res) => {
    try {
        const [usuarios] = await db.query('SELECT id_usuario, nombre, email, id_rol, estado FROM usuario ORDER BY id_usuario ASC');
        res.status(200).json(usuarios);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

module.exports = router;