<?php
require_once __DIR__ . '/funciones.php';
$conexion = iniciarPeticion('GET');
try {
    responder(['viajes' => listarViajes($conexion)]);
} catch (Exception $error) {
    errorServidor($conexion, $error);
}
