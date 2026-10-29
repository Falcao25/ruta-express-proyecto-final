<?php
require_once __DIR__ . '/funciones.php';
require_once __DIR__ . '/autenticacion.php';
$conexion = iniciarPeticion('POST');
try {
    exigirAdministrador($conexion, true);
    $datos = leerJson();
    $reservaID = filter_var($datos['id'] ?? null, FILTER_VALIDATE_INT);
    $estados = ['confirmada' => 'Confirmada', 'anulada' => 'Anulada'];
    $estado = is_string($datos['estado'] ?? null) ? ($estados[$datos['estado']] ?? null) : null;
    if (!$reservaID || !$estado) {
        responder(['error' => 'Selecciona una reserva y un estado válidos.'], 422);
    }
    $conexion->beginTransaction();
    $referencia = consultar($conexion, 'SELECT viajeID FROM Reservas WHERE reservaID = ?', [$reservaID])->fetch();
    if (!$referencia) {
        $conexion->rollBack();
        responder(['error' => 'La reserva no existe.'], 404);
    }
    // Mantener el mismo orden de bloqueo que al crear una reserva.
    consultar($conexion, 'SELECT viajeID FROM Viajes WHERE viajeID = ? FOR UPDATE', [$referencia['viajeID']]);
    $reserva = consultar($conexion, 'SELECT estado FROM Reservas WHERE reservaID = ? FOR UPDATE', [$reservaID])->fetch();
    $permitidos = ['Pendiente' => ['Confirmada', 'Anulada'], 'Confirmada' => ['Anulada'], 'Anulada' => []];
    if (!in_array($estado, $permitidos[$reserva['estado']], true)) {
        $conexion->rollBack();
        responder(['error' => 'La reserva cambió de estado o la operación no está permitida.'], 409);
    }
    consultar($conexion, 'UPDATE Reservas SET estado = ? WHERE reservaID = ?', [$estado, $reservaID]);
    $actualizada = obtenerReservas($conexion, 'WHERE r.reservaID = ?', [$reservaID])[0];
    $conexion->commit();
    responder(['reserva' => $actualizada]);
} catch (Exception $error) {
    errorServidor($conexion, $error);
}
