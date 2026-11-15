const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const maquinariaRoutes = require('./routes/maquinariaRoutes');
const reservaRoutes = require('./routes/reservaRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// El frontend activo es la app de React (server.ts en la raíz). Esta carpeta es el
// respaldo del frontend HTML original, que se mantiene servible desde este servidor.
app.use(express.static(path.join(__dirname, '../_backup_html_frontend')));
// Hacer pública la carpeta de imágenes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/maquinaria', maquinariaRoutes);
app.use('/api/reservas', reservaRoutes);
app.use('/api/admin', adminRoutes);

// 404 en formato JSON para rutas de API inexistentes.
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ruta de API no encontrada' });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../_backup_html_frontend/index.html'));
});

// Manejador de errores centralizado.
app.use((err, req, res, next) => {
    console.error(err);

    // Si multer ya había escrito archivos antes de fallar, no los dejamos huérfanos.
    if (req.files && Array.isArray(req.files)) {
        req.files.forEach(archivo => { if (archivo.path && fs.existsSync(archivo.path)) fs.unlinkSync(archivo.path); });
    }

    // Errores de subida (multer): son culpa de la petición, no del servidor.
    if (err && typeof err.code === 'string' && err.code.startsWith('LIMIT_')) {
        const mensaje = err.code === 'LIMIT_FILE_SIZE'
            ? 'La imagen supera el tamaño máximo de 5MB'
            : err.code === 'LIMIT_UNEXPECTED_FILE'
                ? 'Campo de archivo no esperado o demasiados archivos. Usa el campo "fotos" (máximo 5)'
                : 'El archivo enviado no es válido';
        return res.status(400).json({ error: mensaje });
    }

    if (err && typeof err.message === 'string' && err.message.startsWith('Solo se permiten imágenes')) {
        return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor de AgroRent corriendo en el puerto ${PORT}`);
});
