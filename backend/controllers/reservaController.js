const db = require('../config/db');

const ESTADOS_VALIDOS = ['Pendiente', 'Confirmada', 'Rechazada', 'Cancelada'];
const MS_POR_DIA = 1000 * 60 * 60 * 24;

function fechaValida(valor) {
    return typeof valor === 'string' && !Number.isNaN(new Date(valor).getTime());
}

exports.crearReserva = async (req, res) => {
    try {
        const { id_productor, id_maquinaria, fecha_inicio, fecha_fin } = req.body;

        if (!id_productor || !id_maquinaria || !fecha_inicio || !fecha_fin) {
            return res.status(400).json({ error: 'Faltan datos obligatorios' });
        }

        if (!fechaValida(fecha_inicio) || !fechaValida(fecha_fin)) {
            return res.status(400).json({ error: 'Las fechas no son válidas' });
        }

        const inicio = new Date(fecha_inicio);
        const fin = new Date(fecha_fin);

        if (fin <= inicio) {
            return res.status(400).json({ error: 'La fecha de término debe ser posterior a la de inicio' });
        }

        const [productor] = await db.execute(
            'SELECT id_productor FROM productor WHERE id_productor = ?',
            [id_productor]
        );
        if (productor.length === 0) {
            return res.status(404).json({ error: 'Productor no encontrado' });
        }

        const [maquina] = await db.execute(
            'SELECT precio_dia, estado FROM maquinaria WHERE id_maquinaria = ?',
            [id_maquinaria]
        );
        if (maquina.length === 0) {
            return res.status(404).json({ error: 'Maquinaria no encontrada' });
        }
        if (maquina[0].estado !== 'Disponible') {
            return res.status(409).json({ error: `La maquinaria no está disponible (estado: ${maquina[0].estado})` });
        }

        // Evitar superposición de reservas activas para la misma máquina.
        const [cruce] = await db.execute(
            `SELECT id_reserva FROM reserva
             WHERE id_maquinaria = ?
               AND estado IN ('Pendiente', 'Confirmada')
               AND fecha_inicio <= ?
               AND fecha_fin >= ?
             LIMIT 1`,
            [id_maquinaria, fecha_fin, fecha_inicio]
        );
        if (cruce.length > 0) {
            return res.status(409).json({
                error: `La maquinaria ya está reservada en ese rango de fechas (reserva #${cruce[0].id_reserva})`,
            });
        }

        const dias = Math.max(1, Math.ceil((fin - inicio) / MS_POR_DIA));
        const costo_estimado = dias * Number(maquina[0].precio_dia);
        
        // Cálculo de la seña (20%)
        const monto_seña = costo_estimado * 0.20;

        const [resultado] = await db.execute(
            `INSERT INTO reserva (id_productor, id_maquinaria, fecha_inicio, fecha_fin, estado, costo_estimado, monto_seña, estado_pago)
             VALUES (?, ?, ?, ?, 'Pendiente', ?, ?, 'Pagado')`,
            [id_productor, id_maquinaria, fecha_inicio, fecha_fin, costo_estimado, monto_seña]
        );

        res.status(201).json({
            mensaje: 'Reserva y pago de seña exitoso',
            id_reserva: resultado.insertId,
            dias,
            costo_estimado,
            monto_seña
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno al crear la reserva' });
    }
};

exports.verReservas = async (req, res) => {
    try {
        const { id_productor, id_proveedor } = req.query;

        let query = `
            SELECT r.*, m.marca, m.modelo, m.id_proveedor,
                   u.nombre AS nombre_productor
            FROM reserva r
            JOIN maquinaria m ON r.id_maquinaria = m.id_maquinaria
            LEFT JOIN productor pr ON r.id_productor = pr.id_productor
            LEFT JOIN usuario u ON pr.id_usuario = u.id_usuario
        `;
        const params = [];
        const filtros = [];

        if (id_productor) {
            filtros.push('r.id_productor = ?');
            params.push(id_productor);
        }
        if (id_proveedor) {
            filtros.push('m.id_proveedor = ?');
            params.push(id_proveedor);
        }
        if (filtros.length > 0) {
            query += ' WHERE ' + filtros.join(' AND ');
        }
        query += ' ORDER BY r.fecha_inicio DESC';

        const [rows] = await db.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener reservas' });
    }
};

exports.actualizarEstadoReserva = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!ESTADOS_VALIDOS.includes(estado)) {
            return res.status(400).json({
                error: `Estado inválido. Use uno de: ${ESTADOS_VALIDOS.join(', ')}`,
            });
        }

        // 1. Buscamos la reserva actual
        const [existe] = await db.execute(
            'SELECT id_reserva, id_maquinaria, estado_pago FROM reserva WHERE id_reserva = ?',
            [id]
        );
        if (existe.length === 0) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }

        const reservaActual = existe[0];

        // 2. Si se rechaza o cancela, se devuelve la seña (Reembolso)
        let nuevoEstadoPago = reservaActual.estado_pago;
        if ((estado === 'Cancelada' || estado === 'Rechazada') && reservaActual.estado_pago === 'Pagado') {
            nuevoEstadoPago = 'Reembolsado';
        }

        // 3. Actualizamos estado de reserva y de pago
        await db.execute(
            'UPDATE reserva SET estado = ?, estado_pago = ? WHERE id_reserva = ?', 
            [estado, nuevoEstadoPago, id]
        );

        // 4. Sincronizamos el estado de la maquinaria
        if (estado === 'Confirmada') {
            await db.execute("UPDATE maquinaria SET estado = 'Rentado' WHERE id_maquinaria = ?", [reservaActual.id_maquinaria]);
        } else if (estado === 'Cancelada' || estado === 'Rechazada') {
            const [activas] = await db.execute(
                `SELECT COUNT(*) AS total FROM reserva
                 WHERE id_maquinaria = ? AND estado = 'Confirmada'`,
                [reservaActual.id_maquinaria]
            );
            if (activas[0].total === 0) {
                await db.execute("UPDATE maquinaria SET estado = 'Disponible' WHERE id_maquinaria = ?", [reservaActual.id_maquinaria]);
            }
        }

        res.status(200).json({ 
            mensaje: `Reserva actualizada a ${estado}. Estado de pago: ${nuevoEstadoPago}`, 
            estado: estado,
            estado_pago: nuevoEstadoPago
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar la reserva' });
    }
};

exports.crearValoracion = async (req, res) => {
    try {
        const { id_reserva, id_productor, puntuacion, comentario } = req.body;

        if (!id_reserva || !id_productor || puntuacion === undefined || puntuacion === null || puntuacion === '') {
            return res.status(400).json({
                error: 'Faltan datos obligatorios (id_reserva, id_productor y puntuacion)',
            });
        }

        const nota = Number(puntuacion);
        if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
            return res.status(400).json({ error: 'La puntuación debe ser un número entero entre 1 y 5' });
        }

        const [reservas] = await db.execute(
            `SELECT r.id_reserva, r.id_productor, r.estado, m.id_proveedor
             FROM reserva r
             JOIN maquinaria m ON r.id_maquinaria = m.id_maquinaria
             WHERE r.id_reserva = ?`,
            [id_reserva]
        );
        if (reservas.length === 0) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }

        const reserva = reservas[0];

        if (Number(reserva.id_productor) !== Number(id_productor)) {
            return res.status(403).json({ error: 'La reserva no pertenece al productor indicado' });
        }
        if (reserva.estado !== 'Confirmada') {
            return res.status(400).json({ error: 'Solo se pueden valorar reservas confirmadas' });
        }

        const [duplicada] = await db.execute(
            'SELECT id_valoracion FROM valoracion WHERE id_reserva = ?',
            [id_reserva]
        );
        if (duplicada.length > 0) {
            return res.status(409).json({ error: 'Esta reserva ya fue valorada' });
        }

        const [resultado] = await db.execute(
            `INSERT INTO valoracion (id_reserva, id_productor, id_proveedor, puntuacion, comentario)
             VALUES (?, ?, ?, ?, ?)`,
            [id_reserva, id_productor, reserva.id_proveedor, nota, comentario || null]
        );

        res.status(201).json({
            mensaje: 'Valoración guardada',
            id_valoracion: resultado.insertId,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar valoración' });
    }
};

exports.listarValoraciones = async (req, res) => {
    try {
        const { id_proveedor, id_productor, id_reserva } = req.query;

        let query = `
            SELECT v.id_valoracion, v.id_reserva, v.id_productor, v.id_proveedor,
                   v.puntuacion, v.comentario, v.fecha,
                   u.nombre AS nombre_productor,
                   p.nombre_empresa AS nombre_proveedor,
                   m.marca, m.modelo
            FROM valoracion v
            LEFT JOIN productor pr ON v.id_productor = pr.id_productor
            LEFT JOIN usuario u ON pr.id_usuario = u.id_usuario
            LEFT JOIN proveedor p ON v.id_proveedor = p.id_proveedor
            LEFT JOIN reserva r ON v.id_reserva = r.id_reserva
            LEFT JOIN maquinaria m ON r.id_maquinaria = m.id_maquinaria
        `;
        const filtros = [];
        const params = [];

        if (id_proveedor) {
            filtros.push('v.id_proveedor = ?');
            params.push(id_proveedor);
        }
        if (id_productor) {
            filtros.push('v.id_productor = ?');
            params.push(id_productor);
        }
        if (id_reserva) {
            filtros.push('v.id_reserva = ?');
            params.push(id_reserva);
        }
        if (filtros.length > 0) {
            query += ' WHERE ' + filtros.join(' AND ');
        }
        query += ' ORDER BY v.fecha DESC';

        const [rows] = await db.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener valoraciones' });
    }
};