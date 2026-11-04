const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const maquinariaRoutes = require('./routes/maquinariaRoutes');
const reservaRoutes = require('./routes/reservaRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/maquinaria', maquinariaRoutes);
app.use('/api/reservas', reservaRoutes);
app.use('/api/admin', adminRoutes);

// 404 en formato JSON para rutas de API inexistentes.
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ruta de API no encontrada' });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Manejador de errores centralizado.
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor de AgroRent corriendo en el puerto ${PORT}`);
});
