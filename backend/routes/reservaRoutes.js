const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reservaController');
const db = require('../config/db');

router.post('/', reservaController.crearReserva);
router.get('/', reservaController.verReservas);
router.put('/:id/estado', reservaController.actualizarEstadoReserva);

router.post('/valorar', async (req, res) => {
    try {
        const { id_reserva, id_productor, id_proveedor, puntuacion, comentario } = req.body;
        await db.execute(
            'INSERT INTO valoracion (id_productor, id_proveedor, puntuacion, comentario) VALUES (?, ?, ?, ?)',
            [id_productor, id_proveedor, puntuacion, comentario]
        );
        res.status(201).json({ mensaje: 'Valoración guardada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar valoración' });
    }
});

module.exports = router;