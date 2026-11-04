const db = require('../config/db');

exports.obtenerMetricas = async (req, res) => {
    try {
        const [usuarios] = await db.execute('SELECT COUNT(*) as total FROM usuario');
        const [maquinas] = await db.execute('SELECT COUNT(*) as total FROM maquinaria');
        const [reservas] = await db.execute("SELECT COUNT(*) as total FROM reserva WHERE estado = 'Confirmada'");
        // Ingreso real calculado desde las reservas confirmadas (antes estaba fijo en 1.250.000).
        const [ingresos] = await db.execute(
            "SELECT COALESCE(SUM(costo_estimado), 0) AS total FROM reserva WHERE estado = 'Confirmada'"
        );

        res.status(200).json({
            usuarios_registrados: usuarios[0].total,
            maquinaria_registrada: maquinas[0].total,
            reservas_activas: reservas[0].total,
            ingresos_estimados: Number(ingresos[0].total),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al generar los reportes' });
    }
};

exports.suspenderUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        const [existe] = await db.execute('SELECT id_usuario, estado FROM usuario WHERE id_usuario = ?', [id]);
        if (existe.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const nuevoEstado = Number(existe[0].estado) === 1 ? 0 : 1;
        await db.execute('UPDATE usuario SET estado = ? WHERE id_usuario = ?', [nuevoEstado, id]);

        res.status(200).json({
            mensaje: nuevoEstado === 0 ? 'Usuario suspendido' : 'Usuario reactivado',
            id_usuario: Number(id),
            estado: nuevoEstado,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el estado del usuario' });
    }
};
