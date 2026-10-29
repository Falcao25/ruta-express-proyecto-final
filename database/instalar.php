<?php
// Ejecutar una vez: php database/instalar.php. También agrega nuevas fechas de ejemplo.
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Ejecuta este instalador desde la terminal.');
}
require_once dirname(__DIR__) . '/api/conexion.php';
require_once __DIR__ . '/datos-demo.php';

try {
    $config = require __DIR__ . '/../api/config.php';
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $config['base'])) {
        throw new Exception('El nombre de la base solo debe contener letras, números y guiones bajos.');
    }
    $conexion = conectar(false);
    $sql = str_replace('bd_ruta_express', '`' . $config['base'] . '`', file_get_contents(__DIR__ . '/esquema.sql'));
    foreach (explode(';', $sql) as $sentencia) {
        if (trim($sentencia) !== '') $conexion->exec($sentencia);
    }
    $tablas = consultar($conexion, 'SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (\'Usuarios\', \'Clientes\', \'Vehiculos\', \'Rutas\', \'Viajes\', \'Reservas\', \'Pagos\')', [$config['base']])->fetchAll();
    foreach ($tablas as $tabla) {
        if ($tabla['ENGINE'] !== 'InnoDB') {
            throw new Exception('La tabla ' . $tabla['TABLE_NAME'] . ' debe utilizar InnoDB para guardar reservas con transacciones.');
        }
    }
    // Si se importó el SQL original, agregar solo los campos que le faltan.
    $campos = [
        'Clientes' => [
            'apellidos' => "VARCHAR(100) NOT NULL DEFAULT ''",
            'tipoDocumento' => "ENUM('DNI', 'CE') NOT NULL DEFAULT 'DNI'",
            'correo' => "VARCHAR(120) NOT NULL DEFAULT ''"
        ],
        'Viajes' => [
            'codigo' => 'VARCHAR(24) UNIQUE', 'fechaLlegada' => 'DATETIME',
            'servicio' => "VARCHAR(40) NOT NULL DEFAULT 'Semi cama'",
            'precio' => 'DECIMAL(8,2) NOT NULL DEFAULT 0', 'asientosIniciales' => 'TEXT'
        ],
        'Reservas' => [
            'codigo' => 'VARCHAR(24) UNIQUE', 'asiento' => 'INT', 'precio' => 'DECIMAL(8,2) NOT NULL DEFAULT 0'
        ]
    ];
    foreach ($campos as $tabla => $columnas) {
        $existentes = $conexion->query('SHOW COLUMNS FROM `' . $tabla . '`')->fetchAll(PDO::FETCH_COLUMN);
        foreach ($columnas as $columna => $definicion) {
            if (!in_array($columna, $existentes, true)) {
                $conexion->exec('ALTER TABLE `' . $tabla . '` ADD COLUMN `' . $columna . '` ' . $definicion);
            }
        }
    }
    $conexion->beginTransaction();
    cargarDatosDemo($conexion);
    $conexion->commit();
    echo "Base preparada: " . $config['base'] . PHP_EOL;
    echo "Viajes de ejemplo disponibles para hoy y los próximos 20 días." . PHP_EOL;
    echo "No se borraron reservas ni se registraron pagos." . PHP_EOL;
    $antiguas = $conexion->query('SELECT COUNT(*) FROM Reservas WHERE asiento IS NULL OR codigo IS NULL')->fetchColumn();
    if ($antiguas) {
        echo "Atención: hay " . $antiguas . " reservas antiguas sin código o asiento. Deben completarse antes de utilizarlas en la interfaz." . PHP_EOL;
    }
} catch (Exception $error) {
    if (isset($conexion) && $conexion->inTransaction()) $conexion->rollBack();
    fwrite(STDERR, "No se pudo preparar la base. Revisa la conexión de api/config.local.php y que MySQL esté iniciado." . PHP_EOL);
    // En terminal el detalle permite distinguir permisos, campos o compatibilidad SQL.
    fwrite(STDERR, $error->getMessage() . PHP_EOL);
    exit(1);
}
