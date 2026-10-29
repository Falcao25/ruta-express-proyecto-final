<?php
require_once __DIR__ . '/funciones.php';
require_once __DIR__ . '/autenticacion.php';
$conexion = iniciarPeticion('POST');

function fechaFormulario($valor) {
    if (!is_string($valor)) return null;
    $fecha = DateTime::createFromFormat('!Y-m-d\TH:i', $valor);
    return $fecha && $fecha->format('Y-m-d\TH:i') === $valor ? $fecha : null;
}

try {
    $usuario = exigirAdministrador($conexion, true);
    $datos = leerJson();
    $id = isset($datos['id']) ? filter_var($datos['id'], FILTER_VALIDATE_INT) : null;
    $rutaID = filter_var($datos['rutaID'] ?? null, FILTER_VALIDATE_INT);
    $vehiculoID = filter_var($datos['vehiculoID'] ?? null, FILTER_VALIDATE_INT);
    $salida = fechaFormulario($datos['fechaSalida'] ?? null);
    $llegada = fechaFormulario($datos['fechaLlegada'] ?? null);
    $servicio = $datos['servicio'] ?? '';
    $precio = $datos['precio'] ?? null;
    $errores = [];
    if (isset($datos['id']) && (!$id || $id < 1)) $errores['id'] = 'El viaje indicado no es válido.';
    if (!$rutaID || $rutaID < 1) $errores['rutaID'] = 'Selecciona una ruta.';
    if (!$vehiculoID || $vehiculoID < 1) $errores['vehiculoID'] = 'Selecciona un vehículo.';
    if (!$salida || $salida->getTimestamp() <= time()) $errores['fechaSalida'] = 'La salida debe ser posterior a la fecha y hora actuales.';
    if (!$llegada || ($salida && $llegada <= $salida)) $errores['fechaLlegada'] = 'La llegada debe ser posterior a la salida.';
    if (!in_array($servicio, ['Semi cama', 'Cama ejecutivo'], true)) $errores['servicio'] = 'Selecciona un servicio válido.';
    if (!is_string($precio) || !preg_match('/^\d{1,6}(\.\d{1,2})?$/', $precio) || (float) $precio <= 0) {
        $errores['precio'] = 'Ingresa un precio mayor que cero, con hasta dos decimales.';
    }
    if ($errores) responder(['error' => 'Revisa los datos del viaje.', 'campos' => $errores], 422);

    $conexion->beginTransaction();
    $anterior = null;
    if ($id) {
        $anterior = consultar($conexion, 'SELECT * FROM Viajes WHERE viajeID = ? FOR UPDATE', [$id])->fetch();
        if (!$anterior || $anterior['estado'] !== 'Programado' || strtotime($anterior['fechaSalida']) <= time()) {
            $conexion->rollBack();
            responder(['error' => 'Solo se pueden editar viajes programados que todavía no hayan salido.'], 409);
        }
    }
    // Bloquear los vehículos en el mismo orden evita programaciones simultáneas del mismo bus.
    $idsVehiculos = [$vehiculoID];
    if ($anterior) $idsVehiculos[] = (int) $anterior['vehiculoID'];
    $idsVehiculos = array_unique($idsVehiculos);
    sort($idsVehiculos);
    $vehiculo = null;
    $capacidadAnterior = null;
    foreach ($idsVehiculos as $idVehiculo) {
        $fila = consultar($conexion, 'SELECT * FROM Vehiculos WHERE vehiculoID = ? FOR UPDATE', [$idVehiculo])->fetch();
        if ($idVehiculo === $vehiculoID) $vehiculo = $fila;
        if ($anterior && $idVehiculo == $anterior['vehiculoID'] && $fila) $capacidadAnterior = (int) $fila['capacidad'];
    }
    if (!$vehiculo || $vehiculo['estado'] !== 'Operativo' || (int) $vehiculo['capacidad'] < 1) {
        $conexion->rollBack();
        responder(['error' => 'Selecciona un vehículo operativo con capacidad válida.', 'campos' => ['vehiculoID' => 'Este vehículo no está disponible.']], 422);
    }
    $ruta = consultar($conexion, 'SELECT rutaID, origen, destino FROM Rutas WHERE rutaID = ?', [$rutaID])->fetch();
    if (!$ruta || $ruta['origen'] === $ruta['destino']) {
        $conexion->rollBack();
        responder(['error' => 'Selecciona una ruta válida.', 'campos' => ['rutaID' => 'La ruta no está disponible.']], 422);
    }
    $salidaSql = $salida->format('Y-m-d H:i:s');
    $llegadaSql = $llegada->format('Y-m-d H:i:s');
    if ($anterior) {
        $anterior['capacidad'] = $capacidadAnterior;
        if (!is_string($datos['version'] ?? null) || !hash_equals(versionViaje($anterior), $datos['version'])) {
            $conexion->rollBack();
            responder(['error' => 'Otro usuario modificó el viaje. Cierra el formulario y vuelve a abrirlo para ver los datos actuales.'], 409);
        }
        $reservas = consultar($conexion, "SELECT reservaID FROM Reservas WHERE viajeID = ? AND estado <> 'Anulada' FOR UPDATE", [$id])->fetchAll();
        $cambiaDatos = $rutaID != $anterior['rutaID'] || $vehiculoID != $anterior['vehiculoID'] ||
            $salidaSql !== $anterior['fechaSalida'] || $llegadaSql !== $anterior['fechaLlegada'] || $servicio !== $anterior['servicio'];
        if ($reservas && $cambiaDatos) {
            $conexion->rollBack();
            responder(['error' => 'Este viaje tiene reservas activas. Solo puedes cambiar el precio para nuevas reservas.'], 409);
        }
        $ocupados = json_decode($anterior['asientosIniciales'] ?? '[]', true) ?: [];
        if ($ocupados && max($ocupados) > (int) $vehiculo['capacidad']) {
            $conexion->rollBack();
            responder(['error' => 'El vehículo no tiene capacidad para los asientos ocupados de este viaje.'], 409);
        }
    }
    // Una lectura normal evita bloquear otros viajes; la exclusión se coordina con el bus bloqueado.
    $cruce = consultar($conexion, "SELECT codigo FROM Viajes WHERE vehiculoID = ? AND viajeID <> ?
        AND estado IN ('Programado', 'En ejecucion') AND fechaSalida < ?
        AND (fechaLlegada IS NULL OR fechaLlegada > ?) LIMIT 1",
        [$vehiculoID, $id ?: 0, $llegadaSql, $salidaSql])->fetch();
    if ($cruce) {
        $conexion->rollBack();
        responder(['error' => 'El vehículo ya tiene otro viaje durante ese horario. Elige otro bus u horario.',
            'campos' => ['vehiculoID' => 'El horario se cruza con otro viaje de este vehículo.']], 409);
    }
    if ($anterior) {
        consultar($conexion, 'UPDATE Viajes SET rutaID = ?, vehiculoID = ?, fechaSalida = ?, fechaLlegada = ?, servicio = ?, precio = ? WHERE viajeID = ?',
            [$rutaID, $vehiculoID, $salidaSql, $llegadaSql, $servicio, $precio, $id]);
    } else {
        $codigo = 'V-' . strtoupper(bin2hex(random_bytes(5)));
        consultar($conexion, "INSERT INTO Viajes (rutaID, vehiculoID, usuarioID, fechaSalida, estado, codigo, fechaLlegada, servicio, precio, asientosIniciales)
            VALUES (?, ?, ?, ?, 'Programado', ?, ?, ?, ?, '[]')",
            [$rutaID, $vehiculoID, $usuario['id'], $salidaSql, $codigo, $llegadaSql, $servicio, $precio]);
        $id = (int) $conexion->lastInsertId();
    }
    $conexion->commit();
    $viajes = listarViajes($conexion);
    foreach ($viajes as $viaje) {
        if ($viaje['id'] === (string) $id) responder(['viaje' => $viaje], $anterior ? 200 : 201);
    }
} catch (Exception $error) {
    errorServidor($conexion, $error);
}
