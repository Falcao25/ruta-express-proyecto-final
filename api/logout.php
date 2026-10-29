<?php
require_once __DIR__ . '/autenticacion.php';
iniciarPeticion('POST', false);
comprobarCsrf();
$_SESSION = [];
$cookie = session_get_cookie_params();
setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $cookie['path'],
    'secure' => $cookie['secure'], 'httponly' => true, 'samesite' => 'Strict']);
session_destroy();
responder(['mensaje' => 'Sesión cerrada.']);
