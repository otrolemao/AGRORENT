const mysql = require('mysql2');
require('dotenv').config();

// Crear la conexión usando las variables del archivo .env
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Convertir el pool a promesas para poder usar async/await
const promisePool = pool.promise();

// Probar la conexión
promisePool.query('SELECT 1 + 1 AS solution')
    .then(([rows]) => {
        console.log(' Conectado exitosamente a la base de datos MySQL (AgroRent)');
    })
    .catch((err) => {
        console.error(' Error al conectar a la base de datos:', err.message);
    });

module.exports = promisePool;