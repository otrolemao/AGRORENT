const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Roles que un usuario puede elegir al registrarse por su cuenta.
// 1 = Productor, 2 = Proveedor. El rol 3 (Administrador) NO es público.
const ROLES_PUBLICOS = [1, 2];

const RUT_REGEX = /^[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-?[0-9kK]$/;

exports.registrarUsuario = async (req, res) => {
    const { nombre, email, password, telefono, rol, rut } = req.body;

    if (!nombre || !email || !password || !rol) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const rolNum = Number(rol);
    if (!ROLES_PUBLICOS.includes(rolNum)) {
        return res.status(400).json({
            error: 'Rol inválido. Solo puedes registrarte como productor o proveedor.',
        });
    }

    if (String(password).length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    if (!rut || !RUT_REGEX.test(String(rut).trim())) {
        return res.status(400).json({ error: 'El RUT es obligatorio y debe tener un formato válido (ej: 12.345.678-9)' });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [existeEmail] = await conn.query('SELECT id_usuario FROM usuario WHERE email = ?', [email]);
        if (existeEmail.length > 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const [resultado] = await conn.query(
            'INSERT INTO usuario (nombre, email, password, telefono, id_rol) VALUES (?, ?, ?, ?, ?)',
            [nombre, email, passwordHash, telefono || null, rolNum]
        );
        const idUsuario = resultado.insertId;

        // Cada usuario necesita su perfil para poder operar (el panel usa id_proveedor).
        let idPerfil;
        if (rolNum === 2) {
            const [perfil] = await conn.query(
                'INSERT INTO proveedor (id_usuario, rut) VALUES (?, ?)',
                [idUsuario, String(rut).trim()]
            );
            idPerfil = perfil.insertId;
        } else {
            const [perfil] = await conn.query(
                'INSERT INTO productor (id_usuario, rut) VALUES (?, ?)',
                [idUsuario, String(rut).trim()]
            );
            idPerfil = perfil.insertId;
        }

        await conn.commit();

        res.status(201).json({
            mensaje: 'Usuario registrado exitosamente',
            id_usuario: idUsuario,
            id_perfil: idPerfil,
            rol: rolNum,
        });
    } catch (error) {
        await conn.rollback();
        if (error && error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El correo o el RUT ya están registrados' });
        }
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al registrar usuario' });
    } finally {
        conn.release();
    }
};

exports.loginUsuario = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Faltan datos obligatorios' });
        }

        const [usuarios] = await db.query(
            `SELECT u.id_usuario, u.nombre, u.email, u.password, u.id_rol, u.estado,
                    p.id_proveedor, pr.id_productor
             FROM usuario u
             LEFT JOIN proveedor p ON p.id_usuario = u.id_usuario
             LEFT JOIN productor pr ON pr.id_usuario = u.id_usuario
             WHERE u.email = ?`,
            [email]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const usuario = usuarios[0];
        const passwordCorrecta = await bcrypt.compare(password, usuario.password);

        if (!passwordCorrecta) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        if (Number(usuario.estado) === 0) {
            return res.status(403).json({ error: 'Tu cuenta está suspendida. Contacta al administrador.' });
        }

        res.json({
            mensaje: 'Login exitoso',
            usuario: {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.id_rol,
                id_proveedor: usuario.id_proveedor,
                id_productor: usuario.id_productor,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al iniciar sesión' });
    }
};
