<?php
require_once dirname(__DIR__) . '/api/autenticacion.php';
header('Cache-Control: no-store');
try {
    if (usuarioSesion(conectar())) {
        header('Location: index.php');
        exit;
    }
} catch (PDOException $error) {
    // El formulario puede mostrarse aunque MySQL todavía no esté iniciado.
}
?>
<!doctype html>
<html lang="es-PE">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Ingreso al panel administrativo de Ruta Express.">
  <title>Iniciar sesión · Ruta Express</title>
  <link rel="icon" href="../assets/img/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../shared/css/reset.css">
  <link rel="stylesheet" href="../shared/css/tokens.css">
  <link rel="stylesheet" href="../shared/css/layout.css">
  <link rel="stylesheet" href="../shared/css/utilities.css">
  <link rel="stylesheet" href="../shared/css/components.css">
  <link rel="stylesheet" href="css/login.css">
  <script type="module" src="js/login.js"></script>
</head>
<body class="login-page">
  <main class="login-layout">
    <section class="login-story" aria-labelledby="story-title">
      <a href="../cliente/index.html" class="brand"><span class="brand__mark" aria-hidden="true">r↗</span><span>ruta<span class="brand__suffix">express</span>.</span></a>
      <div class="login-story__copy"><span class="eyebrow">Gestión de operaciones</span><h1 id="story-title">Cada buen viaje<br>empieza contigo.</h1><p>Organiza las reservas y acompaña a tus pasajeros hacia su próximo destino.</p></div>
      <span class="login-story__footer">Conectamos destinos. Acercamos personas.</span>
    </section>
    <section class="login-content" aria-labelledby="login-title">
      <div class="login-card">
        <a class="login-back" href="../cliente/index.html">← Volver a la web del cliente</a>
        <div class="stack gap-2"><span class="eyebrow login-kicker">Panel administrativo</span><h2 id="login-title">Bienvenido de nuevo</h2><p class="muted small">Ingresa con tu cuenta de administrador para continuar.</p></div>
        <div id="login-message" role="alert" hidden></div>
        <form id="login-form" class="stack" novalidate>
          <div class="field"><label for="username">Usuario</label><input id="username" name="username" autocomplete="username" required maxlength="50" placeholder="Tu nombre de usuario" aria-describedby="username-error"><span id="username-error" class="field-error"></span></div>
          <div class="field"><label for="password">Contraseña</label><div class="password-field"><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="200" placeholder="Tu contraseña" aria-describedby="password-error"><button id="toggle-password" class="btn btn--secondary" type="button" aria-controls="password" aria-pressed="false" aria-label="Mostrar contraseña">Mostrar</button></div><span id="password-error" class="field-error"></span></div>
          <button id="login-submit" class="btn btn--primary full-width" type="submit" disabled>Ingresar al panel <span aria-hidden="true">→</span></button>
        </form>
        <p class="login-note">Acceso exclusivo para administración. Si no tienes tus datos de ingreso, consulta al responsable del sistema.</p>
      </div>
      <span class="login-copyright">Ruta Express · Sistema de Gestión de Viajes Terrestres</span>
    </section>
  </main>
  <noscript><p class="alert alert--error">Activa JavaScript para iniciar sesión.</p></noscript>
</body>
</html>
