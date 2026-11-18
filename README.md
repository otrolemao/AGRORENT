# AgroRent 🚜

Plataforma web para el arriendo de maquinaria agrícola en la zona sur de Chile.

> **Stack actual:** React 19 + TypeScript + Vite 8 · Node.js + Express 5 · MySQL 8

---

## 📋 Descripción

AgroRent conecta a **productores agrícolas** que necesitan maquinaria con **propietarios** que la tienen disponible. La aplicación permite buscar equipos, revisar su ficha técnica y fotografías, solicitar una reserva por fechas y pagar una seña del 20 %. Los propietarios publican sus máquinas y gestionan las solicitudes recibidas; los administradores supervisan métricas y usuarios desde un panel propio.

## 🎯 Problemática

El arriendo de maquinaria agrícola se gestiona de forma informal (llamadas, WhatsApp, cuadernos), lo que genera:

- Incertidumbre sobre la disponibilidad real de los equipos.
- Cruces de reservas y dobles compromisos.
- Pérdida de oportunidades de siembra o cosecha.
- Falta de transparencia en precios y condiciones.

## 💡 Solución

Una plataforma única con frontend, API y base de datos que centraliza la oferta y la demanda, valida las reservas contra la disponibilidad real y entrega paneles distintos según el rol del usuario.

## 👥 Integrantes

- Martín Jara
- Luis Troncoso
- Joel Tejeda
- Esteban Vargas
- Jorge Martínez

## 🛠️ Stack tecnológico

| Capa | Tecnologías |
| --- | --- |
| **Frontend** | React 19, TypeScript, Vite 8, `lucide-react`, CSS propio (`src/index.css`) |
| **Backend** | Node.js 22, Express 5, `mysql2/promise`, `bcryptjs`, `multer`, `dotenv`, `cors` |
| **Base de datos** | MySQL 8 (`agrorent`, 16 tablas) |
| **Ejecución** | `tsx` (servidor TypeScript de desarrollo/producción) |
| **Control de versiones** | Git + GitHub |

> **Nota de diseño:** Tailwind CSS v4 está instalado y registrado como plugin en `vite.config.ts`, pero la interfaz actual se construye con el CSS propio de `src/index.css` (tema oscuro con acento lima `#e4f222`). No hay directivas `@import "tailwindcss"` en los estilos.
>
> **Nota de seguridad:** `jsonwebtoken` figura en `backend/package.json`, pero **no se usa**: no hay emisión ni verificación de JWT en el código.

## 🏗️ Arquitectura

El punto de entrada es `server.ts` (raíz del proyecto). Este servidor:

1. Carga `backend/.env` para que el pool de MySQL tenga las credenciales.
2. Reutiliza los controladores y routers CommonJS reales de `backend/` mediante `createRequire`.
3. Expone la API en `/api/*` y las fotos en `/uploads/*`.
4. Normaliza el contrato de autenticación para el frontend React (`{ token, role, user }`).
5. Sirve la app con **Vite en modo middleware** durante el desarrollo y desde `dist/` cuando `NODE_ENV=production`.

```text
Navegador
   │
   ▼
server.ts  ──►  Vite (dev) / dist (producción)
   │
   ├──►  /api/auth        → backend/controllers/authController.js
   ├──►  /api/maquinaria  → backend/routes/maquinariaRoutes.js
   ├──►  /api/reservas    → backend/routes/reservaRoutes.js
   ├──►  /api/admin       → backend/routes/adminRoutes.js
   └──►  /uploads         → backend/uploads/
                              │
                              ▼
                        MySQL 8 (agrorent)
```

El servidor antiguo `backend/index.js` se conserva como **modo legacy**: sirve el frontend HTML de respaldo desde `_backup_html_frontend/` y la misma API (sin el alias `/api/auth/register` ni el mapeo de respuestas de `server.ts`).

## 📁 Estructura del proyecto

```text
AGRORENT/
├── src/                         Aplicación React (TypeScript)
│   ├── App.tsx                  Vistas de productor, propietario y admin + modales
│   ├── main.tsx                 Punto de entrada de React
│   ├── index.css                Sistema de diseño y estilos globales
│   └── assets/images/           Imágenes del hero
├── index.html                   HTML base de Vite
├── server.ts                    Servidor Express + Vite (API real y frontend)
├── vite.config.ts               Plugins React y Tailwind, alias @
├── tsconfig.json                Configuración TypeScript
├── package.json                 Scripts y dependencias del frontend
│
├── backend/                     API REST en CommonJS
│   ├── config/db.js             Pool MySQL con promesas
│   ├── controllers/             auth, maquinaria, reservas, admin
│   ├── middlewares/             uploadMiddleware.js (multer)
│   ├── routes/                  auth, maquinaria, reservas, admin
│   ├── uploads/                 Fotos subidas (ignoradas por Git salvo .gitkeep)
│   ├── seed_images/             Imágenes usadas por seed.js
│   ├── seed.js                  Carga 10 máquinas de prueba con fotos
│   ├── index.js                 Servidor legacy (sirve _backup_html_frontend)
│   ├── .env.example             Plantilla de variables de entorno
│   └── package.json             Dependencias propias del backend
│
├── database/
│   └── agrorent.sql             16 tablas + datos de prueba (bcrypt)
├── docs/
│   └── Reporte-Avance-Sprint3.docx
├── Scrum-Reuniones/             Actas de reunión (PDF)
├── _backup_html_frontend/       Frontend HTML/CSS/JS anterior (respaldo)
├── Agro-Rent INGENERIA INFORMATICA.docx
└── dist/                        Build de Vite (no versionado)
```

## 🚀 Puesta en marcha

### Requisitos previos

- **Node.js 22 o superior** y npm.
- **MySQL 8** en ejecución (servicio `MySQL80` en Windows).
- Git Bash, PowerShell o CMD.

### 1. Crear la base de datos

Desde la raíz `AGRORENT/`:

```bash
mysql -u root -p < database/agrorent.sql
```

> ⚠️ El script comienza con `DROP DATABASE IF EXISTS agrorent`, por lo que **elimina y recrea** la base de datos completa. No lo ejecutes sobre datos que quieras conservar.

### 2. Configurar las variables de entorno

```bash
cd backend
cp .env.example .env
```

Edita `backend/.env` con tus credenciales:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña_de_mysql
DB_NAME=agrorent
```

### 3. Instalar dependencias

El proyecto tiene **dos** `package.json`: la raíz (React/Vite) y `backend/` (API). Hay que instalar ambos:

```bash
# Desde la raíz AGRORENT/
npm install

cd backend
npm install
cd ..
```

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abre <http://localhost:3000/>. Un solo proceso sirve la app React, la API y las imágenes.

### 5. Build de producción (opcional)

```bash
npm run build
```

En PowerShell:

```powershell
$env:NODE_ENV="production"; npm start
```

En Bash:

```bash
NODE_ENV=production npm start
```

### Modo legacy (frontend HTML de respaldo)

```bash
cd backend
npm start
```

Sirve `_backup_html_frontend/` en <http://localhost:3000/>. No lo ejecutes al mismo tiempo que `npm run dev`, porque ambos ocupan el puerto 3000.

## 🔑 Usuarios de prueba

Todos usan la contraseña **`agrorent123`**. Los hashes están guardados con bcrypt en `database/agrorent.sql`.

| Correo | Rol | Perfil |
| --- | --- | --- |
| `admin@agrorent.cl` | Administrador | — |
| `jorge@agroma.cl` | Proveedor | `id_proveedor = 1` (AgroMaq Osorno) |
| `maria@productor.cl` | Productor | `id_productor = 1` |
| `pedro@productor.cl` | Productor | `id_productor = 2` |

> Los RUT de estos usuarios de ejemplo (`11.111.111-1`, `22.222.222-2`, etc.) fueron cargados directamente por el script. **El formulario de registro los rechaza** porque, aunque su dígito verificador calza con el módulo 11, el frontend bloquea los RUT con todos los dígitos del cuerpo iguales (regla anti-ficticios). Sirven para iniciar sesión, no para volver a registrarlos.

### Datos de prueba adicionales

El script incluye 3 máquinas, 2 reservas, 1 renta, 1 pago, 2 notificaciones y 1 valoración. Para cargar un catálogo de 10 máquinas con fotos reales:

```bash
cd backend
node seed.js
```

> `seed.js` vacía `maquinaria` y `maquinaria_fotos` antes de insertar. Las reservas existentes pueden quedar apuntando a los nuevos IDs de máquina.

## 🔌 API REST

### Autenticación

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/auth/login` | Inicia sesión y devuelve `{ token, role, user }` |
| POST | `/api/auth/register` | Registro (contrato React; traduce `name`/`role`) |
| POST | `/api/auth/registro` | Alias del registro usado por el frontend HTML antiguo |

**Body de registro:** `{ name, email, password, role, rut }`, donde `role` es `productor` o `propietario`.

### Maquinaria

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/maquinaria/buscar` | Catálogo. Filtros: `busqueda`, `id_proveedor`, `estado` |
| GET | `/api/maquinaria/categorias` | Lista de categorías |
| GET | `/api/maquinaria/fotos/:id` | Galería de fotos de una máquina |
| GET | `/api/maquinaria/:id` | Detalle de una máquina |
| POST | `/api/maquinaria` | Publica una máquina (`multipart/form-data`) |
| PUT | `/api/maquinaria/:id?id_proveedor=N` | Edita datos y galería de fotos |
| DELETE | `/api/maquinaria/:id?id_proveedor=N` | Elimina la máquina y sus archivos |

- Sin filtros, `buscar` devuelve solo máquinas en estado `Disponible`.
- `POST` y `PUT` aceptan hasta **5 fotos** en el campo `fotos`.
- `PUT` admite `fotosAEliminar` como IDs, rutas, JSON (`[3,7]`) o lista separada por comas.
- **No existe** `GET /api/maquinaria` (sin sufijo): responde 404. El catálogo usa `/buscar`.

### Reservas y valoraciones

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/reservas` | Crea una reserva y registra la seña del 20 % |
| GET | `/api/reservas?id_productor=N` | Reservas de un productor |
| GET | `/api/reservas?id_proveedor=N` | Reservas recibidas por un proveedor |
| PUT | `/api/reservas/:id/estado` | Cambia el estado (`Pendiente`, `Confirmada`, `Rechazada`, `Cancelada`) |
| POST | `/api/reservas/valorar` | Crea una valoración de una reserva confirmada |
| GET | `/api/reservas/valoraciones` | Lista valoraciones. Filtros: `id_proveedor`, `id_productor`, `id_reserva` |

**Body de reserva:** `{ id_productor, id_maquinaria, fecha_inicio, fecha_fin }`.

### Administración

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/admin/metricas` | Usuarios, máquinas, reservas confirmadas e ingresos reales |
| GET | `/api/admin/usuarios` | Lista de usuarios con rol y estado |
| PUT | `/api/admin/suspender/:id` | Suspende o reactiva un usuario |

## 🔒 Seguridad y validaciones

### Contraseñas y sesión

- Las contraseñas se almacenan con **bcrypt** (`bcrypt.genSalt(10)` + `bcrypt.hash`).
- El login compara con `bcrypt.compare` y responde **401** ante credenciales inválidas.
- Un usuario con `estado = 0` recibe **403** y no puede iniciar sesión.
- La sesión del frontend se guarda en `localStorage` (`token`, `role`, `agrorent_user`) y se limpia al cerrar sesión.
- El `token` que emite `server.ts` (`agro.<payload-base64url>.dev`) **no es un JWT firmado** y la API no lo valida.

### Validación de RUT (módulo 11)

En el frontend (`src/App.tsx`):

- `formatearRut()` aplica puntos y guion automáticamente mientras se escribe (`20.123.456-7`).
- `validarRut()` calcula el dígito verificador con el **algoritmo oficial de módulo 11** (factores 2–7) y acepta `0` y `K`.
- Se rechazan RUT ficticios con todos los dígitos iguales.
- El campo está limitado a 12 caracteres.

En el backend (`authController.js`):

- Se valida el **formato** con `/^[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}-?[0-9kK]$/` y un máximo de 12 caracteres.
- Se rechaza un RUT ya registrado (`usuario.rut` es `UNIQUE`).
- El backend **no recalcula el dígito verificador**: esa comprobación existe solo en el cliente.

### Registro de usuarios

| Regla | Límite / condición |
| --- | --- |
| Nombre | 3–50 caracteres en el formulario; solo letras, espacios y guiones; máximo 100 en el backend |
| Correo | Debe contener `@`; máximo 100 caracteres; no se permiten duplicados |
| Contraseña | Mínimo 6 caracteres |
| RUT | Formato chileno, máximo 12 caracteres, único |
| Rol | La interfaz solo permite `productor` (1) o `propietario` (2) |
| Perfil | Se crea la fila en `productor` o `proveedor` según el rol |

### Maquinaria

- Marca y modelo: obligatorios, máximo 50 caracteres.
- Patente: formato `ABCD-12` mediante `/^[A-Za-z]{4}-[0-9]{2,3}$/`, máximo 20 caracteres y única.
- Año: entero entre **1950** y el año actual + 1.
- Descripción: máximo 250 caracteres.
- Precio por día: mayor que cero.
- Estado permitido: `Disponible`, `Rentado` o `Mantenimiento`.
- Proveedor y categoría deben existir antes de insertar.
- Edición y eliminación exigen `id_proveedor` y verifican que sea el dueño (**403** si no coincide).

### Subida de fotos

- Campo `fotos`, máximo **5 archivos** por máquina.
- Tamaño máximo **5 MB** por archivo.
- Formatos permitidos: **JPEG, JPG, PNG y WebP** (extensión y MIME).
- Nombres saneados y únicos; destino absoluto `backend/uploads/`.
- La máquina y sus fotos se guardan en una **transacción** con rollback.
- Si la petición se rechaza, los archivos ya escritos se eliminan para no dejar huérfanos.
- Al borrar o reemplazar la foto principal, se reasigna automáticamente a la primera disponible.

### Reservas

- Fechas válidas y `fecha_fin` posterior a `fecha_inicio` (**400**).
- Productor y máquina deben existir (**404**).
- La máquina debe estar `Disponible` (**409**).
- Se bloquean los rangos superpuestos con reservas `Pendiente` o `Confirmada` (**409**).
- Costo = días (mínimo 1) × precio diario; seña = 20 % del costo.
- Al confirmar, la máquina pasa a `Rentado`; al cancelar o rechazar, vuelve a `Disponible` si no quedan reservas confirmadas.
- La seña se registra como `estado_pago = 'Pagado'` y, al cancelar o rechazar, pasa a `Reembolsado`. **No hay pasarela de pago real**: es un registro contable dentro de la base de datos.

### Valoraciones

- Puntuación entera entre **1 y 5**.
- Solo se pueden valorar reservas en estado `Confirmada`.
- La reserva debe pertenecer al productor que valora (**403**).
- Una reserva solo puede valorarse una vez (**409**).
- El proveedor se deriva desde la maquinaria, no se acepta desde el body.

### Límites de seguridad conocidos

| Riesgo | Estado actual |
| --- | --- |
| Autenticación de la API | Sin JWT ni middleware de autorización; los endpoints son públicos |
| Autorización por rol | Solo en la interfaz (vistas por `role`); no se valida en el servidor |
| Suplantación de IDs | `id_proveedor` viaja en query/body y `id_productor` en el body; se pueden falsificar |
| CORS | Abierto (`cors()` sin restricciones) |
| Rate limiting / CSRF | No implementados |
| Recuperación de contraseña | No implementada |
| Panel de administración | Rutas `/api/admin/*` sin protección |

## ⚙️ Scripts disponibles

### Raíz del proyecto

| Script | Comando | Función |
| --- | --- | --- |
| `npm run dev` | `tsx server.ts` | Servidor de desarrollo con Vite middleware |
| `npm start` | `tsx server.ts` | Igual que `dev` (sin watch) |
| `npm run build` | `vite build` | Genera `dist/` |
| `npm run preview` | `vite preview` | Previsualiza el build (sin API) |
| `npm run typecheck` | `tsc --noEmit` | Verificación de tipos |
| `npm run lint` | `tsc --noEmit` | Alias de `typecheck` |

### Backend

| Script | Comando | Función |
| --- | --- | --- |
| `npm start` | `node index.js` | Servidor legacy con frontend HTML de respaldo |
| `npm run dev` | `node --watch index.js` | Servidor legacy con recarga automática |
| `node seed.js` | — | Carga 10 máquinas de prueba con imágenes |

## 🗄️ Base de datos

El esquema `agrorent` tiene **16 tablas**:

| Módulo | Tablas |
| --- | --- |
| Usuarios y roles | `rol`, `usuario`, `productor`, `proveedor`, `sesion` |
| Catálogo | `categoria`, `maquinaria`, `maquinaria_fotos`, `disponibilidad` |
| Reservas y pagos | `reserva`, `renta`, `pago` |
| Interacción | `valoracion`, `reclamo`, `notificacion`, `reporte` |

Tablas con endpoints activos: `usuario`, `productor`, `proveedor`, `categoria`, `maquinaria`, `maquinaria_fotos`, `reserva` y `valoracion`. Las tablas `disponibilidad`, `renta`, `pago`, `notificacion`, `reclamo`, `reporte` y `sesion` existen en el esquema, pero **aún no tienen endpoints ni interfaz**.

## 🧪 Verificación realizada (18/11/2026)

| Comprobación | Resultado |
| --- | --- |
| `npm run typecheck` | Sin errores |
| `npm run build` | Build correcto (1.661 módulos, `dist/` generado) |
| `GET /` | 200 |
| `GET /api/maquinaria/buscar` | 200 (9 máquinas disponibles) |
| `GET /api/maquinaria/categorias` | 200 |
| `GET /api/admin/metricas` | 200 con datos reales |
| `POST /api/auth/login` (`maria@productor.cl`) | 200 con `token`, `role` e `id_productor` |

## ⚠️ Estado del proyecto

### Implementado

- Registro e inicio de sesión con bcrypt, perfiles y bloqueo de usuarios suspendidos.
- Validación y formateo de RUT con módulo 11, más validaciones de nombre, correo y contraseña.
- Catálogo con búsqueda por marca, modelo o descripción, filtros y ficha de detalle.
- Galería de hasta 5 fotos por máquina con carrusel en el modal de detalles.
- Reservas con validación de fechas, disponibilidad, solapamiento, costo y seña del 20 %.
- Panel del productor: catálogo, detalle, reserva y listado de sus reservas.
- Panel del propietario: publicar máquina, inventario propio y aceptar/rechazar reservas.
- Panel de administración: métricas reales y suspensión/reactivación de usuarios.
- API de valoraciones con validaciones y filtros.
- Sesión en `localStorage` con vistas condicionales por rol.

### Pendiente

- **Edición de maquinaria desde la interfaz React**: el backend ya soporta `PUT` con gestión de fotos, pero el botón muestra “Editar (Próximamente)”.
- **Valoración desde la interfaz**: el botón “Valorar” aún muestra un aviso; la API ya está operativa.
- **Calendario de disponibilidad**: la tabla existe, sin endpoints ni UI.
- **Pagos reales**: la seña se registra en la base de datos, sin pasarela.
- **Notificaciones, reclamos y reportes exportables**.
- **JWT y autorización por rol en el backend**, recuperación de contraseña, rate limiting y CORS restringido.
- **Pruebas automatizadas** y despliegue en un entorno real.
- Corregir el fallback `id_productor = 1` al reservar justo después de un registro (la sesión aún no tiene el id de perfil).

## 📄 Documentación

- `Agro-Rent INGENERIA INFORMATICA.docx` — informe general del proyecto.
- `docs/Reporte-Avance-Sprint3.docx` — reporte de avance del Sprint 3.
- `Scrum-Reuniones/` — actas de reunión de los Sprints 0, 1, 2 y 3 (PDF).

## 📅 Metodología

Scrum, con un Sprint 0 de configuración y tres Sprints de desarrollo entre el 8 de octubre y el 11 de noviembre de 2026.
