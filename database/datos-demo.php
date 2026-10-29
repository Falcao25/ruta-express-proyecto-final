<?php
// Se carga desde instalar.php. Los días se calculan al ejecutar el instalador.
function cargarDatosDemo($conexion) {
    $usuario = consultar($conexion, "SELECT usuarioID FROM Usuarios WHERE username = 'demo_local'")->fetch();
    if (!$usuario) {
        consultar($conexion, 'INSERT INTO Usuarios (username, password, rol) VALUES (?, ?, ?)',
            ['demo_local', password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT), 'Administrador']);
        $usuarioID = $conexion->lastInsertId();
    } else {
        $usuarioID = $usuario['usuarioID'];
    }
    $rutas = [
        ['Piura', 'Chiclayo', 210, 35],
        ['Piura', 'Trujillo', 420, 55],
        ['Trujillo', 'Lima', 600, 65],
        ['Lima', 'Arequipa', 960, 110],
        ['Chiclayo', 'Lima', 780, 85]
    ];
    foreach ($rutas as $indice => $ruta) {
        $existente = consultar($conexion, 'SELECT rutaID FROM Rutas WHERE origen = ? AND destino = ? LIMIT 1', [$ruta[0], $ruta[1]])->fetch();
        if (!$existente) {
            consultar($conexion, 'INSERT INTO Rutas (origen, destino) VALUES (?, ?)', [$ruta[0], $ruta[1]]);
            $rutaID = $conexion->lastInsertId();
        } else {
            $rutaID = $existente['rutaID'];
        }
        foreach ([9, 21] as $turno => $hora) {
            $placa = 'DEMO-' . ($indice + 1) . ($turno + 1);
            $vehiculo = consultar($conexion, 'SELECT vehiculoID FROM Vehiculos WHERE placa = ?', [$placa])->fetch();
            if (!$vehiculo) {
                consultar($conexion, "INSERT INTO Vehiculos (placa, capacidad, estado) VALUES (?, 40, 'Operativo')", [$placa]);
                $vehiculoID = $conexion->lastInsertId();
            } else {
                $vehiculoID = $vehiculo['vehiculoID'];
            }
            for ($dia = 0; $dia < 21; $dia++) {
                $salida = new DateTime('today +' . $dia . ' days');
                $salida->setTime($hora, 0);
                $llegada = clone $salida;
                $llegada->modify('+' . $ruta[2] . ' minutes');
                $codigo = 'V-' . $salida->format('Ymd') . '-' . ($indice + 1) . ($turno + 1);
                if (consultar($conexion, 'SELECT viajeID FROM Viajes WHERE codigo = ?', [$codigo])->fetch()) continue;
                consultar($conexion, "INSERT INTO Viajes (rutaID, vehiculoID, usuarioID, fechaSalida, estado, codigo,
                    fechaLlegada, servicio, precio, asientosIniciales) VALUES (?, ?, ?, ?, 'Programado', ?, ?, ?, ?, ?)",
                    [$rutaID, $vehiculoID, $usuarioID, $salida->format('Y-m-d H:i:s'), $codigo, $llegada->format('Y-m-d H:i:s'),
                    $turno ? 'Cama ejecutivo' : 'Semi cama', $ruta[3] + ($turno ? 20 : 0),
                    json_encode($turno ? [2, 5, 8, 14, 25, 32] : [3, 7, 12, 19])]);
            }
        }
    }
}
