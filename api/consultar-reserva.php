<?php
require_once __DIR__ . '/funciones.php';
$conexion = iniciarPeticion('POST');
$datos = leerJson();
$codigo = is_string($datos['codigo'] ?? null) ? strtoupper(trim($datos['codigo'])) : '';
$documento = is_string($datos['documento'] ?? null) ? strtoupper(trim($datos['documento'])) : '';
if ($codigo === '' || $documento === '' || strlen($codigo) > 30 || strlen($documento) > 15) {
    responder(['error' => 'Ingresa el código y el documento del pasajero.'], 422);
}
try {
    $reservas = obtenerReservas($conexion, 'WHERE r.codigo = ? AND c.dni = ?', [$codigo, $documento]);
    responder(['reserva' => $reservas ? $reservas[0] : null]);
} catch (Exception $error) {
    errorServidor($conexion, $error);
}
