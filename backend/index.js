const express = require('express');
const app = express();

// Importar rutas existentes y nuevas
const authRoutes = require('./routes/authRoutes');
const maquinariaRoutes = require('./routes/maquinariaRoutes');
const reservaRoutes = require('./routes/reservaRoutes');

// Middlewares
app.use(express.json());

// Usar rutas
app.use('/api/auth', authRoutes);
app.use('/api/maquinaria', maquinariaRoutes); 
app.use('/api/reservas', reservaRoutes);      

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de AgroRent corriendo en el puerto ${PORT}`);
});