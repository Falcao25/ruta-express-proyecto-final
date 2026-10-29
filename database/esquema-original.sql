-- Esquema proporcionado para adaptar Ruta Express.
-- Archivo de referencia: no se ejecuta automáticamente desde la aplicación.

CREATE DATABASE bd_ruta_express;
USE bd_ruta_express;

CREATE TABLE Usuarios (
    usuarioID INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('Administrador', 'Asesor') NOT NULL,
    PRIMARY KEY (usuarioID)
);

CREATE TABLE Clientes (
    clienteID INT NOT NULL AUTO_INCREMENT,
    dni VARCHAR(15) NOT NULL UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    PRIMARY KEY (clienteID)
);

CREATE TABLE Vehiculos (
    vehiculoID INT NOT NULL AUTO_INCREMENT,
    placa VARCHAR(15) NOT NULL UNIQUE,
    capacidad INT NOT NULL,
    estado ENUM('Operativo', 'Mantenimiento', 'Baja') NOT NULL,
    PRIMARY KEY (vehiculoID)
);

CREATE TABLE Rutas (
    rutaID INT NOT NULL AUTO_INCREMENT,
    origen VARCHAR(100) NOT NULL,
    destino VARCHAR(100) NOT NULL,
    PRIMARY KEY (rutaID)
);

CREATE TABLE Viajes (
    viajeID INT NOT NULL AUTO_INCREMENT,
    rutaID INT NOT NULL,
    vehiculoID INT NOT NULL,
    usuarioID INT NOT NULL,
    fechaSalida DATETIME NOT NULL,
    estado ENUM('Programado', 'En ejecucion', 'Finalizado', 'Cancelado') NOT NULL,
    PRIMARY KEY (viajeID),
    FOREIGN KEY (rutaID) REFERENCES Rutas(rutaID),
    FOREIGN KEY (vehiculoID) REFERENCES Vehiculos(vehiculoID),
    FOREIGN KEY (usuarioID) REFERENCES Usuarios(usuarioID)
);

CREATE TABLE Reservas (
    reservaID INT NOT NULL AUTO_INCREMENT,
    viajeID INT NOT NULL,
    clienteID INT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    cantidadAsientos INT NOT NULL,
    estado ENUM('Pendiente', 'Confirmada', 'Anulada') NOT NULL,
    PRIMARY KEY (reservaID),
    FOREIGN KEY (viajeID) REFERENCES Viajes(viajeID),
    FOREIGN KEY (clienteID) REFERENCES Clientes(clienteID)
);

CREATE TABLE Pagos (
    pagoID INT NOT NULL AUTO_INCREMENT,
    reservaID INT NOT NULL UNIQUE,
    monto DECIMAL(8,2) NOT NULL,
    metodo ENUM('Efectivo', 'Tarjeta', 'Transferencia') NOT NULL,
    fechaPago DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (pagoID),
    FOREIGN KEY (reservaID) REFERENCES Reservas(reservaID)
);
