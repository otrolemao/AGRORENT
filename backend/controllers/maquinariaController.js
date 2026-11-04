const db = require('../config/db');

const ESTADOS_MAQUINARIA = ['Disponible', 'Rentado', 'Mantenimiento'];

exports.buscarMaquinaria = async (req, res) => {
    try {
        const { busqueda, id_proveedor, estado } = req.query;

        let query = `
            SELECT m.id_maquinaria, m.id_proveedor, m.id_categoria,
                   m.marca, m.modelo, m.anio, m.patente, m.descripcion,
                   m.precio_dia, m.foto, m.estado
            FROM maquinaria m
        `;
        const condiciones = [];
        const params = [];

        // Si se pide un estado concreto, se respeta; si no, el catálogo público
        // muestra únicamente lo disponible.
        if (estado) {
            condiciones.push('m.estado = ?');
            params.push(estado);
        } else if (!id_proveedor) {
            condiciones.push("m.estado = 'Disponible'");
        }

        if (id_proveedor) {
            condiciones.push('m.id_proveedor = ?');
            params.push(id_proveedor);
        }

        if (busqueda) {
            condiciones.push('(m.marca LIKE ? OR m.modelo LIKE ? OR m.descripcion LIKE ?)');
            const patron = `%${busqueda}%`;
            params.push(patron, patron, patron);
        }

        if (condiciones.length > 0) {
            query += ' WHERE ' + condiciones.join(' AND ');
        }
        query += ' ORDER BY m.fecha_registro DESC';

        const [rows] = await db.execute(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor al buscar maquinaria.' });
    }
};

exports.listarCategorias = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id_categoria, nombre FROM categoria ORDER BY nombre');
        res.status(200).json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las categorías' });
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

        if (Number(precio_dia) <= 0) {
            return res.status(400).json({ error: 'El precio por día debe ser mayor a cero' });
        }

        if (anio && (Number(anio) < 1950 || Number(anio) > new Date().getFullYear() + 1)) {
            return res.status(400).json({ error: 'El año de la maquinaria no es válido' });
        }

        const [proveedor] = await db.execute('SELECT id_proveedor FROM proveedor WHERE id_proveedor = ?', [id_proveedor]);
        if (proveedor.length === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        const [categoria] = await db.execute('SELECT id_categoria FROM categoria WHERE id_categoria = ?', [id_categoria]);
        if (categoria.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        const query = `
            INSERT INTO maquinaria
            (id_proveedor, id_categoria, marca, modelo, anio, patente, precio_dia, descripcion, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Disponible')
        `;

        const [resultado] = await db.execute(query, [
            id_proveedor,
            id_categoria,
            marca,
            modelo,
            anio || null,
            patente || null,
            precio_dia,
            descripcion || null,
        ]);

        res.status(201).json({
            mensaje: 'Maquinaria registrada exitosamente',
            id_maquinaria: resultado.insertId,
        });
    } catch (error) {
        console.error(error);
        if (error && error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Ya existe una maquinaria con esa patente' });
        }
        res.status(500).json({ error: 'Error interno al registrar maquinaria' });
    }
};

exports.actualizarMaquinaria = async (req, res) => {
    try {
        const { id } = req.params;
        const { marca, modelo, anio, patente, precio_dia, descripcion, estado } = req.body;

        if (estado && !ESTADOS_MAQUINARIA.includes(estado)) {
            return res.status(400).json({ error: `Estado inválido. Use: ${ESTADOS_MAQUINARIA.join(', ')}` });
        }

        if (precio_dia !== undefined && Number(precio_dia) <= 0) {
            return res.status(400).json({ error: 'El precio por día debe ser mayor a cero' });
        }

        const [actual] = await db.execute('SELECT * FROM maquinaria WHERE id_maquinaria = ?', [id]);
        if (actual.length === 0) {
            return res.status(404).json({ error: 'Maquinaria no encontrada' });
        }

        const query = `
            UPDATE maquinaria
            SET marca = ?, modelo = ?, anio = ?, patente = ?, precio_dia = ?, descripcion = ?, estado = ?
            WHERE id_maquinaria = ?
        `;

        await db.execute(query, [
            marca ?? actual[0].marca,
            modelo ?? actual[0].modelo,
            anio ?? actual[0].anio,
            patente ?? actual[0].patente,
            precio_dia ?? actual[0].precio_dia,
            descripcion ?? actual[0].descripcion,
            estado ?? actual[0].estado,
            id,
        ]);

        res.status(200).json({ mensaje: 'Maquinaria actualizada exitosamente' });
    } catch (error) {
        console.error(error);
        if (error && error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Ya existe una maquinaria con esa patente' });
        }
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
        if (error && error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ error: 'No se puede eliminar: la maquinaria tiene reservas asociadas' });
        }
        res.status(500).json({ error: 'Error interno al eliminar maquinaria' });
    }
};
