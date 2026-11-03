const db = require('../config/db');

exports.crearReserva = async (req, res) => {
    try {
        const { id_productor, id_maquinaria, fecha_inicio, fecha_fin } = req.body;

        if (!id_productor || !id_maquinaria || !fecha_inicio || !fecha_fin) {
            return res.status(400).json({ error: 'Faltan datos obligatorios' });
        }

        const [maquina] = await db.execute('SELECT precio_dia FROM maquinaria WHERE id_maquinaria = ?', [id_maquinaria]);
        if (maquina.length === 0) {
            return res.status(404).json({ error: 'Maquinaria no encontrada' });
        }

        const precio_dia = maquina[0].precio_dia;
        const dias = (new Date(fecha_fin) - new Date(fecha_inicio)) / (1000 * 60 * 60 * 24);
        const costo_estimado = dias * precio_dia;

        const query = `
            INSERT INTO reserva (id_productor, id_maquinaria, fecha_inicio, fecha_fin, estado, costo_estimado)
            VALUES (?, ?, ?, ?, 'Pendiente', ?)
        `;

        const [resultado] = await db.execute(query, [
            id_productor, id_maquinaria, fecha_inicio, fecha_fin, costo_estimado
        ]);

        res.status(201).json({
            mensaje: 'Reserva solicitada exitosamente',
            id_reserva: resultado.insertId,
            costo_estimado: costo_estimado
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno al crear la reserva' });
    }
};

exports.verReservas = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT r.*, m.marca, m.modelo 
            FROM reserva r 
            JOIN maquinaria m ON r.id_maquinaria = m.id_maquinaria
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener reservas' });
    }
};