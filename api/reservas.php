<?php
require_once __DIR__ . '/funciones.php';
require_once __DIR__ . '/autenticacion.php';
$conexion = iniciarPeticion('GET');
try {
    exigirAdministrador($conexion);
    responder(['reservas' => obtenerReservas($conexion)]);
} catch (Exception $error) {
    errorServidor($conexion, $error);
}
