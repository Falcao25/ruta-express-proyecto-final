<?php
require_once __DIR__ . '/autenticacion.php';
$conexion = iniciarPeticion('POST');
comprobarCsrf();
$datos = leerJson();
$username = is_string($datos['username'] ?? null) ? trim($datos['username']) : '';
$password = is_string($datos['password'] ?? null) ? $datos['password'] : '';
if ($username === '' || strlen($username) > 50 || $password === '' || strlen($password) > 200) {
    responder(['error' => 'Ingresa tu usuario y contraseña.'], 422);
}
if (time() < ($_SESSION['bloqueadoHasta'] ?? 0)) {
    responder(['error' => 'Demasiados intentos. Espera un minuto antes de volver a intentar.'], 429);
}
try {
    $usuario = consultar($conexion, 'SELECT usuarioID, username, password, rol FROM Usuarios WHERE username = ?', [$username])->fetch();
    // El hash alternativo permite verificar también cuando el usuario no existe.
    $hash = $usuario ? $usuario['password'] : '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
    $valida = password_verify($password, $hash);
    if (!$usuario || !$valida || $usuario['rol'] !== 'Administrador') {
        $_SESSION['intentos'] = ($_SESSION['intentos'] ?? 0) + 1;
        if ($_SESSION['intentos'] >= 5) {
            $_SESSION['bloqueadoHasta'] = time() + 60;
            $_SESSION['intentos'] = 0;
        }
        responder(['error' => 'Usuario o contraseña incorrectos.'], 401);
    }
    session_regenerate_id(true);
    $_SESSION['usuarioID'] = $usuario['usuarioID'];
    $_SESSION['ultimaActividad'] = time();
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    unset($_SESSION['intentos'], $_SESSION['bloqueadoHasta']);
    responder(['usuario' => ['id' => (string) $usuario['usuarioID'], 'username' => $usuario['username'], 'rol' => $usuario['rol']], 'csrf' => $_SESSION['csrf']]);
} catch (Exception $error) {
    errorServidor($conexion, $error);
}
