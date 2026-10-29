<?php
date_default_timezone_set('America/Lima');
ini_set('display_errors', '0');

function conectar($usarBase = true) {
    $config = require __DIR__ . '/config.php';
    $dsn = 'mysql:host=' . $config['host'] . ';port=' . (int) $config['puerto'];
    if ($usarBase) {
        $dsn .= ';dbname=' . $config['base'];
    }
    return new PDO($dsn . ';charset=utf8mb4', $config['usuario'], $config['clave'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
}

function responder($datos, $codigo = 200) {
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function iniciarPeticion($metodo, $necesitaConexion = true) {
    // La demostración sigue limitada al equipo local, incluso con login administrativo.
    if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) {
        responder(['error' => 'Esta demostración está disponible solo en el equipo local.'], 403);
    }
    if ($_SERVER['REQUEST_METHOD'] !== $metodo) {
        header('Allow: ' . $metodo);
        responder(['error' => 'Método no permitido.'], 405);
    }
    if ($metodo === 'POST' && stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
        responder(['error' => 'Envía los datos en formato JSON.'], 415);
    }
    if (!$necesitaConexion) return null;
    try {
        return conectar();
    } catch (PDOException $error) {
        error_log('Ruta Express: no se pudo conectar a MySQL.');
        responder(['error' => 'No se pudo conectar con MySQL. Revisa api/config.local.php, inicia MySQL e importa la base de datos.'], 503);
    }
}

function leerJson() {
    $datos = json_decode(file_get_contents('php://input'), true);
    if (!is_array($datos)) {
        responder(['error' => 'Los datos enviados no son válidos.'], 400);
    }
    return $datos;
}

function consultar($conexion, $sql, $parametros = []) {
    $consulta = $conexion->prepare($sql);
    $consulta->execute($parametros);
    return $consulta;
}

function errorServidor($conexion, $error) {
    if ($conexion->inTransaction()) {
        $conexion->rollBack();
    }
    error_log('Ruta Express: ' . $error->getMessage());
    responder(['error' => 'No se pudo completar la operación. Inténtalo nuevamente.'], 500);
}
