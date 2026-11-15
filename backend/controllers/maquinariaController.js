const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const ESTADOS_MAQUINARIA = ['Disponible', 'Rentado', 'Mantenimiento'];
const ANIO_MINIMO = 1950;
const PATENTE_REGEX = /^[A-Za-z]{4}-[0-9]{2,3}$/;

const descartarArchivosSubidos = (req) => {
    if (req.files && Array.isArray(req.files)) {
        req.files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
    }
};

const validarDatosMaquinaria = ({ marca, modelo, anio, patente, descripcion }) => {
    if (marca !== undefined && marca !== null) {
        if (typeof marca !== 'string' || marca.trim().length === 0) return 'La marca es obligatoria y debe ser un texto';
        if (marca.trim().length > 50) return 'La marca no puede superar los 50 caracteres';
    }
    if (modelo !== undefined && modelo !== null) {
        if (typeof modelo !== 'string' || modelo.trim().length === 0) return 'El modelo es obligatorio y debe ser un texto';
        if (modelo.trim().length > 50) return 'El modelo no puede superar los 50 caracteres';
    }
    const patenteTexto = patente === undefined || patente === null ? '' : String(patente).trim();
    if (patenteTexto !== '') {
        if (patenteTexto.length > 20) return 'La patente no puede superar los 20 caracteres';
        if (!PATENTE_REGEX.test(patenteTexto)) return 'El formato de la patente no es válido (Ej: ABCD-12)';
    }
    if (descripcion !== undefined && descripcion !== null) {
        if (typeof descripcion !== 'string') return 'La descripción debe ser un texto';
        if (descripcion.trim().length > 250) return 'La descripción no puede superar los 250 caracteres';
    }
    if (anio !== undefined && anio !== null && anio !== '') {
        const anioNumero = Number(anio);
        const anioMaximo = new Date().getFullYear() + 1;
        if (!Number.isInteger(anioNumero)) return 'El año debe ser un número entero';
        if (anioNumero < ANIO_MINIMO || anioNumero > anioMaximo) return `El año debe estar entre ${ANIO_MINIMO} y ${anioMaximo}`;
    }
    return null;
};

exports.buscarMaquinaria = async (req, res) => {
    try {
        const { busqueda, id_proveedor, estado } = req.query;
        let query = `
            SELECT m.id_maquinaria, m.id_proveedor, m.id_categoria, m.marca, m.modelo, m.anio, m.patente, m.descripcion, m.precio_dia, m.foto, m.estado
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
        if (condiciones.length > 0) query += ' WHERE ' + condiciones.join(' AND ');
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

exports.obtenerFotosMaquinaria = async (req, res) => {
    try {
        const { id } = req.params;

        const [fotos] = await db.execute(
            'SELECT id_foto, ruta_foto FROM maquinaria_fotos WHERE id_maquinaria = ? ORDER BY id_foto',
            [id]
        );

        // Compatibilidad: las máquinas antiguas solo tienen la columna foto
        if (fotos.length === 0) {
            const [maquina] = await db.execute('SELECT foto FROM maquinaria WHERE id_maquinaria = ?', [id]);
            if (maquina.length === 0) {
                return res.status(404).json({ error: 'Maquinaria no encontrada' });
            }
            if (maquina[0].foto) {
                return res.status(200).json([{ id_foto: null, ruta_foto: maquina[0].foto }]);
            }
        }

        res.status(200).json(fotos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las fotos' });
    }
};

exports.crearMaquinaria = async (req, res) => {
    try {
        const { id_proveedor, id_categoria, marca, modelo, anio, patente, precio_dia, descripcion } = req.body;

        if (!id_proveedor || !id_categoria || !marca || !modelo || !precio_dia) {
            descartarArchivosSubidos(req);
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        const errorValidacion = validarDatosMaquinaria({ marca, modelo, anio, patente, descripcion });
        if (errorValidacion) {
            descartarArchivosSubidos(req);
            return res.status(400).json({ error: errorValidacion });
        }

        if (Number(precio_dia) <= 0) {
            descartarArchivosSubidos(req);
            return res.status(400).json({ error: 'El precio por día debe ser mayor a cero' });
        }

        const [proveedor] = await db.execute('SELECT id_proveedor FROM proveedor WHERE id_proveedor = ?', [id_proveedor]);
        if (proveedor.length === 0) {
            descartarArchivosSubidos(req);
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        const [categoria] = await db.execute('SELECT id_categoria FROM categoria WHERE id_categoria = ?', [id_categoria]);
        if (categoria.length === 0) {
            descartarArchivosSubidos(req);
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        // Guardamos la primera foto como principal
        const rutasFotos = (req.files || []).map(archivo => `/uploads/${archivo.filename}`);
        const rutaFotoPrincipal = rutasFotos.length > 0 ? rutasFotos[0] : null;

        const query = `
            INSERT INTO maquinaria
            (id_proveedor, id_categoria, marca, modelo, anio, patente, precio_dia, descripcion, foto, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Disponible')
        `;

        // Transacción: la máquina y sus fotos se guardan juntas o no se guarda nada
        const conexion = await db.getConnection();
        let idMaquinaria;
        try {
            await conexion.beginTransaction();

            const [resultado] = await conexion.execute(query, [
                id_proveedor, id_categoria, marca, modelo, anio || null, patente || null, precio_dia, descripcion || null, rutaFotoPrincipal
            ]);

            idMaquinaria = resultado.insertId;

            for (const ruta of rutasFotos) {
                await conexion.execute(
                    'INSERT INTO maquinaria_fotos (id_maquinaria, ruta_foto) VALUES (?, ?)',
                    [idMaquinaria, ruta]
                );
            }

            await conexion.commit();
        } catch (error) {
            await conexion.rollback();
            throw error;
        } finally {
            conexion.release();
        }

        res.status(201).json({
            mensaje: 'Maquinaria registrada exitosamente',
            id_maquinaria: idMaquinaria,
            foto: rutaFotoPrincipal,
            fotos: rutasFotos
        });
    } catch (error) {
        console.error(error);
        descartarArchivosSubidos(req);
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
        if (errorValidacion) return res.status(400).json({ error: errorValidacion });

        if (precio_dia !== undefined && Number(precio_dia) <= 0) {
            return res.status(400).json({ error: 'El precio por día debe ser mayor a cero' });
        }

        const [actual] = await db.execute('SELECT * FROM maquinaria WHERE id_maquinaria = ?', [id]);
        if (actual.length === 0) return res.status(404).json({ error: 'Maquinaria no encontrada' });

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
        const { id_proveedor } = req.query;

        if (!id_proveedor) return res.status(400).json({ error: 'No se especificó el proveedor' });

        const [existe] = await db.execute('SELECT id_proveedor, foto FROM maquinaria WHERE id_maquinaria = ?', [id]);
        if (existe.length === 0) return res.status(404).json({ error: 'Maquinaria no encontrada' });

        if (Number(existe[0].id_proveedor) !== Number(id_proveedor)) {
            return res.status(403).json({ error: 'Acceso denegado: No puedes eliminar una máquina que no te pertenece.' });
        }

        // Recolectamos las rutas antes del DELETE (las filas de maquinaria_fotos se borran en cascada)
        const [fotos] = await db.execute('SELECT ruta_foto FROM maquinaria_fotos WHERE id_maquinaria = ?', [id]);

        await db.execute('DELETE FROM maquinaria WHERE id_maquinaria = ?', [id]);

        // Borramos también los archivos físicos de uploads/
        const carpetaUploads = path.join(__dirname, '..', 'uploads');
        for (const { ruta_foto } of fotos) {
            const nombreArchivo = path.basename(ruta_foto);
            const rutaFisica = path.join(carpetaUploads, nombreArchivo);
            // Solo dentro de uploads/: evita borrar cualquier cosa si la ruta viene manipulada
            if (path.dirname(rutaFisica) === carpetaUploads && fs.existsSync(rutaFisica)) {
                fs.unlink(rutaFisica, () => {});
            }
        }

        res.status(200).json({ mensaje: 'Maquinaria eliminada exitosamente' });
    } catch (error) {
        console.error(error);
        if (error && error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ error: 'No se puede eliminar: la maquinaria tiene reservas asociadas' });
        }
        res.status(500).json({ error: 'Error interno al eliminar maquinaria' });
    }
};