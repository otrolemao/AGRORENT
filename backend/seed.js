const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// __dirname = carpeta backend, así que no hay que repetir 'backend' en las rutas
const CARPETA_SEED = path.join(__dirname, 'seed_images');
const CARPETA_UPLOADS = path.join(__dirname, 'uploads');

// Nombres EXACTOS de tus archivos en seed_images/
const imagenes = [
    'tractor1.jpg',
    'tractor2.jpg',
    'tractor3.jpg',
    'tractor4.jpg',
    'tractor5.jpg',
    'tractor6.jpg',
    'tractor7.jpg',
    'tractor9.jpg',
    'tractor10.jpg',
    'tractor1.jpg' // Repetimos una para tener 10
];

const marcas = ['John Deere', 'Vaderstad', 'Claas', 'Massey Ferguson', 'Jacto', 'Baldan', 'New Holland', 'Gaspardo', 'Case IH', 'Rome'];
const modelos = ['6120M', 'Rapid 400S', 'Lexion 5300', 'MF 4275', 'Uniport 2500', 'Rastra 32', 'T7.260', 'Manta 8', 'Axial-Flow 250', 'Rastra 24'];
const categorias = [1, 2, 3, 1, 5, 4, 1, 2, 3, 4];
const precios = [150000, 250000, 500000, 180000, 200000, 80000, 220000, 300000, 550000, 90000];
const descripciones = [
    'Tractor con 120 HP, ideal para labores de arrastre.',
    'Sembradora de siembra directa de alta precisión.',
    'Cosechadora de alto rendimiento para grandes extensiones.',
    'Tractor versátil y potente para todo tipo de terreno.',
    'Pulverizadora de arrastre con gran capacidad de tanque.',
    'Rastra pesada para preparación de suelos duros.',
    'Tractor con cabina climatizada y alta eficiencia.',
    'Sembradora neumática para todo tipo de semillas.',
    'Cosechadora con sistema de trilla avanzado.',
    'Rastra liviana para acabado de suelos.'
];

async function seed() {
    // 1. Validar TODO antes de tocar la base de datos: si falta una imagen,
    //    el script se detiene sin borrar nada.
    const faltantes = imagenes.filter(nombre => !fs.existsSync(path.join(CARPETA_SEED, nombre)));
    if (faltantes.length > 0) {
        console.error(`❌ Faltan imágenes en ${CARPETA_SEED}:`);
        faltantes.forEach(nombre => console.error(`   - ${nombre}`));
        console.error('No se modificó la base de datos.');
        process.exitCode = 1;
        return;
    }

    // 2. Asegurar que exista la carpeta de destino
    if (!fs.existsSync(CARPETA_UPLOADS)) {
        fs.mkdirSync(CARPETA_UPLOADS, { recursive: true });
        console.log(`📁 Carpeta creada: ${CARPETA_UPLOADS}`);
    }

    // 3. Copiar las imágenes a uploads/ con un nombre único
    const archivosCopiados = [];
    const rutasFotos = [];

    for (let i = 0; i < imagenes.length; i++) {
        const imagenNombre = imagenes[i];
        const rutaOrigen = path.join(CARPETA_SEED, imagenNombre);
        const nombreFinal = `${Date.now()}-${i + 1}-${imagenNombre}`;
        const rutaDestino = path.join(CARPETA_UPLOADS, nombreFinal);

        fs.copyFileSync(rutaOrigen, rutaDestino);
        archivosCopiados.push(rutaDestino);
        rutasFotos.push(`/uploads/${nombreFinal}`);
    }
    console.log(`🖼️  ${archivosCopiados.length} imágenes copiadas a ${CARPETA_UPLOADS}`);

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'agrorent'
    });

    try {
        console.log('🧹 Borrando máquinas viejas y sus fotos...');
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('TRUNCATE TABLE maquinaria_fotos');
        await connection.query('TRUNCATE TABLE maquinaria');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('🚜 Insertando nuevas máquinas...');
        await connection.beginTransaction();

        const idProveedor = 1; // Jorge

        for (let i = 0; i < imagenes.length; i++) {
            const rutaFoto = rutasFotos[i];

            const [resultado] = await connection.query(
                `INSERT INTO maquinaria (id_proveedor, id_categoria, marca, modelo, anio, patente, precio_dia, descripcion, foto, estado)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Disponible')`,
                [idProveedor, categorias[i], marcas[i], modelos[i], 2018 + i, `SEED-${String(i + 1).padStart(2, '0')}`, precios[i], descripciones[i], rutaFoto]
            );

            await connection.query(
                'INSERT INTO maquinaria_fotos (id_maquinaria, ruta_foto) VALUES (?, ?)',
                [resultado.insertId, rutaFoto]
            );
        }

        await connection.commit();
        console.log(`✅ ¡Éxito! Se insertaron ${imagenes.length} máquinas con sus fotos.`);
    } catch (error) {
        await connection.query('ROLLBACK').catch(() => {});
        // Si falló la inserción, no dejamos las imágenes copiadas
        archivosCopiados.forEach(archivo => { if (fs.existsSync(archivo)) fs.unlinkSync(archivo); });
        console.error('❌ Error al insertar:', error.message);
        process.exitCode = 1;
    } finally {
        await connection.end();
    }
}

seed();
