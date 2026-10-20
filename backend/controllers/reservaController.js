const db = require('../config/db');

exports.solicitarReserva = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin, monto_total, id_maquinaria, id_usuario } = req.body;
        const fecha_solicitud = new Date();
        const estado = 'pendiente';

        const query = `
            INSERT INTO RESERVA (fecha_solicitud, fecha_inicio, fecha_fin, monto_total, estado)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(query, [fecha_solicitud, fecha_inicio, fecha_fin, monto_total, estado]);
        
        res.status(201).json({ mensaje: 'Reserva solicitada con éxito', id_Reserva: result.insertId });
    } catch (error) {
        console.error("Error al crear reserva:", error);
        res.status(500).json({ error: 'Error al solicitar la reserva' });
    }
};

exports.actualizarEstadoReserva = async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevo_estado } = req.body; 

        const query = `UPDATE RESERVA SET estado = ? WHERE id_Reserva = ?`;
        await db.execute(query, [nuevo_estado, id]);

        res.status(200).json({ mensaje: `Reserva ${nuevo_estado} exitosamente` });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el estado de la reserva' });
    }
};

exports.listarReservas = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM RESERVA');
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener reservas' });
    }
};