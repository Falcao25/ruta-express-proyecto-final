<?php
require_once __DIR__ . '/autenticacion.php';
$conexion = iniciarPeticion('GET');
try {
    exigirAdministrador($conexion);
    $rutas = consultar($conexion, 'SELECT rutaID, origen, destino FROM Rutas ORDER BY origen, destino')->fetchAll();
    $vehiculos = consultar($conexion, 'SELECT vehiculoID, placa, capacidad, estado FROM Vehiculos ORDER BY placa')->fetchAll();
    responder(['rutas' => $rutas, 'vehiculos' => $vehiculos]);
} catch (Exception $error) {
    errorServidor($conexion, $error);
}
