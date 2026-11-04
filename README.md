# AgroRent 🚜

Sistema web de gestión de renta de maquinaria agrícola para la zona sur de Chile.

## 📋 Descripción

AgroRent es una aplicación web que permite a los productores agrícolas buscar, comparar y reservar maquinaria en línea, visualizando la disponibilidad en tiempo real. Los proveedores pueden publicar sus equipos y gestionar las reservas recibidas.

## 🎯 Problemática

Actualmente, el arriendo de maquinaria agrícola se gestiona de forma informal (llamadas, WhatsApp, cuadernos), lo que genera:
- Incertidumbre sobre disponibilidad
- Cruces de reservas
- Pérdida de oportunidades de siembra/cosecha
- Falta de transparencia

## 💡 Solución

Plataforma web con frontend, backend y base de datos que centraliza la oferta y demanda de maquinaria agrícola.

## 👥 Integrantes

- Luis Troncoso
- Joel Tejeda
- Esteban Vargas
- Jorge Martínez
- Martín Jara

## 🛠️ Tecnologías

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js + Express
- **Base de Datos:** MySQL
- **Control de versiones:** Git + GitHub

## 📅 Metodología

Scrum, con 4 Sprints (Sprint 0 de configuración y 3 de desarrollo) entre el 8 de octubre y el 11 de noviembre de 2026.

## 📁 ## 📁 Estructura del Proyecto

```text
AGRORENT/
├── backend/                 API REST (Node.js + Express)
│   ├── config/              Conexión a MySQL
│   ├── controllers/         Lógica de negocio
│   ├── routes/              Rutas de la API
│   ├── .env.example         Plantilla de variables de entorno
│   └── index.js             Punto de entrada del servidor
├── database/                Script SQL (15 tablas + datos de prueba)
├── docs/                    Informes del proyecto
├── frontend/                HTML, CSS y JavaScript
│   ├── index.html           Inicio de sesión
│   ├── registro.html        Registro de productores y proveedores
│   ├── panel-cliente.html   Catálogo y solicitud de reservas
│   ├── panel-proveedor.html Gestión de maquinaria
│   ├── panel-admin.html     Métricas del sistema
│   ├── proveedor.js         Lógica del panel de proveedor
│   └── styles.css           Estilos compartidos
└── Scrum-Reuniones/         Actas de reunión (PDF)
```

## 🚀 Puesta en marcha

1. Crear la base de datos e importar el script:

   ```bash
   mysql -u root -p < database/agrorent.sql
   ```

2. Configurar las variables de entorno:

   ```bash
   cd backend
   cp .env.example .env
   # editar .env con el usuario y la contraseña de MySQL
   ```

3. Instalar dependencias y arrancar el servidor:

   ```bash
   cd backend
   npm install
   npm start
   ```

4. Abrir <http://localhost:3000/>

## 👤 Usuarios de prueba

Todos usan la contraseña `agrorent123`. Los hashes están guardados con bcrypt en `database/agrorent.sql`.

| Correo | Rol |
| --- | --- |
| admin@agrorent.cl | Administrador |
| jorge@agroma.cl | Proveedor |
| maria@productor.cl | Productor |
| pedro@productor.cl | Productor |

## 🔌 Endpoints principales

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/auth/registro` | Registrar productor o proveedor |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/maquinaria/buscar` | Buscar maquinaria disponible |
| GET | `/api/maquinaria/categorias` | Listar categorías |
| GET | `/api/maquinaria/:id` | Detalle de una máquina |
| POST | `/api/maquinaria` | Publicar maquinaria |
| PUT | `/api/maquinaria/:id` | Actualizar maquinaria |
| DELETE | `/api/maquinaria/:id` | Eliminar maquinaria |
| POST | `/api/reservas` | Solicitar reserva (valida solapamiento) |
| GET | `/api/reservas` | Listar reservas |
| PUT | `/api/reservas/:id/estado` | Aceptar, rechazar o cancelar |
| GET | `/api/admin/metricas` | Métricas e ingresos reales |
| PUT | `/api/admin/suspender/:id` | Suspender o reactivar usuario |

## ⚠️ Estado del proyecto (03/11/2026)

Implementado y verificado: autenticación con bcrypt y perfiles, CRUD de maquinaria, catálogo, solicitud de reservas con validación de solapamiento, paneles de cliente, proveedor y administrador, y métricas con ingresos calculados desde la base de datos.

Pendiente: JWT y autorización por rol en el backend, recuperación de contraseña, carga de imágenes, pagos, notificaciones, valoraciones, reportes exportables, pruebas automatizadas y despliegue.

## 📄 Documentación

- `docs/Reporte-Avance-Sprint3.docx` — reporte de avance del Sprint 3.
- `Agro-Rent INGENERIA INFORMATICA.docx` — informe general del proyecto.
- `Scrum-Reuniones/` — actas de cierre de cada Sprint.
