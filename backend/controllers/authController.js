const db = require('../config/db');
const bcrypt = require('bcryptjs');

exports.registrarUsuario = async (req, res) => {
    try {
        const { nombre, email, password, telefono, rut, rol } = req.body;

        // Validaciones básicas
        if (!nombre || !email || !password || !rol || !rut) {
            return res.status(400).json({ error: 'Faltan datos obligatorios (incluyendo el RUT)' });
        }

        // Validaciones de longitud y formato (no se puede confiar solo en el HTML)
        const nombreTexto = String(nombre).trim();
        const emailTexto = String(email).trim();
        const rutTexto = String(rut).trim();
        const passwordTexto = String(password);
        const RUT_REGEX = /^[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-?[0-9kK]$/;

        if (nombreTexto.length > 100) {
            return res.status(400).json({ error: 'El nombre no puede superar los 100 caracteres' });
        }

        if (emailTexto.length > 100) {
            return res.status(400).json({ error: 'El correo no puede superar los 100 caracteres' });
        }

        if (rutTexto.length > 12) {
            return res.status(400).json({ error: 'El RUT no puede superar los 12 caracteres' });
        }

        if (!RUT_REGEX.test(rutTexto)) {
            return res.status(400).json({ error: 'El formato del RUT no es válido (Ej: 12.345.678-9)' });
        }

        if (passwordTexto.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }

        // Verificar si el correo ya existe
        const [existeEmail] = await db.query('SELECT * FROM usuario WHERE email = ?', [emailTexto]);
        if (existeEmail.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        // Verificar si el RUT ya existe
        const [existeRut] = await db.query('SELECT * FROM usuario WHERE rut = ?', [rutTexto]);
        if (existeRut.length > 0) {
            return res.status(400).json({ error: 'El RUT ya está registrado' });
        }

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(passwordTexto, salt);

        // Insertar en la tabla usuario
        const [resultado] = await db.query(
            'INSERT INTO usuario (nombre, email, password, telefono, rut, id_rol) VALUES (?, ?, ?, ?, ?, ?)',
            [nombreTexto, emailTexto, passwordHash, telefono, rutTexto, rol]
        );

        const nuevoUsuarioId = resultado.insertId;

        // Insertar en la tabla correspondiente según el rol
        if (Number(rol) === 1) {
            // Es Productor
            await db.query('INSERT INTO productor (id_usuario) VALUES (?)', [nuevoUsuarioId]);
        } else if (Number(rol) === 2) {
            // Es Proveedor (Corregido: ya no le pasamos el RUT aquí)
            await db.query('INSERT INTO proveedor (id_usuario) VALUES (?)', [nuevoUsuarioId]);
        }

        res.status(201).json({ 
            mensaje: 'Usuario registrado exitosamente', 
            id_usuario: nuevoUsuarioId 
        });

    } catch (error) {
        console.error("Error al registrar usuario:", error);
        res.status(500).json({ error: 'Error en el servidor al registrar usuario' });
    }
};

exports.loginUsuario = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Faltan datos obligatorios' });
        }

        // Buscar el usuario por email
        const [usuarios] = await db.query('SELECT * FROM usuario WHERE email = ?', [email]);
        if (usuarios.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const usuario = usuarios[0];

        // Verificar si el usuario está activo
        if (usuario.estado === 0) {
            return res.status(403).json({ error: 'Tu cuenta ha sido suspendida. Contacta al administrador.' });
        }

        // Comparar la contraseña encriptada
        const passwordCorrecta = await bcrypt.compare(password, usuario.password);
        if (!passwordCorrecta) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Buscar el id_proveedor o id_productor si aplica
        let id_proveedor = null;
        let id_productor = null;

        if (usuario.id_rol === 2) {
            const [prov] = await db.query('SELECT id_proveedor FROM proveedor WHERE id_usuario = ?', [usuario.id_usuario]);
            if (prov.length > 0) id_proveedor = prov[0].id_proveedor;
        } else if (usuario.id_rol === 1) {
            const [prod] = await db.query('SELECT id_productor FROM productor WHERE id_usuario = ?', [usuario.id_usuario]);
            if (prod.length > 0) id_productor = prod[0].id_productor;
        }

        res.json({
            mensaje: 'Login exitoso',
            usuario: {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.id_rol,
                id_proveedor: id_proveedor,
                id_productor: id_productor
            }
        });

    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        res.status(500).json({ error: 'Error en el servidor al iniciar sesión' });
    }
};