const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ruta absoluta: si se usa 'uploads/' relativo, la foto termina en el directorio desde
// donde se inició el servidor (por ejemplo la raíz del repo) y no en backend/uploads,
// que es la carpeta que se publica con express.static.
const CARPETA_UPLOADS = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(CARPETA_UPLOADS, { recursive: true });

// Configuramos dónde y cómo se guardan los archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, CARPETA_UPLOADS);
    },
    filename: function (req, file, cb) {
        // Nombre único y seguro: fecha + nombre original limpio (sin rutas ni caracteres raros)
        const extension = path.extname(file.originalname).toLowerCase();
        const nombreBase = path.basename(file.originalname, path.extname(file.originalname))
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .slice(0, 40);
        const nombreUnico = `${Date.now()}-${nombreBase || 'foto'}${extension}`;
        cb(null, nombreUnico);
    }
});

// Filtro para aceptar solo imágenes
const fileFilter = (req, file, cb) => {
    const tiposPermitidos = /jpeg|jpg|png|webp/;
    const extname = tiposPermitidos.test(path.extname(file.originalname).toLowerCase());
    const mimetype = tiposPermitidos.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, webp)'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB por foto
    fileFilter: fileFilter
});

module.exports = upload;
