<?php
require_once __DIR__ . '/funciones.php';
$conexion = iniciarPeticion('GET');
try {
    // Listado administrativo local. Este avance todavía no incorpora inicio de sesión.
    responder(['reservas' => obtenerReservas($conexion)]);
} catch (Exception $error) {
    errorServidor($conexion, $error);
}
