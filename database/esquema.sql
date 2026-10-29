-- Versión adaptada del esquema original. No elimina tablas ni reservas existentes.
CREATE DATABASE IF NOT EXISTS bd_ruta_express CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bd_ruta_express;

CREATE TABLE IF NOT EXISTS Usuarios (
    usuarioID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('Administrador', 'Asesor') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS Clientes (
    clienteID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    dni VARCHAR(15) NOT NULL UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    apellidos VARCHAR(100) NOT NULL DEFAULT '',
    tipoDocumento ENUM('DNI', 'CE') NOT NULL DEFAULT 'DNI',
    correo VARCHAR(120) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS Vehiculos (
    vehiculoID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    placa VARCHAR(15) NOT NULL UNIQUE,
    capacidad INT NOT NULL,
    estado ENUM('Operativo', 'Mantenimiento', 'Baja') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS Rutas (
    rutaID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    origen VARCHAR(100) NOT NULL,
    destino VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS Viajes (
    viajeID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    rutaID INT NOT NULL,
    vehiculoID INT NOT NULL,
    usuarioID INT NOT NULL,
    fechaSalida DATETIME NOT NULL,
    estado ENUM('Programado', 'En ejecucion', 'Finalizado', 'Cancelado') NOT NULL,
    codigo VARCHAR(24) UNIQUE,
    fechaLlegada DATETIME,
    servicio VARCHAR(40) NOT NULL DEFAULT 'Semi cama',
    precio DECIMAL(8,2) NOT NULL DEFAULT 0,
    asientosIniciales TEXT,
    FOREIGN KEY (rutaID) REFERENCES Rutas(rutaID),
    FOREIGN KEY (vehiculoID) REFERENCES Vehiculos(vehiculoID),
    FOREIGN KEY (usuarioID) REFERENCES Usuarios(usuarioID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS Reservas (
    reservaID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    viajeID INT NOT NULL,
    clienteID INT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    cantidadAsientos INT NOT NULL,
    estado ENUM('Pendiente', 'Confirmada', 'Anulada') NOT NULL,
    codigo VARCHAR(24) UNIQUE,
    asiento INT,
    precio DECIMAL(8,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (viajeID) REFERENCES Viajes(viajeID),
    FOREIGN KEY (clienteID) REFERENCES Clientes(clienteID),
    INDEX idx_reservas_viaje_estado (viajeID, estado, asiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS Pagos (
    pagoID INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    reservaID INT NOT NULL UNIQUE,
    monto DECIMAL(8,2) NOT NULL,
    metodo ENUM('Efectivo', 'Tarjeta', 'Transferencia') NOT NULL,
    fechaPago DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservaID) REFERENCES Reservas(reservaID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
