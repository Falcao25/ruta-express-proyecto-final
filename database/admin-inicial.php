<?php
// Crea un acceso inicial sin reemplazar cuentas existentes ni usar una clave fija.
function prepararAdminInicial($conexion) {
    if (consultar($conexion, "SELECT usuarioID FROM Usuarios WHERE username = 'admin'")->fetch()) return null;
    $password = bin2hex(random_bytes(8));
    consultar($conexion, 'INSERT INTO Usuarios (username, password, rol) VALUES (?, ?, ?)',
        ['admin', password_hash($password, PASSWORD_DEFAULT), 'Administrador']);
    $directorio = getenv('LOCALAPPDATA');
    if (!$directorio) throw new Exception('No se encontró la carpeta local del usuario para guardar el acceso inicial.');
    $directorio .= '/RutaExpress';
    if (!is_dir($directorio) && !mkdir($directorio, 0700, true)) {
        throw new Exception('No se pudo crear la carpeta para el acceso inicial.');
    }
    // Está fuera de la carpeta web: nunca se entrega como un archivo público.
    $archivo = $directorio . '/acceso-inicial.txt';
    $texto = "Acceso administrativo de Ruta Express\r\nUsuario: admin\r\nContraseña: " . $password . "\r\n";
    if (file_put_contents($archivo, $texto, LOCK_EX) === false) {
        throw new Exception('No se pudo guardar el acceso inicial.');
    }
    return $archivo;
}
