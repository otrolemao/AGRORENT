const db = require('../config/db');
const bcrypt = require('bcryptjs');

// 1. REGISTRO DE USUARIO
const registrarUsuario = async (req, res) => {
    try {
        const { nombre, email, password, telefono, rol } = req.body;

        // Validar que vengan los datos
        if (!nombre || !email || !password || !rol) {
            return res.status(400).json({ error: 'Faltan datos obligatorios' });
        }

        // Verificar si el email ya existe
        const [existe] = await db.query('SELECT * FROM usuario WHERE email = ?', [email]);
        if (existe.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insertar en la base de datos
        // Nota: Asumimos que el ID del rol 1 es Productor y el 2 es Proveedor (según el script SQL)
        const [resultado] = await db.query(
            'INSERT INTO usuario (nombre, email, password, telefono, id_rol) VALUES (?, ?, ?, ?, ?)',
            [nombre, email, passwordHash, telefono, rol]
        );

        res.status(201).json({ 
            mensaje: 'Usuario registrado exitosamente', 
            id_usuario: resultado.insertId 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al registrar usuario' });
    }
};

// 2. LOGIN DE USUARIO
const loginUsuario = async (req, res) => {
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

        // Comparar la contraseña encriptada
        const passwordCorrecta = await bcrypt.compare(password, usuario.password);
        if (!passwordCorrecta) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Aquí después agregaremos el Token JWT, por ahora solo devolvemos éxito
        res.json({
            mensaje: 'Login exitoso',
            usuario: {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.id_rol
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor al iniciar sesión' });
    }
};

module.exports = { registrarUsuario, loginUsuario };