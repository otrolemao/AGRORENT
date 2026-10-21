const db = require('../config/db');

// 1. BUSCAR MAQUINARIA (GET)
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
        console.error("Error al buscar maquinaria:", error);
        res.status(500).json({ error: 'Error interno del servidor al buscar maquinaria.' });
    }
};

// 2. VER DETALLE DE MAQUINARIA (GET)
exports.verDetalleMaquinaria = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute('SELECT * FROM maquinaria WHERE id_maquinaria = ?', [id]);
        
        if (rows.length === 0) return res.status(404).json({ error: 'Maquinaria no encontrada' });
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Error al obtener detalle:", error);
        res.status(500).json({ error: 'Error al obtener detalle de la maquinaria' });
    }
};

// 3. CREAR MAQUINARIA (POST)
exports.crearMaquinaria = async (req, res) => {
    try {
        const { id_proveedor, id_categoria, marca, modelo, anio, patente, precio_dia, descripcion } = req.body;

        // Validación simple
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
        console.error("Error al crear maquinaria:", error);
        res.status(500).json({ error: 'Error interno al registrar maquinaria' });
    }
};

// 4. ELIMINAR MAQUINARIA (DELETE)
exports.eliminarMaquinaria = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificamos si existe primero
        const [existe] = await db.execute('SELECT id_maquinaria FROM maquinaria WHERE id_maquinaria = ?', [id]);
        if (existe.length === 0) {
            return res.status(404).json({ error: 'Maquinaria no encontrada' });
        }

        // Si existe, la eliminamos
        await db.execute('DELETE FROM maquinaria WHERE id_maquinaria = ?', [id]);

        res.status(200).json({ mensaje: 'Maquinaria eliminada exitosamente' });

    } catch (error) {
        console.error("Error al eliminar maquinaria:", error);
        res.status(500).json({ error: 'Error interno al eliminar maquinaria' });
    }
};