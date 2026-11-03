const db = require('../config/db');

exports.buscarMaquinaria = async (req, res) => {
    try {
        const { busqueda } = req.query;
        
        let query = `
            SELECT m.id_maquinaria, m.marca, m.modelo, m.descripcion, m.precio_dia, m.foto, m.estado 
            FROM maquinaria m
            WHERE m.estado = 'Disponible'
        `;
        const params = [];

        if (busqueda) {
            query += ` AND (m.marca LIKE ? OR m.modelo LIKE ? OR m.descripcion LIKE ?)`;
            params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
        }

        const [rows] = await db.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor al buscar maquinaria.' });
    }
};

exports.verDetalleMaquinaria = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute('SELECT * FROM maquinaria WHERE id_maquinaria = ?', [id]);
        
        if (rows.length === 0) return res.status(404).json({ error: 'Maquinaria no encontrada' });
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener detalle de la maquinaria' });
    }
};

exports.crearMaquinaria = async (req, res) => {
    try {
        const { id_proveedor, id_categoria, marca, modelo, anio, patente, precio_dia, descripcion } = req.body;

        if (!id_proveedor || !id_categoria || !marca || !modelo || !precio_dia) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        const query = `
            INSERT INTO maquinaria 
            (id_proveedor, id_categoria, marca, modelo, anio, patente, precio_dia, descripcion, estado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Disponible')
        `;

        const [resultado] = await db.execute(query, [
            id_proveedor, id_categoria, marca, modelo, anio, patente, precio_dia, descripcion
        ]);

        res.status(201).json({
            mensaje: 'Maquinaria registrada exitosamente',
            id_maquinaria: resultado.insertId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno al registrar maquinaria' });
    }
};

exports.actualizarMaquinaria = async (req, res) => {
    try {
        const { id } = req.params;
        const { marca, modelo, anio, patente, precio_dia, descripcion, estado } = req.body;

        const query = `
            UPDATE maquinaria 
            SET marca = ?, modelo = ?, anio = ?, patente = ?, precio_dia = ?, descripcion = ?, estado = ?
            WHERE id_maquinaria = ?
        `;

        const [resultado] = await db.execute(query, [
            marca, modelo, anio, patente, precio_dia, descripcion, estado, id
        ]);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Maquinaria no encontrada' });
        }

        res.status(200).json({ mensaje: 'Maquinaria actualizada exitosamente' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno al actualizar maquinaria' });
    }
};

exports.eliminarMaquinaria = async (req, res) => {
    try {
        const { id } = req.params;

        const [existe] = await db.execute('SELECT id_maquinaria FROM maquinaria WHERE id_maquinaria = ?', [id]);
        if (existe.length === 0) {
            return res.status(404).json({ error: 'Maquinaria no encontrada' });
        }

        await db.execute('DELETE FROM maquinaria WHERE id_maquinaria = ?', [id]);

        res.status(200).json({ mensaje: 'Maquinaria eliminada exitosamente' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno al eliminar maquinaria' });
    }
};