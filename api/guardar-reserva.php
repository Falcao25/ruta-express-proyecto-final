<?php
require_once __DIR__ . '/funciones.php';
$conexion = iniciarPeticion('POST');
$datos = leerJson();
$pasajero = $datos['pasajero'] ?? null;
if (is_array($pasajero)) {
    foreach ($pasajero as $campo => $valor) {
        if (is_string($valor)) $pasajero[$campo] = trim($valor);
    }
}
$error = validarPasajero($pasajero);
$viajeID = filter_var($datos['viajeId'] ?? null, FILTER_VALIDATE_INT);
$asiento = $datos['asiento'] ?? null;
if ($error || !$viajeID || !is_int($asiento) || $asiento < 1) {
    responder(['error' => $error ?: 'Selecciona un viaje y un asiento válidos.'], 422);
}
try {
    $conexion->beginTransaction();
    // Bloquear el viaje ordena las reservas simultáneas para ese mismo bus/salida.
    $viaje = consultar($conexion, 'SELECT v.*, b.capacidad, b.estado AS estadoVehiculo
        FROM Viajes v INNER JOIN Vehiculos b ON b.vehiculoID = v.vehiculoID
        WHERE v.viajeID = ? FOR UPDATE', [$viajeID])->fetch();
    if (!$viaje || $viaje['estado'] !== 'Programado' || $viaje['estadoVehiculo'] !== 'Operativo' ||
        strtotime($viaje['fechaSalida']) <= time()) {
        $conexion->rollBack();
        responder(['error' => 'El viaje ya no está disponible. Busca una nueva salida.'], 409);
    }
    if (!is_string($datos['version'] ?? null) || !hash_equals(versionViaje($viaje), $datos['version'])) {
        $conexion->rollBack();
        responder(['error' => 'Los datos del viaje cambiaron. Vuelve a buscar y revisar la salida antes de reservar.'], 409);
    }
    if ($asiento > (int) $viaje['capacidad']) {
        $conexion->rollBack();
        responder(['error' => 'El asiento no pertenece a este bus.'], 422);
    }
    $iniciales = json_decode($viaje['asientosIniciales'] ?? '[]', true) ?: [];
    $ocupado = consultar($conexion, "SELECT reservaID FROM Reservas
        WHERE viajeID = ? AND asiento = ? AND estado <> 'Anulada' FOR UPDATE", [$viajeID, $asiento])->fetch();
    if (in_array($asiento, $iniciales, true) || $ocupado) {
        $conexion->rollBack();
        responder(['error' => 'Este asiento acaba de ser reservado. Selecciona otro disponible.'], 409);
    }
    // El cliente se reutiliza por documento. Sus datos de contacto se mantienen actualizados.
    consultar($conexion, 'INSERT INTO Clientes (dni, nombre, apellidos, tipoDocumento, telefono, correo)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE clienteID = LAST_INSERT_ID(clienteID), nombre = VALUES(nombre),
        apellidos = VALUES(apellidos), tipoDocumento = VALUES(tipoDocumento), telefono = VALUES(telefono), correo = VALUES(correo)',
        [$pasajero['numeroDocumento'], $pasajero['nombres'], $pasajero['apellidos'], $pasajero['tipoDocumento'], $pasajero['telefono'], $pasajero['correo']]);
    $clienteID = $conexion->lastInsertId();
    $codigo = 'RES-' . strtoupper(bin2hex(random_bytes(5)));
    consultar($conexion, "INSERT INTO Reservas (viajeID, clienteID, fecha, cantidadAsientos, estado, codigo, asiento, precio)
        VALUES (?, ?, ?, 1, 'Pendiente', ?, ?, ?)",
        [$viajeID, $clienteID, date('Y-m-d H:i:s'), $codigo, $asiento, $viaje['precio']]);
    $reservaID = $conexion->lastInsertId();
    $reserva = obtenerReservas($conexion, 'WHERE r.reservaID = ?', [$reservaID])[0];
    $conexion->commit();
    responder(['reserva' => $reserva], 201);
} catch (Exception $error) {
    errorServidor($conexion, $error);
}
