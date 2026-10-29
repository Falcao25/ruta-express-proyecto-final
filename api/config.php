<?php
// Valores habituales de XAMPP. config.local.php permite usar otros sin subir contraseñas.
$config = [
    'host' => '127.0.0.1',
    'puerto' => 3306,
    'base' => 'bd_ruta_express',
    'usuario' => 'root',
    'clave' => ''
];

if (file_exists(__DIR__ . '/config.local.php')) {
    $config = array_merge($config, require __DIR__ . '/config.local.php');
}

// Las pruebas pueden usar otra base sin modificar la configuración del proyecto.
foreach (['RUTA_DB_HOST' => 'host', 'RUTA_DB_PORT' => 'puerto', 'RUTA_DB_NAME' => 'base',
          'RUTA_DB_USER' => 'usuario', 'RUTA_DB_PASSWORD' => 'clave'] as $variable => $campo) {
    if (getenv($variable) !== false) $config[$campo] = getenv($variable);
}

return $config;
