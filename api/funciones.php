<?php
require_once __DIR__ . '/conexion.php';

// Permite detectar cambios en la salida mientras una persona tiene abierto el formulario.
function versionViaje($viaje) {
    return hash('sha256', json_encode([
        (int) $viaje['rutaID'], (int) $viaje['vehiculoID'], $viaje['fechaSalida'],
        $viaje['fechaLlegada'], $viaje['servicio'], $viaje['precio'],
        (int) $viaje['capacidad'], $viaje['estado']
    ]));
}

function listarViajes($conexion) {
    $viajes = consultar($conexion, 'SELECT v.*, r.origen, r.destino, b.capacidad, b.estado AS estadoVehiculo
        FROM Viajes v INNER JOIN Rutas r ON r.rutaID = v.rutaID
        INNER JOIN Vehiculos b ON b.vehiculoID = v.vehiculoID
        ORDER BY v.fechaSalida, v.viajeID')->fetchAll();
    $reservas = consultar($conexion, "SELECT viajeID, asiento FROM Reservas WHERE estado <> 'Anulada' AND asiento IS NOT NULL")->fetchAll();
    $resultado = [];
    foreach ($viajes as $viaje) {
        $iniciales = json_decode($viaje['asientosIniciales'] ?? '[]', true) ?: [];
        $ocupados = $iniciales;
        foreach ($reservas as $reserva) {
            if ($reserva['viajeID'] == $viaje['viajeID']) {
                $ocupados[] = (int) $reserva['asiento'];
            }
        }
        $salida = new DateTime($viaje['fechaSalida']);
        $llegada = new DateTime($viaje['fechaLlegada'] ?: $viaje['fechaSalida']);
        $minutos = max(0, (int) (($llegada->getTimestamp() - $salida->getTimestamp()) / 60));
        $resultado[] = [
            'id' => (string) $viaje['viajeID'], 'codigo' => $viaje['codigo'],
            'rutaID' => (string) $viaje['rutaID'], 'vehiculoID' => (string) $viaje['vehiculoID'],
            'version' => versionViaje($viaje),
            'empresa' => 'Ruta Express', 'origen' => $viaje['origen'], 'destino' => $viaje['destino'],
            'fecha' => $salida->format('Y-m-d'), 'horaSalida' => $salida->format('H:i'),
            'fechaLlegada' => $llegada->format('Y-m-d'), 'horaLlegada' => $llegada->format('H:i'),
            'duracion' => floor($minutos / 60) . 'h' . ($minutos % 60 ? ' ' . ($minutos % 60) . 'min' : ''),
            'servicio' => $viaje['servicio'], 'precio' => (float) $viaje['precio'],
            'capacidad' => (int) $viaje['capacidad'], 'estado' => $viaje['estado'],
            'estadoVehiculo' => $viaje['estadoVehiculo'],
            'asientosOcupadosIniciales' => $iniciales,
            'asientosOcupados' => array_values(array_unique($ocupados))
        ];
    }
    return $resultado;
}

function obtenerReservas($conexion, $condicion = '', $parametros = []) {
    $filas = consultar($conexion, 'SELECT r.*, c.tipoDocumento, c.dni, c.nombre, c.apellidos, c.telefono, c.correo
        FROM Reservas r INNER JOIN Clientes c ON c.clienteID = r.clienteID ' . $condicion . '
        ORDER BY r.fecha DESC, r.reservaID DESC', $parametros)->fetchAll();
    $resultado = [];
    foreach ($filas as $fila) {
        $resultado[] = [
            'id' => (string) $fila['reservaID'], 'codigo' => $fila['codigo'],
            'viajeId' => (string) $fila['viajeID'], 'asiento' => (int) $fila['asiento'],
            'cantidadAsientos' => (int) $fila['cantidadAsientos'], 'precio' => (float) $fila['precio'],
            'fechaReserva' => (new DateTime($fila['fecha']))->format(DateTime::ATOM),
            'estado' => strtolower($fila['estado']),
            'pasajero' => [
                'id' => (string) $fila['clienteID'], 'tipoDocumento' => $fila['tipoDocumento'],
                'numeroDocumento' => $fila['dni'], 'nombres' => $fila['nombre'], 'apellidos' => $fila['apellidos'],
                'telefono' => $fila['telefono'], 'correo' => $fila['correo']
            ]
        ];
    }
    return $resultado;
}

function validarPasajero($pasajero) {
    if (!is_array($pasajero)) {
        return 'Completa los datos del pasajero.';
    }
    foreach (['tipoDocumento', 'numeroDocumento', 'nombres', 'apellidos', 'telefono', 'correo'] as $campo) {
        if (!isset($pasajero[$campo]) || !is_string($pasajero[$campo]) || trim($pasajero[$campo]) === '') {
            return 'Completa todos los datos del pasajero.';
        }
    }
    $tipo = $pasajero['tipoDocumento'];
    $documento = $pasajero['numeroDocumento'];
    if (!in_array($tipo, ['DNI', 'CE'], true) ||
        ($tipo === 'DNI' && !preg_match('/^\d{8}$/', $documento)) ||
        ($tipo === 'CE' && !preg_match('/^[A-Za-z0-9]{9,12}$/', $documento))) {
        return 'El documento del pasajero no es válido.';
    }
    foreach (['nombres', 'apellidos'] as $campo) {
        $longitud = mb_strlen($pasajero[$campo]);
        if ($longitud < 2 || $longitud > 70 || !preg_match("/^[\p{L}\p{M} '\x{2019}-]+$/u", $pasajero[$campo])) {
            return 'Revisa los nombres y apellidos del pasajero.';
        }
    }
    if (!preg_match('/^9\d{8}$/', $pasajero['telefono'])) {
        return 'El celular debe tener 9 dígitos y empezar en 9.';
    }
    if (strlen($pasajero['correo']) > 120 || !filter_var($pasajero['correo'], FILTER_VALIDATE_EMAIL)) {
        return 'El correo electrónico no es válido.';
    }
    return '';
}
