-- ============================================
-- BASE DE DATOS: AgroRent
-- Sistema de Gestión de Renta de Maquinaria Agrícola
-- ============================================

DROP DATABASE IF EXISTS agrorent;
CREATE DATABASE agrorent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE agrorent;

-- ============================================
-- TABLA: rol
-- ============================================
CREATE TABLE rol (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200)
);

INSERT INTO rol (nombre, descripcion) VALUES
('Productor', 'Usuario que busca y reserva maquinaria agrícola'),
('Proveedor', 'Usuario dueño de maquinaria que la publica para arriendo'),
('Administrador', 'Usuario que supervisa la plataforma');

-- ============================================
-- TABLA: usuario
-- ============================================
CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    id_rol INT NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_rol) REFERENCES rol(id_rol)
);

-- ============================================
-- TABLA: productor
-- ============================================
CREATE TABLE productor (
    id_productor INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    rut VARCHAR(12) NOT NULL UNIQUE,
    direccion VARCHAR(200),
    tipo_cultivo VARCHAR(100),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- ============================================
-- TABLA: proveedor
-- ============================================
CREATE TABLE proveedor (
    id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    rut VARCHAR(12) NOT NULL UNIQUE,
    nombre_empresa VARCHAR(100),
    direccion VARCHAR(200),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- ============================================
-- TABLA: categoria
-- ============================================
CREATE TABLE categoria (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);

INSERT INTO categoria (nombre, descripcion) VALUES
('Tractor', 'Vehículo agrícola para labores de arrastre y tracción'),
('Sembradora', 'Máquina para sembrar semillas en el campo'),
('Cosechadora', 'Máquina para recolectar cultivos'),
('Rastra', 'Implemento para preparar el suelo'),
('Pulverizadora', 'Equipo para aplicar pesticidas y fertilizantes');

-- ============================================
-- TABLA: maquinaria
-- ============================================
CREATE TABLE maquinaria (
    id_maquinaria INT AUTO_INCREMENT PRIMARY KEY,
    id_proveedor INT NOT NULL,
    id_categoria INT NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    anio INT,
    patente VARCHAR(20) UNIQUE,
    precio_dia DECIMAL(10,2) NOT NULL,
    estado ENUM('Disponible', 'Rentado', 'Mantenimiento') DEFAULT 'Disponible',
    foto VARCHAR(255),
    descripcion TEXT,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor) ON DELETE CASCADE,
    FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria)
);

-- ============================================
-- TABLA: disponibilidad
-- ============================================
CREATE TABLE disponibilidad (
    id_disponibilidad INT AUTO_INCREMENT PRIMARY KEY,
    id_maquinaria INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado ENUM('Disponible', 'Bloqueado') DEFAULT 'Disponible',
    FOREIGN KEY (id_maquinaria) REFERENCES maquinaria(id_maquinaria) ON DELETE CASCADE
);

-- ============================================
-- TABLA: reserva
-- ============================================
CREATE TABLE reserva (
    id_reserva INT AUTO_INCREMENT PRIMARY KEY,
    id_productor INT NOT NULL,
    id_maquinaria INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado ENUM('Pendiente', 'Confirmada', 'Cancelada', 'Completada') DEFAULT 'Pendiente',
    costo_estimado DECIMAL(10,2),
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_productor) REFERENCES productor(id_productor),
    FOREIGN KEY (id_maquinaria) REFERENCES maquinaria(id_maquinaria)
);

-- ============================================
-- TABLA: renta
-- ============================================
CREATE TABLE renta (
    id_renta INT AUTO_INCREMENT PRIMARY KEY,
    id_reserva INT NOT NULL UNIQUE,
    fecha_entrega DATETIME,
    fecha_devolucion DATETIME,
    costo_total DECIMAL(10,2),
    estado ENUM('En uso', 'Completada', 'En conflicto') DEFAULT 'En uso',
    FOREIGN KEY (id_reserva) REFERENCES reserva(id_reserva)
);

-- ============================================
-- TABLA: pago
-- ============================================
CREATE TABLE pago (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_renta INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    metodo_pago ENUM('Efectivo', 'Transferencia', 'Tarjeta') NOT NULL,
    FOREIGN KEY (id_renta) REFERENCES renta(id_renta)
);

-- ============================================
-- TABLA: notificacion
-- ============================================
CREATE TABLE notificacion (
    id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    mensaje TEXT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    leida BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- ============================================
-- TABLA: reclamo
-- ============================================
CREATE TABLE reclamo (
    id_reclamo INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    descripcion TEXT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('Pendiente', 'Resuelto') DEFAULT 'Pendiente',
    resolucion TEXT,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

-- ============================================
-- TABLA: valoracion
-- ============================================
CREATE TABLE valoracion (
    id_valoracion INT AUTO_INCREMENT PRIMARY KEY,
    id_productor INT NOT NULL,
    id_proveedor INT NOT NULL,
    puntuacion INT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
    comentario TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_productor) REFERENCES productor(id_productor),
    FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor)
);

-- ============================================
-- TABLA: reporte
-- ============================================
CREATE TABLE reporte (
    id_reporte INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    fecha_inicio DATE,
    fecha_fin DATE,
    datos JSON,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: sesion
-- ============================================
CREATE TABLE sesion (
    id_sesion INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATETIME,
    activa BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- ============================================
-- DATOS DE PRUEBA
-- ============================================

-- Usuarios (contraseñas en texto plano solo para pruebas)
INSERT INTO usuario (nombre, email, password, telefono, id_rol) VALUES
('Jorge Muñoz', 'jorge@agroma.cl', 'hash123', '+56912345678', 2),
('María González', 'maria@productor.cl', 'hash456', '+56923456789', 1),
('Pedro Silva', 'pedro@productor.cl', 'hash789', '+56934567890', 1),
('Admin AgroRent', 'admin@agrorent.cl', 'hash000', '+56945678901', 3);

-- Productores
INSERT INTO productor (id_usuario, rut, direccion, tipo_cultivo) VALUES
(2, '12.345.678-9', 'Camino a Puaucho Km 3, Osorno', 'Trigo'),
(3, '23.456.789-0', 'Ruta 5 Sur Km 950, San Pablo', 'Papas');

-- Proveedor
INSERT INTO proveedor (id_usuario, rut, nombre_empresa, direccion) VALUES
(1, '11.111.111-1', 'AgroMaq Osorno', 'Camino a Puaucho Km 5, Osorno');

-- Maquinaria
INSERT INTO maquinaria (id_proveedor, id_categoria, marca, modelo, anio, patente, precio_dia, estado, descripcion) VALUES
(1, 1, 'John Deere', '6120M', 2020, 'AB1234', 150000, 'Disponible', 'Tractor con 120 HP, ideal para labores de arrastre'),
(1, 2, 'Vaderstad', 'Rapid 400S', 2019, 'CD5678', 250000, 'Disponible', 'Sembradora de siembra directa'),
(1, 3, 'Claas', 'Lexion 5300', 2021, 'EF9012', 500000, 'Rentado', 'Cosechadora de alto rendimiento');

-- Reserva
INSERT INTO reserva (id_productor, id_maquinaria, fecha_inicio, fecha_fin, estado, costo_estimado) VALUES
(1, 1, '2026-11-01', '2026-11-05', 'Confirmada', 750000),
(2, 2, '2026-11-10', '2026-11-12', 'Pendiente', 500000);

-- Renta
INSERT INTO renta (id_reserva, fecha_entrega, estado) VALUES
(1, '2026-11-01 08:00:00', 'En uso');

-- Pago
INSERT INTO pago (id_renta, monto, metodo_pago) VALUES
(1, 375000, 'Transferencia');

-- Notificación
INSERT INTO notificacion (id_usuario, mensaje) VALUES
(2, 'Tu reserva del tractor John Deere ha sido confirmada.'),
(1, 'Tienes una nueva reserva pendiente de confirmar.');

-- Valoración
INSERT INTO valoracion (id_productor, id_proveedor, puntuacion, comentario) VALUES
(1, 1, 5, 'Excelente servicio, maquinaria en perfecto estado.');

-- ============================================
-- CONSULTAS DE VERIFICACIÓN
-- ============================================
SELECT 'Base de datos AgroRent creada correctamente' AS mensaje;
SELECT COUNT(*) AS total_usuarios FROM usuario;
SELECT COUNT(*) AS total_maquinaria FROM maquinaria;
SELECT COUNT(*) AS total_reservas FROM reserva;