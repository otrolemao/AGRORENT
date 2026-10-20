const db = require('../config/db');
const bcrypt = require('bcryptjs');

const registrarUsuario = async (req, res) => {
    try {
        const { nombre, email, password, telefono, rol } = req.body;

        if (!nombre || !email || !password || !rol) {
            return res.status(400).json({ error: 'Faltan datos obligatorios' });
        }

        const [existe] = await db.query('SELECT * FROM usuario WHERE email = ?', [email]);
        if (existe.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

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

const loginUsuario = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Faltan datos obligatorios' });
        }

        const [usuarios] = await db.query('SELECT * FROM usuario WHERE email = ?', [email]);
        if (usuarios.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const usuario = usuarios[0];

        const passwordCorrecta = await bcrypt.compare(password, usuario.password);
        if (!passwordCorrecta) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

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