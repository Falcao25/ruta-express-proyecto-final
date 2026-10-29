<?php
// El servidor local necesita normalizar las rutas de carpetas.
// Así /admin carga desde /admin/ y conserva las rutas de su CSS y JavaScript.
$ruta = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$archivo = realpath(__DIR__ . '/' . ltrim(rawurldecode($ruta), '/'));
$raiz = realpath(__DIR__);

if ($archivo === false || ($archivo !== $raiz && strpos($archivo, $raiz . DIRECTORY_SEPARATOR) !== 0)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'No se encontró el recurso solicitado.';
    return true;
}

if (is_dir($archivo) && substr($ruta, -1) !== '/') {
    $consulta = isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== ''
        ? '?' . $_SERVER['QUERY_STRING'] : '';
    header('Location: ' . $ruta . '/' . $consulta, true, 302);
    return true;
}

// PHP se encarga de servir los archivos existentes y ejecutar los endpoints.
return false;
