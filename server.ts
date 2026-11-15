/**
 * Servidor de desarrollo de AgroRent (React + Vite sobre el backend real).
 *
 * - Reutiliza los controladores y routers CommonJS que ya existen en backend/.
 * - Expone la API en /api/... y los archivos subidos en /uploads/...
 * - Sirve la app de React con Vite en modo middleware.
 * - Adapta las respuestas de autenticación al contrato que consume src/App.tsx.
 *
 * Ejecutar con: npm run dev   (equivalente a `tsx server.ts`)
 */
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_BACKEND = path.join(__dirname, 'backend');

// backend/config/db.js lee process.env al importarse: el .env del backend se carga
// primero para que el pool de MySQL tenga host/usuario/password/base.
dotenv.config({ path: path.join(RUTA_BACKEND, '.env') });

// require desde este archivo: así se cargan los CommonJS del backend tal cual están,
// y sus dependencias (mysql2, multer, bcryptjs) se resuelven desde backend/node_modules.
const requireBackend = createRequire(import.meta.url);
const authController = requireBackend('./backend/controllers/authController');
const maquinariaRoutes = requireBackend('./backend/routes/maquinariaRoutes');
const reservaRoutes = requireBackend('./backend/routes/reservaRoutes');
const adminRoutes = requireBackend('./backend/routes/adminRoutes');

// ---------------------------------------------------------------- roles / token

type Rol = 'productor' | 'propietario' | 'admin';

// usuario.id_rol en MySQL: 1 = Productor, 2 = Proveedor, 3 = Administrador.
const ROLES_POR_ID: Record<number, Rol> = {
  1: 'productor',
  2: 'propietario',
  3: 'admin',
};

const IDS_POR_ROL: Record<string, number> = {
  productor: 1,
  propietario: 2,
  admin: 3,
};

/**
 * Token de sesión de desarrollo (payload en base64url, mismo formato que usaba el
 * prototipo de AI Studio). NO es un JWT firmado: el backend todavía no emite JWT,
 * así que este token solo sirve para que el frontend tenga una sesión que mostrar.
 */
function crearToken(usuario: { id: number; nombre: string; email: string; rol: number }): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: usuario.id,
      email: usuario.email,
      role: ROLES_POR_ID[Number(usuario.rol)] ?? 'productor',
      name: usuario.nombre,
      iat: Date.now(),
    })
  ).toString('base64url');

  return `agro.${payload}.dev`;
}

// ------------------------------------------------------- adaptación de la API

/**
 * El formulario de React envía { name, email, password, role, rut } y el controlador
 * real espera { nombre, email, password, rol, rut, telefono }. Aquí se traduce sin
 * tocar el controlador (que es el que valida RUT, email duplicado y largo de campos).
 */
function normalizarCuerpoAuth(req: Request, _res: Response, next: NextFunction) {
  const cuerpo = req.body ?? {};

  if (typeof cuerpo.name === 'string' || typeof cuerpo.role === 'string') {
    const rol =
      typeof cuerpo.role === 'string' ? IDS_POR_ROL[cuerpo.role] : Number(cuerpo.rol);

    req.body = {
      ...cuerpo,
      nombre: cuerpo.nombre ?? cuerpo.name,
      rol: Number.isInteger(rol) ? rol : cuerpo.rol,
      // mysql2 no acepta undefined como parámetro: null explícito en campos opcionales.
      telefono: cuerpo.telefono ?? null,
      rut: cuerpo.rut,
    };
  }

  next();
}

/**
 * Traduce la respuesta del backend al contrato que espera src/App.tsx:
 *   login real    -> { mensaje, usuario: { id, nombre, email, rol, id_proveedor, id_productor } }
 *   registro real -> { mensaje, id_usuario }
 *   lo que usa React -> { token, role, user: { id, name, email, role } }
 * Los errores (400/401/403/500) pasan intactos porque App.tsx lee `error`.
 */
function mapearRespuestaAuth(req: Request, res: Response, next: NextFunction) {
  let codigo = 200;

  const statusOriginal = res.status.bind(res);
  const jsonOriginal = res.json.bind(res);

  res.status = ((code: number) => {
    codigo = code;
    return statusOriginal(code);
  }) as Response['status'];

  res.json = ((cuerpo: unknown) => {
    const datos = cuerpo as Record<string, any> | null;

    if (codigo >= 400 || !datos || typeof datos !== 'object') {
      return jsonOriginal(cuerpo);
    }

    // LOGIN
    if (datos.usuario) {
      const u = datos.usuario;
      const role = ROLES_POR_ID[Number(u.rol)] ?? 'productor';

      return jsonOriginal({
        token: crearToken(u),
        role,
        user: {
          id: u.id,
          name: u.nombre,
          email: u.email,
          role,
          id_proveedor: u.id_proveedor ?? null,
          id_productor: u.id_productor ?? null,
        },
        mensaje: datos.mensaje,
      });
    }

    // REGISTRO (el controlador no devuelve sesión, solo el id creado)
    if (datos.id_usuario) {
      const { nombre, email, rol } = req.body ?? {};
      const role = ROLES_POR_ID[Number(rol)] ?? 'productor';

      return jsonOriginal({
        token: crearToken({
          id: Number(datos.id_usuario),
          nombre,
          email,
          rol: Number(rol),
        }),
        role,
        user: {
          id: Number(datos.id_usuario),
          name: nombre,
          email,
          role,
          // El registro no devuelve los ids de perfil: se obtienen al iniciar sesión.
          id_proveedor: null,
          id_productor: null,
        },
        mensaje: datos.mensaje,
      });
    }

    return jsonOriginal(cuerpo);
  }) as Response['json'];

  next();
}

// ------------------------------------------------------------------ servidor

async function iniciarServidor() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const esProduccion = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Fotos de las máquinas (multer guarda en backend/uploads).
  app.use('/uploads', express.static(path.join(RUTA_BACKEND, 'uploads')));

  // --- Autenticación: controladores reales con el mapeo de contrato ---
  app.post(
    '/api/auth/login',
    normalizarCuerpoAuth,
    mapearRespuestaAuth,
    authController.loginUsuario
  );
  app.post(
    '/api/auth/register',
    normalizarCuerpoAuth,
    mapearRespuestaAuth,
    authController.registrarUsuario
  );
  // Alias con el nombre que usa el frontend HTML respaldado (_backup_html_frontend).
  app.post(
    '/api/auth/registro',
    normalizarCuerpoAuth,
    mapearRespuestaAuth,
    authController.registrarUsuario
  );

  // --- Rutas reales del backend (maquinaria, reservas, admin) ---
  // Incluye GET /api/maquinaria/buscar y GET /api/maquinaria/fotos/:id.
  app.use('/api/maquinaria', maquinariaRoutes);
  app.use('/api/reservas', reservaRoutes);
  app.use('/api/admin', adminRoutes);

  // 404 en JSON para rutas de API inexistentes (antes de Vite, que responde HTML).
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Ruta de API no encontrada' });
  });

  // --- Frontend ---
  if (esProduccion) {
    const carpetaDist = path.join(__dirname, 'dist');
    app.use(express.static(carpetaDist));
    app.use((_req: Request, res: Response) => {
      res.sendFile(path.join(carpetaDist, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Manejador de errores centralizado (mismo comportamiento que backend/index.js).
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error(err);

    // Si multer alcanzó a escribir archivos antes de fallar, no dejamos huérfanos.
    if (Array.isArray((req as any).files)) {
      (req as any).files.forEach((archivo: { path?: string }) => {
        if (archivo.path && fs.existsSync(archivo.path)) fs.unlinkSync(archivo.path);
      });
    }

    if (err && typeof err.code === 'string' && err.code.startsWith('LIMIT_')) {
      const mensaje =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'La imagen supera el tamaño máximo de 5MB'
          : err.code === 'LIMIT_UNEXPECTED_FILE'
            ? 'Campo de archivo no esperado o demasiados archivos. Usa el campo "fotos" (máximo 5)'
            : 'El archivo enviado no es válido';
      return res.status(400).json({ error: mensaje });
    }

    if (err && typeof err.message === 'string' && err.message.startsWith('Solo se permiten imágenes')) {
      return res.status(400).json({ error: err.message });
    }

    return res.status(500).json({ error: 'Error interno del servidor' });
  });

  app.listen(PORT, () => {
    console.log(`AgroRent (React + Vite) en http://localhost:${PORT}`);
    console.log(`API real del backend montada en /api · fotos en /uploads`);
  });
}

iniciarServidor().catch((error) => {
  console.error('No se pudo iniciar el servidor:', error);
  process.exit(1);
});
