const db = require('../config/db');

exports.obtenerMetricas = async (req, res) => {
    try {
        const [usuarios] = await db.execute('SELECT COUNT(*) as total FROM usuario');
        const [maquinas] = await db.execute('SELECT COUNT(*) as total FROM maquinaria');
        const [reservas] = await db.execute("SELECT COUNT(*) as total FROM reserva WHERE estado = 'Confirmada'");
        
        const ingresosTotales = 1250000; 

        res.status(200).json({
            usuarios_registrados: usuarios[0].total,
            maquinaria_registrada: maquinas[0].total,
            reservas_activas: reservas[0].total,
            ingresos_estimados: ingresosTotales
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al generar los reportes' });
    }
};

exports.suspenderUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('UPDATE usuario SET estado = 0 WHERE id_usuario = ?', [id]);
        res.status(200).json({ mensaje: 'Usuario suspendido correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al suspender al usuario' });
    }
};