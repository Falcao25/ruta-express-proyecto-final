<?php
require_once __DIR__ . '/conexion.php';

function iniciarSesion() {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    ini_set('session.use_strict_mode', '1');
    session_name('RUTA_EXPRESS_SESION');
    session_set_cookie_params([
        'lifetime' => 0, 'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true, 'samesite' => 'Strict'
    ]);
    session_start();
    if (!isset($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

function usuarioSesion($conexion) {
    iniciarSesion();
    if (empty($_SESSION['usuarioID'])) return null;
    if (time() - ($_SESSION['ultimaActividad'] ?? 0) > 1800) {
        unset($_SESSION['usuarioID'], $_SESSION['ultimaActividad']);
        return null;
    }
    $usuario = consultar($conexion, 'SELECT usuarioID, username, rol FROM Usuarios WHERE usuarioID = ?',
        [$_SESSION['usuarioID']])->fetch();
    if (!$usuario || $usuario['rol'] !== 'Administrador') {
        unset($_SESSION['usuarioID']);
        return null;
    }
    // Solo las peticiones de la persona renuevan el tiempo; el polling no lo prolonga.
    if (($_SERVER['HTTP_X_ACTIVIDAD_USUARIO'] ?? '') === '1') $_SESSION['ultimaActividad'] = time();
    return ['id' => (string) $usuario['usuarioID'], 'username' => $usuario['username'], 'rol' => $usuario['rol']];
}

function comprobarCsrf() {
    iniciarSesion();
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($token) || !hash_equals($_SESSION['csrf'], $token)) {
        responder(['error' => 'La solicitud no es válida. Recarga la página e inténtalo otra vez.'], 403);
    }
}

function exigirAdministrador($conexion, $comprobarToken = false) {
    $usuario = usuarioSesion($conexion);
    if (!$usuario) responder(['error' => 'Inicia sesión para acceder a administración.'], 401);
    if ($comprobarToken) comprobarCsrf();
    return $usuario;
}

function protegerPaginaAdmin() {
    header('Cache-Control: no-store');
    try {
        $usuario = usuarioSesion(conectar());
    } catch (PDOException $error) {
        $usuario = null;
    }
    if (!$usuario) {
        header('Location: login.php');
        exit;
    }
}
