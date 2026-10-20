const db = require('../config/db');

exports.buscarMaquinaria = async (req, res) => {
    try {
        const { busqueda, fecha_inicio, fecha_fin } = req.query;
        
        let query = `
            SELECT m.id_maquinaria, m.nombre, m.descripcion, m.precio_dia, m.foto, m.estado 
            FROM MAQUINARIA m
            WHERE m.estado = 'disponible'
        `;
        const params = [];

        if (busqueda) {
            query += ` AND (m.nombre LIKE ? OR m.descripcion LIKE ?)`;
            params.push(`%${busqueda}%`, `%${busqueda}%`);
        }

        const [rows] = await db.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error al buscar maquinaria:", error);
        res.status(500).json({ error: 'Error interno del servidor al buscar maquinaria.' });
    }
};

exports.verDetalleMaquinaria = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute('SELECT * FROM MAQUINARIA WHERE id_maquinaria = ?', [id]);
        
        if (rows.length === 0) return res.status(404).json({ error: 'Maquinaria no encontrada' });
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener detalle de la maquinaria' });
    }
};