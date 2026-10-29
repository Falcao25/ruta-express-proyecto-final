<?php
require_once __DIR__ . '/autenticacion.php';
$conexion = iniciarPeticion('GET');
try {
    $usuario = usuarioSesion($conexion);
    responder(['usuario' => $usuario, 'csrf' => $_SESSION['csrf']]);
} catch (Exception $error) {
    errorServidor($conexion, $error);
}
