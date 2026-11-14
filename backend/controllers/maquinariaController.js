const db = require('../config/db');

const ESTADOS_MAQUINARIA = ['Disponible', 'Rentado', 'Mantenimiento'];

// Límites tomados del esquema de la BD (marca/modelo VARCHAR(50), patente VARCHAR(20))
const ANIO_MINIMO = 1950;
const PATENTE_REGEX = /^[A-Za-z]{4}-[0-9]{2,3}$/;

// Valida solo los campos presentes (en las actualizaciones parciales los ausentes se conservan).
// Devuelve el mensaje de error o null si todo está correcto.
const validarDatosMaquinaria = ({ marca, modelo, anio, patente, descripcion }) => {
    if (marca !== undefined && marca !== null) {
        if (typeof marca !== 'string' || marca.trim().length === 0) {
            return 'La marca es obligatoria y debe ser un texto';
        }
        if (marca.trim().length > 50) {
            return 'La marca no puede superar los 50 caracteres';
        }
    }

    if (modelo !== undefined && modelo !== null) {
        if (typeof modelo !== 'string' || modelo.trim().length === 0) {
            return 'El modelo es obligatorio y debe ser un texto';
        }
        if (modelo.trim().length > 50) {
            return 'El modelo no puede superar los 50 caracteres';
        }
    }

    const patenteTexto = patente === undefined || patente === null ? '' : String(patente).trim();
    if (patenteTexto !== '') {
        if (patenteTexto.length > 20) {
            return 'La patente no puede superar los 20 caracteres';
        }
        if (!PATENTE_REGEX.test(patenteTexto)) {
            return 'El formato de la patente no es válido (Ej: ABCD-12)';
        }
    }

    if (descripcion !== undefined && descripcion !== null) {
        if (typeof descripcion !== 'string') {
            return 'La descripción debe ser un texto';
        }
        if (descripcion.trim().length > 250) {
            return 'La descripción no puede superar los 250 caracteres';
        }
    }

    if (anio !== undefined && anio !== null && anio !== '') {
        const anioNumero = Number(anio);
        const anioMaximo = new Date().getFullYear() + 1;
        if (!Number.isInteger(anioNumero)) {
            return 'El año debe ser un número entero';
        }
        if (anioNumero < ANIO_MINIMO || anioNumero > anioMaximo) {
            return `El año debe estar entre ${ANIO_MINIMO} y ${anioMaximo}`;
        }
    }

    return null;
};

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

        const errorValidacion = validarDatosMaquinaria({ marca, modelo, anio, patente, descripcion });
        if (errorValidacion) {
            return res.status(400).json({ error: errorValidacion });
        }

        if (Number(precio_dia) <= 0) {
            return res.status(400).json({ error: 'El precio por día debe ser mayor a cero' });
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

        const errorValidacion = validarDatosMaquinaria({ marca, modelo, anio, patente, descripcion });
        if (errorValidacion) {
            return res.status(400).json({ error: errorValidacion });
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

// --- SEGURIDAD APLICADA AQUÍ ---
exports.eliminarMaquinaria = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_proveedor } = req.query; // Recibimos quién está borrando

        if (!id_proveedor) {
            return res.status(400).json({ error: 'No se especificó el proveedor que intenta eliminar.' });
        }

        // 1. Buscamos la máquina y verificamos si es del proveedor
        const [existe] = await db.execute('SELECT id_proveedor FROM maquinaria WHERE id_maquinaria = ?', [id]);
        
        if (existe.length === 0) {
            return res.status(404).json({ error: 'Maquinaria no encontrada' });
        }

        // 2. REGLA DE SEGURIDAD: Si la máquina es de otro proveedor, rebotamos la petición
        if (Number(existe[0].id_proveedor) !== Number(id_proveedor)) {
            return res.status(403).json({ error: 'Acceso denegado: No puedes eliminar una máquina que no te pertenece.' });
        }

        // 3. Si es suyo, la eliminamos
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